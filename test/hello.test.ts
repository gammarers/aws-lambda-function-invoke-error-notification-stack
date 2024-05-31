import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { LambdaFunctionInvokeErrorNotificationStack } from '../src';

test('hello', () => {
  const app = new App();

  const stack = new LambdaFunctionInvokeErrorNotificationStack(app, 'LambdaFunctionInvokeErrorNotificationStack', {
    notifications: {
      emails: [
        'foo@example.com',
      ],
    },
  });

  const template = Template.fromStack(stack);

  expect(template.toJSON()).toMatchSnapshot();
});