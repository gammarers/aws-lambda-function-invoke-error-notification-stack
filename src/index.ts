import * as crypto from 'crypto';
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export interface NotificationsProperty {
  readonly emails?: string[];
}
export interface LambdaFunctionInvokeErrorNotificationStackProps extends cdk.StackProps {
  readonly notifications: NotificationsProperty;
}

export class LambdaFunctionInvokeErrorNotificationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaFunctionInvokeErrorNotificationStackProps) {
    super(scope, id, props);

    const random = crypto.createHash('shake256', { outputLength: 4 })
      .update(cdk.Names.uniqueId(this))
      .digest('hex');

    // SNSトピックの作成
    const topic: sns.Topic = new sns.Topic(this, 'LambdaFunctionInvokeErrorNotificationTopic', {
      topicName: `lambda-funcs-invoke-error-notification-${random}-topic`,
      displayName: 'Lambda Functions Invoke Error Notification Topic',
    });

    // Subscribe an email endpoint to the topic
    for (const email of props.notifications.emails ?? []) {
      topic.addSubscription(new subscriptions.EmailSubscription(email));
    }

    // Prepare Message
    const prepareMessage: sfn.Pass = new sfn.Pass(this, 'PrepareMessage', {
      parameters: {
        Subject: sfn.JsonPath.format('😵 [Failur] AWS Lambda Function Invocation Failur Notification [{}][{}]',
          sfn.JsonPath.stringAt('$.account'),
          sfn.JsonPath.stringAt('$.region'),
        ),
        Message: sfn.JsonPath.format('Account : {}\nRegion : {}\nFunction : {}\nErrorMessage : {}\nTrace : \n{}',
          sfn.JsonPath.stringAt('$.account'),
          sfn.JsonPath.stringAt('$.region'),
          sfn.JsonPath.stringAt('$.detail.requestContext.functionArn'),
          sfn.JsonPath.stringAt('$.detail.responsePayload.errorMessage'),
          sfn.JsonPath.stringAt('$.Prepare.Concatenated.Trace'),
        ),
      },
      resultPath: '$.Prepare.Sns.Topic',
    });

    const init: sfn.Pass = new sfn.Pass(this, 'Init', {
      result: sfn.Result.fromString(''),
      resultPath: '$.Prepare.Concatenated.Trace',
    });

    const traceLinces: sfn.Pass = new sfn.Pass(this, 'TraceLinces', {
      parameters: {
        Lines: sfn.JsonPath.stringAt('$.detail.responsePayload.trace'),
      },
      resultPath: '$.TempTrace',
    });

    init.next(traceLinces);

    const getTraceLine = new sfn.Pass(this, 'GetTraceLine', {
      parameters: {
        Line: sfn.JsonPath.arrayGetItem(sfn.JsonPath.stringAt('$.TempTrace.Lines'), 0),
      },
      resultPath: '$.Temp.GetTrace',
    });

    const checkUntreatedTranceLinesExist: sfn.Choice = new sfn.Choice(this, 'CheckUntreatedTranceLinesExist')
      .when(sfn.Condition.isPresent('$.TempTrace.Lines[0]'), getTraceLine)
      .otherwise(prepareMessage);

    traceLinces.next(checkUntreatedTranceLinesExist);

    const concatenateValue: sfn.Pass = new sfn.Pass(this, 'Concatenate', {
      parameters: {
        Trace: sfn.JsonPath.format('{}{}\n', sfn.JsonPath.stringAt('$.Prepare.Concatenated.Trace'), sfn.JsonPath.stringAt('$.Temp.GetTrace.Line')),
      },
      resultPath: '$.Prepare.Concatenated',
    });

    getTraceLine.next(concatenateValue);

    const untreatedTranceLines: sfn.Pass = new sfn.Pass(this, 'UntreatedTranceLines', {
      parameters: {
        Lines: sfn.JsonPath.stringAt('$.TempTrace.Lines[1:]'),
      },
      resultPath: '$.TempTrace',
    });

    concatenateValue.next(untreatedTranceLines);

    untreatedTranceLines.next(checkUntreatedTranceLinesExist);

    const sendNotification: tasks.SnsPublish = new tasks.SnsPublish(this, 'SendNotification', {
      topic: topic,
      inputPath: '$.Prepare.Sns.Topic',
      subject: sfn.JsonPath.stringAt('$.Subject'),
      message: sfn.TaskInput.fromJsonPathAt('$.Message'),
      resultPath: '$.Result.Sns.Topic',
    });

    prepareMessage.next(sendNotification);

    // Step Functions State Machine
    const stateMachine: sfn.StateMachine = new sfn.StateMachine(this, 'StateMachine', {
      stateMachineName: `lambda-func-invoke-error-notification-${random}-state-machine`,
      timeout: cdk.Duration.minutes(5),
      definitionBody: sfn.DefinitionBody.fromChainable(init),
    });

    // EventBridge Rule
    new events.Rule(this, 'LambdaFunctionInvokeErrorCatchRule', {
      ruleName: `lambda-func-invoke-error-catch-${random}-rule`,
      eventPattern: {
        source: ['lambda'],
        detailType: ['Lambda Function Invocation Result - Failure'],
        detail: {
          responsePayload: {
            errorType: [
              'error',
            ],
          },
        },
      },
      targets: [
        new targets.SfnStateMachine(stateMachine, {
          role: new iam.Role(this, 'StartExecMachineRole', {
            roleName: `lambda-func-invoke-error-start-exec-machine-${random}-role`,
            description: 'lambda func invoke error start exec machine (send notification).',
            assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
            inlinePolicies: {
              'states-start-execution-policy': new iam.PolicyDocument({
                statements: [
                  new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                      'states:StartExecution',
                    ],
                    resources: ['*'],
                  }),
                ],
              }),
            },
          }),
        }),
      ],
    });
  }
}