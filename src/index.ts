import * as crypto from 'crypto';
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
//import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
//import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
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

    // EventBridgeルールの作成
    new events.Rule(this, 'LambdaFunctionInvokeErrorCatchRule', {
      ruleName: `lambda-func-invoke-error-catch-${random}-rule`,
      eventPattern: {
        source: ['aws.lambda'],
        detailType: ['AWS API Call via CloudTrail'],
        detail: {
          eventSource: ['lambda.amazonaws.com'],
          eventName: ['Invoke'],
          errorCode: [{ exists: true }],
        },
      },
      targets: [
        new targets.SnsTopic(topic),
      ],
    });
  }
}