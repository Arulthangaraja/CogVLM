# !/usr/bin/bash
#
INPUT_FILE=fileb://$3/.enc$4.$5
OUTPUT_FILE=$3/$4

aws kms --profile $1 decrypt --ciphertext-blob $INPUT_FILE --key-id $2 --output text --query Plaintext | base64 --decode > $OUTPUT_FILE