import { awscdk, javascript } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'yicr',
  authorAddress: 'yicr@users.noreply.github.com',
  authorOrganization: true,
  cdkVersion: '2.100.0',
  defaultReleaseBranch: 'main',
  typescriptVersion: '5.3.x',
  jsiiVersion: '5.3.x',
  name: '@gammarers/aws-lambda-function-invoke-error-notification-stack',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/gammarers/aws-lambda-function-invoke-error-notification-stack.git',
  releaseToNpm: false, // temporary
  npmAccess: javascript.NpmAccess.PUBLIC,
  depsUpgrade: true,
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
      schedule: javascript.UpgradeDependenciesSchedule.expressions(['0 18 * * 5']), // every sunday (JST/MON:03:00)
    },
  },
  minNodeVersion: '18.0.0',
  workflowNodeVersion: '22.2.0',
});
project.synth();