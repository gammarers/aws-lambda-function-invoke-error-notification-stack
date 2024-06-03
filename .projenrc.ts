import { awscdk } from 'projen';
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
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
  releaseToNpm: false, // temporary
  depsUpgrade: false, // temporary
});
project.synth();