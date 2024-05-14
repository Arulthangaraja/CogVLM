# -*- encoding: utf-8 -*-
import os, sys
import boto3
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
import argparse
from models.cogvlm_model import FineTuneTestCogVLMModel
from sat.training.model_io import save_checkpoint

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", type=str, default="base", help='version to interact with')
    parser.add_argument("--from_pretrained", type=str, default="checkpoints/merged_lora", help='pretrained ckpt')
    parser.add_argument("--fp16", action="store_true")
    parser.add_argument("--bf16", action="store_true")
    args = parser.parse_args()
    rank = int(os.environ.get('RANK', 0))
    world_size = int(os.environ.get('WORLD_SIZE', 1))
    parser = FineTuneTestCogVLMModel.add_model_specific_args(parser)
    args = parser.parse_args()

    # load model
    model, model_args = FineTuneTestCogVLMModel.from_pretrained(
        args.from_pretrained,
        args=argparse.Namespace(
        deepspeed=None,
        local_rank=rank,
        rank=rank,
        world_size=world_size,
        model_parallel_size=world_size,
        mode='inference',
        skip_init=True,
        use_gpu_initialization=True if torch.cuda.is_available() else False,
        device='cuda',
        **vars(args)
    ), url='local', overwrite_args={'model_parallel_size': 1})
    model = model.eval()
    image_size = model_args.eva_args["image_size"][0]
    local_save_path = f"./checkpoints/merged_model_{image_size}"
    model_args.save = local_save_path

    # Save the fine-tuned model locally (assuming deepspeed is used for saving)
    save_checkpoint(1, model, None, None, model_args)

    #Saving finetuned model in s3
    s3_client = boto3.client('s3')
    bucket_name = 'iris-ocr-poc-documents'
    s3_object_key = f'models/merged_model_{image_size}.pt' 

    # Upload the saved model from local path to S3
    s3_client.upload_file(local_save_path, bucket_name, s3_object_key)

if __name__ == "__main__":
    main()
