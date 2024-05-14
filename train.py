#!/usr/bin/env python

import subprocess

#Start the fine-tuning process
fine_tune_command = "bash finetune_demo/finetune_cogvlm_lora.sh"
subprocess.run(fine_tune_command, shell=True)

#Merge the model
merge_model_command = "torchrun --standalone --nnodes=1 --nproc-per-node=4 utils/merge_model.py --version base --bf16 --from_pretrained ./checkpoints/merged_lora_cogvlm490/cogvlm224"
subprocess.run(merge_model_command, shell=True)

#Evaluate the performance
evaluate_command = "bash finetune_demo/evaluate_cogvlm.sh"
subprocess.run(evaluate_command, shell=True)
