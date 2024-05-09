#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { PipelineStack } = require('../lib/pipeline-stack');
const { SampleServiceAppPipelineStack } = require('../lib/pipeline-app-cdk-stack')
const { SampleServiceResourcePipelineStack } =require('../lib/pipeline-resource-cdk-stack')
const { EnvironmentType, TagName, EnvironmentId, AppOwner } = require('@unifo/cdk-commons');

const app = new cdk.App();

/******************** Account Details ****************************/

const unifoDev = { account: '704816378710', region: 'ap-south-1' };

/******************** CODEBUILD-DEV-ENV-VARIABLES ********************/
const devEnvVariables = {
  AWS_DEFAULT_REGION: { value: 'ap-south-1' },
  AWS_ACCOUNT_ID: { value: '704816378710' },
  IMAGE_REPO_NAME: { value: 'unifo/' },
  KMS_KEY_ID: { value: '906511ad-7120-48d8-aad7-b41e8aad26dc' },
  IMAGE_TAG_ENVIRONMENT: { value: 'v0.1.0-dev.' },
  ENC_FILE_PATH: { value: '/.enc.env.development' }
}

/************************** DEV STACK PROPS ****************************/
const devProps = {
  env:unifoDev,
  environmentType: EnvironmentType.DEVELOPMENT,
  environmentId: EnvironmentId.SENTINEL_DEVELOPMENT,
  kmsKeyArn: 'arn:aws:kms:ap-south-1:704816378710:key/906511ad-7120-48d8-aad7-b41e8aad26dc',
  gitBranch: 'develop',
  codeStarConnectionArn: 'arn:aws:codestar-connections:eu-west-1:704816378710:connection/e1b4dca8-649c-4f03-b743-a0206162c73c',
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

const devPipeline = new PipelineStack(app, 'PipelineStack', devProps);
cdk.Tags.of(devPipeline).add(TagName.APP_NAME, 'Pipeline');
cdk.Tags.of(devPipeline).add(TagName.APP_OWNER, AppOwner.OWNER);
cdk.Tags.of(devPipeline).add(TagName.ENVIRONMENT_TYPE, devProps.environmentType);
cdk.Tags.of(devPipeline).add(TagName.ENVIRONMENT_ID, devProps.environmentId);

const devAppStackPipeline = new SampleServiceAppPipelineStack(app, 'DevAppStackPipeline', devProps);
cdk.Tags.of(devAppStackPipeline).add(TagName.APP_NAME, 'DevAppStackPipeline');
cdk.Tags.of(devAppStackPipeline).add(TagName.APP_OWNER, AppOwner.OWNER);
cdk.Tags.of(devAppStackPipeline).add(TagName.ENVIRONMENT_TYPE, devProps.environmentType);
cdk.Tags.of(devAppStackPipeline).add(TagName.ENVIRONMENT_ID, devProps.environmentId);

const devResourceStackPipeline = new SampleServiceResourcePipelineStack(app, 'DevResourceStackPipeline', devProps);
cdk.Tags.of(devResourceStackPipeline).add(TagName.APP_NAME, 'DevResourceStackPipeline');
cdk.Tags.of(devResourceStackPipeline).add(TagName.APP_OWNER, AppOwner.OWNER);
cdk.Tags.of(devResourceStackPipeline).add(TagName.ENVIRONMENT_TYPE, devProps.environmentType);
cdk.Tags.of(devResourceStackPipeline).add(TagName.ENVIRONMENT_ID, devProps.environmentId);