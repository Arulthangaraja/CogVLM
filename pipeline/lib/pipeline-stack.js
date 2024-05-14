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
    const cogvlmTrainingCodePipelineRole = new iam.Role(this, 'CogvlmTrainingCodePipelineRole', {
      roleName: 'CogvlmTrainingCodePipelineRole',
      description: 'Policy used in trust relationship with CodePipeline',
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com')
    })

    // Policy needed for event bridge trigger
    cogvlmTrainingCodePipelineRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchEventsFullAccess"))

    //  Codebuild servie role
    const cogvlmTrainingCodebuildRole = new iam.Role(this, 'CogvlmTrainingCodebuildRole', {
      roleName: 'CogvlmTrainingCodebuildRole',
      description: 'Policy used in trust relationship with CodeBuild',
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
    });

    // Policy needed for building docker images and pushing the image to ECR
    cogvlmTrainingCodebuildRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryPowerUser"))

    // Source Artifact
    const sourceArtifact = new codepipeline.Artifact('SourceArtifact');

    //Source Stage
    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'Github',
      owner: 'unifo',
      repo: 'iris-model-poc',
      branch: 'main',
      output: sourceArtifact,
      connectionArn: codeStarConnectionArn,
      variablesNamespace: 'SourceVariables',
      triggerOnPush: false,
    })

    //Build Artifact
    const buildArtifact = new codepipeline.Artifact('BuildArtifact');

    // Build Project
    const cogvlmTrainingBuildProject = new codebuild.PipelineProject(this, 'CogvlmTrainingBuildProject', {
      projectName: 'cogvlm-training-docker-build',
      buildSpec: codebuild.BuildSpec.fromSourceFilename(buildspecFileName),
      timeout: Duration.minutes(60),
      environment: {
        computeType: codebuild.ComputeType.X_LARGE,
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true
      },
      environmentVariables: envVariable,
      logging: {
        cloudWatch: {
          logGroup: new logs.LogGroup(this, 'CogvlmTrainingPipelineLogGroup', {
            logGroupName: codeBuildLogGroupName,
            retention: logs.RetentionDays.THREE_DAYS,
            removalPolicy:  RemovalPolicy.DESTROY
          })
        }
      },
      role: cogvlmTrainingCodebuildRole
    })

    // Build Stage
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Docker-Build',
      project: cogvlmTrainingBuildProject,
      input: sourceArtifact,
      outputs: [buildArtifact]
    })

    // CodePipeline
    const cogvlmTrainingPipeline = new codepipeline.Pipeline(this, 'CogvlmTrainingPipeline', {
      pipelineName: 'cogvlm-training-model',
      crossAccountKeys: false,
      role: cogvlmTrainingCodePipelineRole,
      artifactBucket: sentinelPipelineBucket
    })

    /*********************** Notification Setup**************************************/
    const topic = sns.Topic.fromTopicArn(this, 'pipelineSnsTopic', `${pipelineSnsArn}`)

    // Notification Rule
    new codestarnotifications.NotificationRule(this, 'CogvlmTrainingNotificationRule', {
      source: cogvlmTrainingPipeline,
      events: [
        'codepipeline-pipeline-action-execution-failed',
        'codepipeline-pipeline-stage-execution-failed',
        'codepipeline-pipeline-pipeline-execution-failed'
      ],
      notificationRuleName: 'cogvlm-training-pipeline-notification-rule',
      enabled: true,
      detailType: codestarnotifications.DetailType.FULL,
      targets: [topic]
    });

    /******************************************************************************/

    /**********************Adding diffrent stage to pipeline************************/

    //Source Stage
    cogvlmTrainingPipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction]
    })

    // Build Stage
    cogvlmTrainingPipeline.addStage({
      stageName: 'Docker-Build',
      actions: [buildAction]
    })


    /******************************************************************************/

    
  }
}

module.exports = { PipelineStack }
