import os
import shutil
from typing import List
import random
import boto3
current_dir = os.getcwd()
parent_path, child_path = os.path.split(current_dir)

def upload_dataset_in_s3():
    #Saving finetuned model in s3
    local_save_path = os.path.join( parent_path, 'archive_split' )
    s3_client = boto3.client('s3')
    bucket_name = 'iris-ocr-poc-documents'
    s3_object_key = 'dataset'

    # Upload the saved model from local path to S3
    res = s3_client.upload_folder(local_save_path, bucket_name, s3_object_key)
    print("uploaded in s3 successfully : ", res)

def find_all_files(path: str, suffix: str = ".jpg") -> List[str]:

    target_files = []
    for cur_dir, _, files in os.walk(path, followlinks=True):
        for f in files:
            if f.endswith(suffix):
                target_files.append(os.path.join(cur_dir, f))
    print(f'Found {len(target_files)} files...')
    return target_files


def split_data_by_folder(data_path: str, target_path: str, split_ratio: float = 0.8,
                         validation_ratio: float = 0.1, test_ratio: float = 0.1,
                         seed: int = None):

    class_folders = [f for f in os.listdir(data_path) if os.path.isdir(os.path.join(data_path, f))]

    os.makedirs(target_path, exist_ok=True)
    for class_folder in class_folders:
        class_path = os.path.join(data_path, class_folder)
        class_files = find_all_files(class_path)

        if seed is not None:
            random.seed(seed)
        random.shuffle(class_files)

        total_files = len(class_files)
        train_size = int(split_ratio * total_files)
        valid_size = int(validation_ratio * total_files)
        test_size = int(test_ratio * total_files)

        train_files, valid_files, test_files = class_files[:train_size], class_files[train_size:train_size + valid_size], class_files[train_size + valid_size:]

        os.makedirs(os.path.join(target_path, "train", class_folder), exist_ok=True)
        for file in train_files:
            shutil.move(file, os.path.join(target_path, "train", class_folder, os.path.basename(file)))

        os.makedirs(os.path.join(target_path, "valid", class_folder), exist_ok=True)
        for file in valid_files:
            shutil.move(file, os.path.join(target_path, "valid", class_folder, os.path.basename(file)))

        os.makedirs(os.path.join(target_path, "test", class_folder), exist_ok=True)
        for file in test_files:
            shutil.move(file, os.path.join(target_path, "test", class_folder, os.path.basename(file)))


# Modify these variables as needed
data_path =  os.path.join( parent_path, 'dataset')
target_path = os.path.join( parent_path, 'archive_split')
split_ratio = 0.8 
validation_ratio = 0.1  
test_ratio = 0.1  
seed = 2023  

split_data_by_folder(data_path, target_path, split_ratio, validation_ratio, test_ratio, seed)
# upload_dataset_in_s3()


# import subprocess

# def upload_folder_to_s3(local_folder, s3_bucket, s3_prefix=''):
#     # Sync the local folder with the specified S3 bucket
#     subprocess.run(['aws', 's3', 'sync', local_folder, f's3://{s3_bucket}/{s3_prefix}'])

# # Set the local folder path and S3 bucket name
# local_folder = '/path/to/your/local/folder'
# s3_bucket = 'your-s3-bucket-name'
# s3_prefix = 'optional-prefix-if-needed'

# # Upload the folder to S3
# upload_folder_to_s3(local_folder, s3_bucket, s3_prefix)





