const { Stack, Duration } = require('aws-cdk-lib');
const iam = require('aws-cdk-lib/aws-iam')
const s3 = require('aws-cdk-lib/aws-s3')
const codepipeline = require('aws-cdk-lib/aws-codepipeline')
const codepipeline_actions = require('aws-cdk-lib/aws-codepipeline-actions')
const codebuild = require('aws-cdk-lib/aws-codebuild')
const logs = require('aws-cdk-lib/aws-logs')
const sns = require('aws-cdk-lib/aws-sns')
const codestarnotifications = require('aws-cdk-lib/aws-codestarnotifications')

class SampleServiceAppPipelineStack extends Stack {
    /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */

   constructor(scope, id, props) {
    super(scope, id, props);

    const {
        pipelineBucketArn,
        codeStarConnectionArn,
        gitBranch,
        buildSpecAppStackFileName,
        envVariable,
        buildSpecAppStackDeployFileName,
        pipelineSnsArn,
        codeBuildLogGroupName_appStack,
        codeBuildDeployLogGroupName_appStack
    } = props
    //s3 bucket for pipeline
    const sentinelPipelineBucket = s3.Bucket.fromBucketArn(this, 'PipelineBucket', `${pipelineBucketArn}`)

    //Source artifact
    const sourceArtifact = new codepipeline.Artifact('SourceArtifact');
    
    //Source stage
    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: 'Github',
        owner: 'unifo',
        repo: 'sample-service',
        branch: gitBranch,
        output: sourceArtifact,
        connectionArn: codeStarConnectionArn,
        variablesNamespace: 'SourceVariables',
        triggerOnPush: false
    });

    //Build Artifact
    const buildArtifact = new codepipeline.Artifact('BuildArtifact');

    const sampleServiceStackCodebuildRole = new iam.Role(this, 'SampleServiceIacStackCodebuildRole', {
        roleName: 'SampleServiceIacStackCodebuildRole',
        description: 'Policy used in trust relationship with CodeBuild',
        assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
      });

    sampleServiceStackCodebuildRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))

    //Build Project
    const sampleServiceAppStackBuildProject = new codebuild.PipelineProject(this, 'SampleServiceAppStackCheck', {
        projectName : 'sample-service-app-stack-check',
        buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecAppStackFileName),
        timeout: Duration.minutes(60),
        environment: {
            computeType: codebuild.ComputeType.SMALL,
            buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            privileged: true
        },
        environmentVariables: envVariable,
        logging: {
            cloudWatch: {
                logGroup: new logs.LogGroup(this, 'SampleServiceAppStackCodeBuildLogGroup', {
                    logGroupName: codeBuildLogGroupName_appStack,
                    retention: logs.RetentionDays.THREE_DAYS
                })
            }
        },
        role: sampleServiceStackCodebuildRole
    })

    //Build Stage
    const buildAction = new codepipeline_actions.CodeBuildAction({
        actionName: 'sample-service-app-stack-check',
        project: sampleServiceAppStackBuildProject,
        input: sourceArtifact,
        outputs: [buildArtifact]
    })

    //Codepipeline service role
    const sampleServiceAppStackCodePipelineRole = new iam.Role(this, 'SampleServiceAppStackPipelineRole', {
        roleName: 'SampleServiceAppStackPipelineRole',
        description: 'Policy used in trust relationship with CodePipeline',
        assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com')
    })

    //Policy needed for event bridge trigger
    sampleServiceAppStackCodePipelineRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchEventsFullAccess'))

    const sampleServiceAppStackPipelineDeployBuildProject = new codebuild.PipelineProject(this, 'SampleServiceAppStackPipelineDeployBuildProject', {
        projectName: 'sample-service-app-stack-deploy',
        buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecAppStackDeployFileName),
        timeout: Duration.minutes(60),
        environment: {
            computeType: codebuild.ComputeType.SMALL,
            buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            privileged: true
        },
        environmentVariables: envVariable,
        logging: {
            cloudWatch: {
              logGroup: new logs.LogGroup(this, 'SampleServiceAppStackPipelineDeployLogGroup', {
                logGroupName: codeBuildDeployLogGroupName_appStack,
                retention: logs.RetentionDays.THREE_DAYS
              })
            }
        },
        role: sampleServiceStackCodebuildRole
    })

    //Manual approval
    const approval = new codepipeline_actions.ManualApprovalAction({
        actionName: 'sample-service-app-stack-check-approval'
    })


    const deployAction = new codepipeline_actions.CodeBuildAction({
        actionName: 'sample-service-app-stack-deploy',
        project: sampleServiceAppStackPipelineDeployBuildProject,
        input: sourceArtifact,
    })

    const sampleServiceAppStackPipeline = new codepipeline.Pipeline(this, 'SampleServiceAppStackPipeline', {
        pipelineName : 'sample-service-app-stack',
        crossAccountKeys: false,
        role: sampleServiceAppStackCodePipelineRole,
        artifactBucket: sentinelPipelineBucket
    })

    /***************************** sns notification setup ***********************/

    const topic = sns.Topic.fromTopicArn(this, 'pipelineSnsTopic', `${pipelineSnsArn}`)

    //Notification rule
    new codestarnotifications.NotificationRule(this, 'SampleServiceAppStackNotificationRule', {
        source: sampleServiceAppStackPipeline,
        events: [
          'codepipeline-pipeline-action-execution-failed',
          'codepipeline-pipeline-stage-execution-failed',
          'codepipeline-pipeline-pipeline-execution-failed'
        ],
        notificationRuleName: 'sample-service-app-stack-pipeline-notification-rule',
        enabled: true,
        detailType: codestarnotifications.DetailType.FULL,
        targets: [topic]
      });

      /***************************** Pipeline stages ******************/
      sampleServiceAppStackPipeline.addStage({
        stageName: 'Source',
        actions: [sourceAction]
      })
  
      sampleServiceAppStackPipeline.addStage({
          stageName: 'Check',
          actions: [buildAction]
      })

      sampleServiceAppStackPipeline.addStage({
          stageName: 'Approval',
          actions: [approval]
      })

      sampleServiceAppStackPipeline.addStage({
          stageName: 'Deploy',
          actions: [deployAction]
      })
   }
} 

module.exports = {SampleServiceAppPipelineStack}