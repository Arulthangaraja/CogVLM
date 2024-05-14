#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const logs = require('aws-cdk-lib/aws-logs')
const { SampleApiAppStack } = require('../lib/sample-cdk-app-stack');
const { SampleResourcesStack } = require('../lib/sample-resources-stack')
const { EnvironmentType, TagName, EnvironmentId, AppOwner } = require('@unifo/cdk-commons');

const app = new cdk.App();
const imageVersion = app.node.tryGetContext('imgVer');

/******************** ACCOUNT DETAILS **************************/
const unifoDev = { account: '704816378710', region: 'ap-south-1' };

/******************** APP STACK PROPS **************************/
const devProps = {
  env: unifoDev,
  environmentType: EnvironmentType.DEVELOPMENT,
  environmentId: EnvironmentId.SENTINEL_DEVELOPMENT,
  sentinelVpcId: 'vpc-0d9178cc1a715fd4a',
  sentinelEcsClusterName: 'CGateWebInfraDevStack-CGateWebWorkerCluster9FEF587B-IUm9HWCkUh8U',
  sampleApiEcrRepoArn: 'arn:aws:ecr:ap-south-1:704816378710:repository/unifo/sample-api',
  ecsDesiredTaskCount: 2,
  containerMemHardLimitMib: 256,
  containerMemSoftLimitMib: 256,
  containerCpu: 512,
  containerLogStreamPrefix: 'SampleApi',
  containerPort: 8080,
  discoveryNsServiceName: 'sample-api.cgate.app',
  vpcLinkId: '95dyo4',
  sentinelHttpApiId: 'sx83ntydqj',
  sentinelHttpApiCognitoAuthorizerId: '4wf6vu',
  imageVersion,
  logRetentionDuration: logs.RetentionDays.ONE_DAY,
  loadBalancerArn: 'arn:aws:elasticloadbalancing:ap-south-1:704816378710:loadbalancer/app/SentinelAppInternalLb/234f5d5bd85e57ac',
  internalAlbListenerArn: 'arn:aws:elasticloadbalancing:ap-south-1:704816378710:listener/app/SentinelAppInternalLb/234f5d5bd85e57ac/292ee8ccf0465be4',
  internalAlbTestListenerArn: '',
  metricsNotificationTopicArn: '',
  priority: '' // Give proper number
};

/********************* RESOURCE STACK PROPS **************************/
const devResourcesProps = {
  env: unifoDev,
  environmentType: EnvironmentType.DEVELOPMENT,
  environmentId: EnvironmentId.SENTINEL_DEVELOPMENT,
};

/*********************** APP STACK ***************************************/

const sampleApiAppDevStack = new SampleApiAppStack(app, 'SampleApiAppStack', devProps, imageVersion);
cdk.Tags.of(sampleApiAppDevStack).add(TagName.APP_NAME, 'SampleApiApp');
cdk.Tags.of(sampleApiAppDevStack).add(TagName.APP_OWNER, AppOwner.OWNER);
cdk.Tags.of(sampleApiAppDevStack).add(TagName.ENVIRONMENT_TYPE, devProps.environmentType);
cdk.Tags.of(sampleApiAppDevStack).add(TagName.ENVIRONMENT_ID, devProps.environmentId);

/*********************** RESOURCE STACK ***************************************/

const sampleResourcesDevStack = new SampleResourcesStack(app, 'SampleResourcesDevStack', devResourcesProps);
cdk.Tags.of(sampleResourcesDevStack).add(TagName.APP_NAME, 'SampleResourcesStack');
cdk.Tags.of(sampleResourcesDevStack).add(TagName.APP_OWNER, AppOwner.OWNER);
cdk.Tags.of(sampleResourcesDevStack).add(TagName.ENVIRONMENT_TYPE, devResourcesProps.environmentType);
cdk.Tags.of(sampleResourcesDevStack).add(TagName.ENVIRONMENT_ID, devResourcesProps.environmentId);
