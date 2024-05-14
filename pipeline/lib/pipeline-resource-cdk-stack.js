const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const iam = require('aws-cdk-lib/aws-iam')
const s3 = require('aws-cdk-lib/aws-s3')
const codepipeline = require('aws-cdk-lib/aws-codepipeline')
const codepipeline_actions = require('aws-cdk-lib/aws-codepipeline-actions')
const codebuild = require('aws-cdk-lib/aws-codebuild')
const logs = require('aws-cdk-lib/aws-logs')
const sns = require('aws-cdk-lib/aws-sns')
const codestarnotifications = require('aws-cdk-lib/aws-codestarnotifications')

class SampleServiceResourcePipelineStack extends Stack {
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
        buildSpecResourceStackFileName,
        envVariable,
        buildSpecResourceStackDeployFileName,
        pipelineSnsArn,
        codeBuildLogGroupName_resourceStack,
        codeBuildDeployLogGroupName_resourceStack,
    } = props

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


    const sampleServiceResourceStackCodebuildRole = new iam.Role(this, 'SampleServiceResourceStackCodebuildRole', {
        roleName: 'SampleServiceResourceStackCodebuildRole',
        description: 'Policy used in trust relationship with CodeBuild',
        assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
      });

    sampleServiceResourceStackCodebuildRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))
    //Build Project
    const sampleServiceResourceStackBuildProject = new codebuild.PipelineProject(this, 'SampleServiceResourceStackBuildProject', {
        projectName : 'sample-service-resource-stack-check',
        buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecResourceStackFileName),
        timeout: Duration.minutes(60),
        environment: {
            computeType: codebuild.ComputeType.SMALL,
            buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            privileged: true
        },
        environmentVariables: envVariable,
        logging: {
            cloudWatch: {
                logGroup: new logs.LogGroup(this, 'SampleServiceResourceStackBuildLogGroup', {
                    logGroupName: codeBuildLogGroupName_resourceStack,
                    retention: logs.RetentionDays.THREE_DAYS,
                    removalPolicy: RemovalPolicy.DESTROY
                })
            }
        },
        role: sampleServiceResourceStackCodebuildRole
    })

    //Build Stage
    const buildAction = new codepipeline_actions.CodeBuildAction({
        actionName: 'sample-service-resource-stack-check',
        project: sampleServiceResourceStackBuildProject,
        input: sourceArtifact,
        outputs: [buildArtifact]
    })

    //Codepipeline service role
    const sampleServiceResourceStackCodePipelineRole = new iam.Role(this, 'SampleServiceResourceStackCodePipelineRole', {
        roleName: 'SampleServiceResourceStackCodePipelineRole',
        description: 'Policy used in trust relationship with CodePipeline',
        assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com')
    })

    //Policy needed for event bridge trigger
    sampleServiceResourceStackCodePipelineRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchEventsFullAccess'))

    const sampleServiceResourceStackPipelineDeployBuildProject = new codebuild.PipelineProject(this, 'SampleServiceResourceStackPipelineDeployBuildProject', {
        projectName: 'sample-service-resource-stack-deploy',
        buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecResourceStackDeployFileName),
        timeout: Duration.minutes(60),
        environment: {
            computeType: codebuild.ComputeType.SMALL,
            buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            privileged: true
        },
        environmentVariables: envVariable,
        logging: {
            cloudWatch: {
              logGroup: new logs.LogGroup(this, 'SampleServiceResourceStackPipelineDeployLogGroup', {
                logGroupName: codeBuildDeployLogGroupName_resourceStack,
                retention: logs.RetentionDays.THREE_DAYS,
                removalPolicy: RemovalPolicy.DESTROY
              })
            }
        },
        role: sampleServiceResourceStackCodebuildRole
    })

    //Manual approval
    const approval = new codepipeline_actions.ManualApprovalAction({
        actionName: 'sample-service-resource-stack-check-approval'
    })


    const deployAction = new codepipeline_actions.CodeBuildAction({
        actionName: 'sample-service-resource-stack-deploy',
        project: sampleServiceResourceStackPipelineDeployBuildProject,
        input: sourceArtifact,
    })

    const sampleServiceResourceStackPipeline = new codepipeline.Pipeline(this, 'SampleServiceResourceStackPipeline', {
        pipelineName : 'sample-service-resource-stack',
        crossAccountKeys: false,
        role: sampleServiceResourceStackCodePipelineRole,
        artifactBucket: sentinelPipelineBucket
    })

    /***************************** sns notification setup ***********************/

    const topic = sns.Topic.fromTopicArn(this, 'pipelineSnsTopic', `${pipelineSnsArn}`)

    //Notification rule
    new codestarnotifications.NotificationRule(this, 'SampleServiceResourceStackNotificationRule', {
        source: sampleServiceResourceStackPipeline,
        events: [
          'codepipeline-pipeline-action-execution-failed',
          'codepipeline-pipeline-stage-execution-failed',
          'codepipeline-pipeline-pipeline-execution-failed'
        ],
        notificationRuleName: 'sample-service-resource-stack-pipeline-notification-rule',
        enabled: true,
        detailType: codestarnotifications.DetailType.FULL,
        targets: [topic]
      });

      /***************************** Pipeline stages ******************/
      sampleServiceResourceStackPipeline.addStage({
        stageName: 'Source',
        actions: [sourceAction]
      })
  
      sampleServiceResourceStackPipeline.addStage({
          stageName: 'Check',
          actions: [buildAction]
      })

      sampleServiceResourceStackPipeline.addStage({
          stageName: 'Approval',
          actions: [approval]
      })

      sampleServiceResourceStackPipeline.addStage({
          stageName: 'Deploy',
          actions: [deployAction]
      })
   }
} 

module.exports = {SampleServiceResourcePipelineStack}