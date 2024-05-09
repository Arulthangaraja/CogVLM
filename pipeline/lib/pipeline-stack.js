const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3')
const iam = require('aws-cdk-lib/aws-iam')
const codepipeline = require('aws-cdk-lib/aws-codepipeline')
const codebuild = require('aws-cdk-lib/aws-codebuild')
const codepipeline_actions = require('aws-cdk-lib/aws-codepipeline-actions')
const logs = require('aws-cdk-lib/aws-logs')
const ecs = require('aws-cdk-lib/aws-ecs')
const sns = require('aws-cdk-lib/aws-sns')
const codestarnotifications = require('aws-cdk-lib/aws-codestarnotifications')
const codedeploy = require('aws-cdk-lib/aws-codedeploy')
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2')

class PipelineStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    const {
      kmsKeyArn,
      gitBranch,
      codeStarConnectionArn,
      envVariable,
      ecsServiceName,
      ecsClusterName,
      ecsClusterArn,
      codeBuildLogGroupName,
      pipelineBucketArn,
      pipelineSnsArn,
      mainListenerArn,
      testListenerArn,
      environmentType,
      blueTargetGroupArn,
      greenTargetGroupArn,
      buildspecFileName
    } = props

    const sentinelPipelineBucket = s3.Bucket.fromBucketArn(this, 'sentinelPipelineBucket', `${pipelineBucketArn}`)

    // Codepipeline servie role
    const serviceCodePipelineRole = new iam.Role(this, 'ServiceCodePipelineRole', {
      roleName: 'ServiceCodePipelineRole',
      description: 'Policy used in trust relationship with CodePipeline',
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com')
    })

    // Policy needed for event bridge trigger
    serviceCodePipelineRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchEventsFullAccess"))

    //  Codebuild servie role
    const serviceCodebuildRole = new iam.Role(this, 'ServiceCodebuildRole', {
      roleName: 'ServiceCodebuildRole',
      description: 'Policy used in trust relationship with CodeBuild',
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
    });

    // Policy needed for building docker images and pushing the image to ECR
    serviceCodebuildRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryPowerUser"))

    // KMS inline policy for codebuild for decrypting ENV
    serviceCodebuildRole.attachInlinePolicy(
      new iam.Policy(this, 'codebuild-kms-decrypt', {
        policyName: 'service-codebuild-kms-decrypt',
        description: 'Policy for codebuild to give kms decrypt access',
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['kms:Decrypt'],
            resources: [kmsKeyArn]
          })
        ]
      })
    )

    // Source Artifact
    const sourceArtifact = new codepipeline.Artifact('SourceArtifact');

    //Source Stage
    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'Github',
      owner: 'unifo',
      repo: 'REPO_NAME',
      branch: gitBranch,
      output: sourceArtifact,
      connectionArn: codeStarConnectionArn,
      variablesNamespace: 'SourceVariables',
      triggerOnPush: false,
    })

    //Build Artifact
    const buildArtifact = new codepipeline.Artifact('BuildArtifact');

    // Build Project
    const serviceBuildProject = new codebuild.PipelineProject(this, 'ServiceBuildProject', {
      projectName: 'service-docker-build',
      buildSpec: codebuild.BuildSpec.fromSourceFilename(buildspecFileName),
      timeout: Duration.minutes(60),
      environment: {
        computeType: codebuild.ComputeType.SMALL,
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true
      },
      environmentVariables: envVariable,
      logging: {
        cloudWatch: {
          logGroup: new logs.LogGroup(this, 'ServicePipelineLogGroup', {
            logGroupName: codeBuildLogGroupName,
            retention: logs.RetentionDays.THREE_DAYS,
            removalPolicy:  RemovalPolicy.DESTROY
          })
        }
      },
      role: serviceCodebuildRole
    })

    // Build Stage
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Docker-Build',
      project: serviceBuildProject,
      input: sourceArtifact,
      outputs: [buildArtifact]
    })

    // ECS Service
    const service = ecs.Ec2Service.fromEc2ServiceAttributes(this, 'EcsService', {
      serviceName: ecsServiceName,
      cluster: {
        clusterArn: ecsClusterArn,
        clusterName: ecsClusterName
      }
    })

    // Deploy Stage
    const deployAction = new codepipeline_actions.EcsDeployAction({
      actionName: 'Deploy',
      input: buildArtifact,
      deploymentTimeout: Duration.minutes(60),
      service
    })

    let codeDeployAction
    if(environmentType === 'Production'){ // Code Deploy set up for production
    const blueTargetGroup = elbv2.ApplicationTargetGroup.fromTargetGroupAttributes(this, 'blueTargetGroup', {
      targetGroupArn: blueTargetGroupArn
    })
    const greenTargetGroup = elbv2.ApplicationTargetGroup.fromTargetGroupAttributes(this, 'greenTargetGroup', {
      targetGroupArn: greenTargetGroupArn
    })

    const listener = elbv2.ApplicationListener.fromApplicationListenerAttributes(this, 'InternalAlbListener', {
      listenerArn: mainListenerArn
    })
    const testListener = elbv2.ApplicationListener.fromApplicationListenerAttributes(this, 'InternalAlbTestListener', {
      listenerArn: testListenerArn
    })

    const deploymentApplication = new codedeploy.EcsApplication(this, 'Service', {
      applicationName: 'Service',
    })

    const serviceCodeDeployRole = new iam.Role(this, 'ServiceCodeDeployRole', {
      roleName: 'ServiceCodeDeployRole',
      description: 'Policy used in trust relationship with CodeDeploy',
      assumedBy: new iam.ServicePrincipal('codedeploy.amazonaws.com')
    });

    serviceCodeDeployRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCodeDeployRoleForECS"))

    const deploymentGroup = new codedeploy.EcsDeploymentGroup(this, 'ServiceDeploymentGroup', {
      application: deploymentApplication,
      role: serviceCodeDeployRole,
      deploymentGroupName: 'ServiceDeploymentGroup',
      service,
      blueGreenDeploymentConfig: {
        blueTargetGroup,
        greenTargetGroup,
        listener,
        terminationWaitTime: Duration.days(1),
        testListener
      },
      deploymentConfig: codedeploy.EcsDeploymentConfig.ALL_AT_ONCE,
    })

    codeDeployAction = new codepipeline_actions.CodeDeployEcsDeployAction({
      actionName: 'Deploy',
      deploymentGroup: deploymentGroup,
      appSpecTemplateInput: buildArtifact,
      containerImageInputs: [{
        input: buildArtifact,
        taskDefinitionPlaceholder: 'IMAGE1_NAME'
      }],
      taskDefinitionTemplateInput: buildArtifact,
    })

    }

    // CodePipeline
    const servicePipeline = new codepipeline.Pipeline(this, 'ServicePipeline', {
      pipelineName: 'REPO_NAME',
      crossAccountKeys: false,
      role: serviceCodePipelineRole,
      artifactBucket: sentinelPipelineBucket
    })

    /*********************** Notification Setup**************************************/
    const topic = sns.Topic.fromTopicArn(this, 'pipelineSnsTopic', `${pipelineSnsArn}`)

    // Notification Rule
    new codestarnotifications.NotificationRule(this, 'ServiceNotificationRule', {
      source: servicePipeline,
      events: [
        'codepipeline-pipeline-action-execution-failed',
        'codepipeline-pipeline-stage-execution-failed',
        'codepipeline-pipeline-pipeline-execution-failed'
      ],
      notificationRuleName: 'service-pipeline-notification-rule',
      enabled: true,
      detailType: codestarnotifications.DetailType.FULL,
      targets: [topic]
    });

    /******************************************************************************/

    /**********************Adding diffrent stage to pipeline************************/

    //Source Stage
    servicePipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction]
    })

    // Build Stage
    servicePipeline.addStage({
      stageName: 'Docker-Build',
      actions: [buildAction]
    })

    // Deploy Stage ( For Production ECS Blue/Green for other environments rolling update )
    if (environmentType === 'Production') {
      servicePipeline.addStage({
        stageName: 'Deploy',
        actions: [codeDeployAction]
      })
    }
    else {
      servicePipeline.addStage({
        stageName: 'Deploy',
        actions: [deployAction]
      })
    }

    /******************************************************************************/

    
  }
}

module.exports = { PipelineStack }
