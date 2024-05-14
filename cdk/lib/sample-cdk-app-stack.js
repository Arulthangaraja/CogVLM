const { Stack, Duration, CfnOutput, RemovalPolicy } = require('aws-cdk-lib');
const logs = require('aws-cdk-lib/aws-logs')
const ec2 = require('aws-cdk-lib/aws-ec2')
const ecs = require('aws-cdk-lib/aws-ecs')
const ecr = require('aws-cdk-lib/aws-ecr')
const servicediscovery = require('aws-cdk-lib/aws-servicediscovery')
const iam = require('aws-cdk-lib/aws-iam')
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2')
const apiAlpha = require('@aws-cdk/aws-apigatewayv2-alpha');
const apiGwInt = require('@aws-cdk/aws-apigatewayv2-integrations-alpha')
const cloudwatch = require('aws-cdk-lib/aws-cloudwatch')
const cw_actions = require('aws-cdk-lib/aws-cloudwatch-actions')
const sns = require('aws-cdk-lib/aws-sns')
class SampleApiAppStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    const {
      sentinelVpcId,
      sentinelEcsClusterName,
      sampleApiEcrRepoArn,
      ecsDesiredTaskCount = 2,
      containerMemHardLimitMib,
      containerMemSoftLimitMib,
      containerCpu,
      containerLogStreamPrefix,
      containerLogsRetention = logs.RetentionDays.ONE_WEEK,
      containerPort,
      discoveryNsServiceName,
      vpcLinkId,
      sentinelHttpApiId,
      sentinelHttpApiCognitoAuthorizerId,
      imageVersion,
      logRetentionDuration,
      environmentId,
      environmentType,
      loadBalancerArn,
      internalAlbListenerArn,
      internalAlbTestListenerArn,
      metricsNotificationTopicArn,
      priority
    } = props;

    const sentinelVpc = ec2.Vpc.fromLookup(this, 'SentinelVpc', {
      vpcId: sentinelVpcId
    });

    const sentinelEcsCluster = ecs.Cluster.fromClusterAttributes(this, 'SentinelEcsCluster', {
      clusterName: sentinelEcsClusterName,
      vpc: sentinelVpc,
    });

    const sampleApiRepo = ecr.Repository.fromRepositoryArn(this, 'SampleApiRepo', sampleApiEcrRepoArn);

    const sampleApiTaskDefinition = new ecs.Ec2TaskDefinition(this, 'SampleApiTaskDefinition', {
      networkMode: ecs.NetworkMode.BRIDGE,
    });

    const sampleApiAppLogGroup = new logs.LogGroup(this, 'SampleApiAppLogGroup', {
      logGroupName: `SampleApiAppLogGroup-${environmentId}`,
      retention: logRetentionDuration,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const sampleApiContainer = sampleApiTaskDefinition.addContainer("SampleApiContainer", {
      image: ecs.ContainerImage.fromEcrRepository(sampleApiRepo, imageVersion),
      memoryLimitMiB: containerMemSoftLimitMib,
      memoryReservationMiB: containerMemHardLimitMib,
      cpu: containerCpu,
      logging: ecs.LogDrivers.awsLogs({
        logGroup: sampleApiAppLogGroup,
        streamPrefix: containerLogStreamPrefix,
      })
    });

    sampleApiContainer.addPortMappings({
      containerPort
    });

    const sampleApiNamespace = new servicediscovery.PrivateDnsNamespace(this, 'SampleApiNamespace', {
      name: discoveryNsServiceName,
      vpc: sentinelVpc,
    });

    let sampleApiService
    if (environmentType === 'Production') {

      sampleApiService = new ecs.Ec2Service(this, 'SampleApiService', {
        cluster: sentinelEcsCluster,
        taskDefinition: sampleApiTaskDefinition,
        assignPublicIp: false,
        cloudMapOptions: {
          cloudMapNamespace: sampleApiNamespace,
          dnsRecordType: servicediscovery.DnsRecordType.SRV,
          dnsTtl: Duration.days(30),
        },
        desiredCount: ecsDesiredTaskCount,
        deploymentController: {
          type: ecs.DeploymentControllerType.CODE_DEPLOY
        }
      });

      const memoryUtilized = sampleApiService.metricMemoryUtilization({
        period: Duration.seconds(30)
      })

      const cpuUtilized = sampleApiService.metricCpuUtilization({
        period: Duration.seconds(30)
      })

      const memoryUtilizationAlarm = new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
        evaluationPeriods: 1,
        metric: memoryUtilized,
        threshold: 60,
        alarmName: 'sample-service-memory-metrics',
        alarmDescription: 'Sample Service Memory Utilization Notification'
      })

      const cpuUtilizationAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
        evaluationPeriods: 1,
        metric: cpuUtilized,
        threshold: 60,
        alarmName: 'sample-service-cpu-metrics',
        alarmDescription: 'Sample Service CPU Utilization Notification'
      })
      const notificationTopic = sns.Topic.fromTopicArn(this, 'NotificationTopic', `${metricsNotificationTopicArn}`)

      memoryUtilizationAlarm.addAlarmAction(new cw_actions.SnsAction(notificationTopic))
      cpuUtilizationAlarm.addAlarmAction(new cw_actions.SnsAction(notificationTopic))

    }
    else {

      sampleApiService = new ecs.Ec2Service(this, 'SampleApiService', {
        cluster: sentinelEcsCluster,
        taskDefinition: sampleApiTaskDefinition,
        assignPublicIp: false,
        cloudMapOptions: {
          cloudMapNamespace: sampleApiNamespace,
          dnsRecordType: servicediscovery.DnsRecordType.SRV,
          dnsTtl: Duration.days(30),
        },
        desiredCount: ecsDesiredTaskCount,
      });

    }

    /**************** Internal Load Balancer Primary Target Group and Listener  ***************************/
    const sampleServiceTargetGroup = new elbv2.ApplicationTargetGroup(this, 'SampleServiceTargetGroup', {
      targetGroupName: 'SampleServiceTargetGroup',
      vpc: sentinelVpc,
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        path: "/api/service_name/v1/health"
      },
      targets: [sampleApiService]
    });

    new CfnOutput(this, 'SampleServiceBlueTargetGroupArn', {
      value: sampleServiceTargetGroup.targetGroupArn,
      description: 'The Arn of SampleServiceBlueTargetGroupArn',
      exportName: 'SampleServiceBlueTargetGroupArn',
    });

    const sentinelInternalAlbListener = elbv2.ApplicationListener.fromLookup(this, 'SentinelInternalAlbListener', {
      listenerArn: internalAlbListenerArn,
      loadBalancerArn
    });

    sentinelInternalAlbListener.addTargetGroups('forwardToSampleServiceTarget', {
      targetGroups: [sampleServiceTargetGroup],
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/api/service_name/*'])
      ],
      priority: priority
    })

    if (environmentType === 'Production') { // This is for blue green deployment in production using CodeDeploy
      const sampleServiceGreenTargetGroup = new elbv2.ApplicationTargetGroup(this, 'SampleServiceGreenTargetGroup', {
        targetGroupName: 'SampleServiceGreenTargetGroup',
        vpc: sentinelVpc,
        protocol: elbv2.ApplicationProtocol.HTTP,
        healthCheck: {
          path: "/api/service_name/v1/health"
        },
        targets: [sampleApiService]
      });

      new CfnOutput(this, 'SampleServiceGreenTargetGroupArn', {
        value: sampleServiceGreenTargetGroup.targetGroupArn,
        description: 'The Arn of SampleServiceGreenTargetGroupArn',
        exportName: 'SampleServiceGreenTargetGroupArn',
      });

      const sentinelInternalAlbTestListener = elbv2.ApplicationListener.fromLookup(this, 'SentinelInternalAlbTestListener', {
        listenerArn: internalAlbTestListenerArn,
        loadBalancerArn
      });

      sentinelInternalAlbTestListener.addTargetGroups('forwardToSampleServiceGreenTarget', {
        targetGroups: [sampleServiceGreenTargetGroup],
        conditions: [
          elbv2.ListenerCondition.pathPatterns(['/api/service_name/*'])
        ],
        priority: priority
      })
    }

    /*********************************************************************************/


    const sentinelVpcLink = apiAlpha.VpcLink.fromVpcLinkAttributes(this, 'SentinelVpcLink', {
      vpc: sentinelVpc,
      vpcLinkId
    });

    const sentinelHttpApi = apiAlpha.HttpApi.fromHttpApiAttributes(this, 'SentinelHttpApi', {
      httpApiId: sentinelHttpApiId,
    });

    const sentinelCognitoHttpAuthorizer = apiAlpha.HttpAuthorizer.fromHttpAuthorizerAttributes(this, 'SentinelCognitoHttpAuthorizer', {
      authorizerId: sentinelHttpApiCognitoAuthorizerId,
      authorizerType: apiAlpha.HttpAuthorizerType.JWT
  });

    const sampleApiBackendIntegration = new apiGwInt.HttpAlbIntegration('SampleApiBackendIntegration', sentinelInternalAlbListener, {
      vpcLink: sentinelVpcLink
    })

    const sampleApiRoute = new apiAlpha.HttpRoute(this, 'SampleApiRoute', {
      httpApi: sentinelHttpApi,
      routeKey: apiAlpha.HttpRouteKey.with('/sample/sample-route', apiAlpha.HttpMethod.POST),
      integration: sampleApiBackendIntegration,
      authorizer: sentinelCognitoHttpAuthorizer
    });

    new CfnOutput(this, 'SampleApiRouteId', {
      value: sampleApiRoute.routeId,
      description: 'The Route Id',
      exportName: 'SampleApiRouteId',
    });


  }
}

module.exports = { SampleApiAppStack }
