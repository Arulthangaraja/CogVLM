#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { PipelineStack } = require('../lib/pipeline-stack');
const { SampleServiceAppPipelineStack } = require('../lib/pipeline-app-cdk-stack')
const { SampleServiceResourcePipelineStack } =require('../lib/pipeline-resource-cdk-stack')
const { EnvironmentType, TagName, EnvironmentId, AppOwner } = require('@unifo/cdk-commons');

const app = new cdk.App();

/******************** Account Details ****************************/

const unifoInc = { account: '829865996979', region: 'ap-south-1' };

/******************** CODEBUILD-DEV-ENV-VARIABLES ********************/
const devEnvVariables = {
  AWS_DEFAULT_REGION: { value: unifoInc.region },
  AWS_ACCOUNT_ID: { value: unifoInc.account },
  IMAGE_REPO_NAME: { value: 'unifo/iris-model-poc' },
  IMAGE_TAG_ENVIRONMENT: { value: 'v.poc.1.0.' },
}

/************************** DEV STACK PROPS ****************************/
const incProps = {
  env: unifoInc,
  environmentType: EnvironmentType.DEVELOPMENT,
  environmentId: EnvironmentId.SENTINEL_DEVELOPMENT,
  kmsKeyArn: 'arn:aws:kms:ap-south-1:704816378710:key/906511ad-7120-48d8-aad7-b41e8aad26dc',
  gitBranch: 'develop',
  codeStarConnectionArn: 'arn:aws:codestar-connections:ap-south-1:829865996979:connection/f589e6a3-bbd5-4044-9ebf-7f6f962f12a8',
  envVariable: devEnvVariables,
  ecsServiceName: '',
  ecsClusterName: 'CGateWebInfraDevStack-CGateWebWorkerCluster9FEF587B-IUm9HWCkUh8U',
  ecsClusterArn: 'arn:aws:ecs:ap-south-1:704816378710:cluster/CGateWebInfraDevStack-CGateWebWorkerCluster9FEF587B-IUm9HWCkUh8U',
  codeBuildLogGroupName: '',
  pipelineBucketArn: 'arn:aws:s3:::sentinel-pipeline-artifact-bucket-dev/*',
  pipelineSnsArn: 'arn:aws:sns:ap-south-1:704816378710:sentinel-pipline-notification',
  mainListenerArn:'',
  testListenerArn:'',
  blueTargetGroupArn: '',
  greenTargetGroupArn: '',
  buildspecFileName:'buildspec.yml',
  buildSpecAppStackFileName : 'buildspec-app-stack.yml',
  buildSpecAppStackDeployFileName: 'buildspec-app-stack-deploy.yml',
  codeBuildLogGroupName_appStack: 'SampleServiceAppStackPipelineDevLogGroup',
  codeBuildDeployLogGroupName_appStack: 'SampleServiceAppStackDeployPipelineDevLogGroup',
  buildSpecResourceStackFileName : 'buildspec-resource-stack.yml',
  buildSpecResourceStackDeployFileName: 'buildspec-resource-stack-deploy.yml',
  codeBuildLogGroupName_resourceStack: 'SampleServiceResourceStackPipelineDevLogGroup',
  codeBuildDeployLogGroupName_resourceStack: 'SampleServiceResourceStackDeployPipelineDevLogGroup'
}

// Stacks

const devPipeline = new PipelineStack(app, 'CogvlmTrainingPipelineStack', incProps);
// cdk.Tags.of(devPipeline).add(TagName.APP_NAME, 'Pipeline');
// cdk.Tags.of(devPipeline).add(TagName.APP_OWNER, AppOwner.OWNER);
// cdk.Tags.of(devPipeline).add(TagName.ENVIRONMENT_TYPE, devProps.environmentType);
// cdk.Tags.of(devPipeline).add(TagName.ENVIRONMENT_ID, devProps.environmentId);

// const devAppStackPipeline = new SampleServiceAppPipelineStack(app, 'DevAppStackPipeline', devProps);
// cdk.Tags.of(devAppStackPipeline).add(TagName.APP_NAME, 'DevAppStackPipeline');
// cdk.Tags.of(devAppStackPipeline).add(TagName.APP_OWNER, AppOwner.OWNER);
// cdk.Tags.of(devAppStackPipeline).add(TagName.ENVIRONMENT_TYPE, devProps.environmentType);
// cdk.Tags.of(devAppStackPipeline).add(TagName.ENVIRONMENT_ID, devProps.environmentId);

// const devResourceStackPipeline = new SampleServiceResourcePipelineStack(app, 'DevResourceStackPipeline', devProps);
// cdk.Tags.of(devResourceStackPipeline).add(TagName.APP_NAME, 'DevResourceStackPipeline');
// cdk.Tags.of(devResourceStackPipeline).add(TagName.APP_OWNER, AppOwner.OWNER);
// cdk.Tags.of(devResourceStackPipeline).add(TagName.ENVIRONMENT_TYPE, devProps.environmentType);
// cdk.Tags.of(devResourceStackPipeline).add(TagName.ENVIRONMENT_ID, devProps.environmentId);