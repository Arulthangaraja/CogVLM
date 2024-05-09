#!/bin/bash
#
INPUT_FILE=fileb://$3/$4
OUTPUT_FILE=$3/.enc$4.$5

aws kms --profile $1 encrypt --key-id $2 --plaintext $INPUT_FILE --output text --query CiphertextBlob | base64 --decode > $OUTPUT_FILE 