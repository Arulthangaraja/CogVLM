import subprocess
import sys

type = sys.argv[0]
profile  = sys.argv[1]
kms_key_id = sys.argv[2]
env_path = sys.argv[3]
file = sys.argv[4]
environment = sys.argv[5]

subprocess.call(['sh','./encryptLinux.sh',profile,kms_key_id,env_path,file,environment])