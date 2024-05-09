const { Stack, CfnOutput } = require('aws-cdk-lib');
const ecr = require('aws-cdk-lib/aws-ecr')

class SampleResourcesStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    const {
      environmentId,
    } = props;
    // Create ECR Repository sample-api
    const sampleApiRepo = new ecr.Repository(this, 'sample-api', {
      repositoryName: 'unifo/sample-api',
      encryption: ecr.RepositoryEncryption.AES_256,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      lifecycleRules:[
        {
          rulePriority: 1,
          maxImageCount: 5,
          description: 'This rule is used to retain only the latest five docker images'
        }
      ]
    })

    new CfnOutput(this, 'SampleApiECRRepository', {
      value: sampleApiRepo.repositoryArn,
      description: 'The sample-api repository ARN',
      exportName: 'SampleApiECRRepository',
    });
  }
}

module.exports = { SampleResourcesStack }