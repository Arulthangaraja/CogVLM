import boto3
import sagemaker
from sagemaker.estimator import Estimator

session = sagemaker.Session()

role = sagemaker.get_execution_role()


# Create an estimator
custom_estimator = Estimator(image_uri='829865996979.dkr.ecr.ap-south-1.amazonaws.com/cogvlm-train@sha256:4f7f213b7daf12f606297771c27466f021fbc11b9780f7ceab0d4391acba0137',
                             role=  "arn:aws:iam::829865996979:role/SagemakerTrainingAccess",
                             instance_count=1,
                             instance_type='ml.p2.xlarge',
                             output_path= "s3://iris-ocr-poc-documents/sagemaker-models/"
)
# Start the fine-tuning job
custom_estimator.fit( job_name= "cogvlm-training-job-3")
