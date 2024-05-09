## Branches
```bash
develop - Contains the code for Dev Environment
test - Contains the code for Qe Environment
uat - Contains the code for UAT Environment
main - Contains the code for Prod Environment
```
### Branch merge flow
```bash
develop -> test -> uat -> main
```
## Decrypt and Encrypt Commands of Environment files 
### Decrypt:
```bash
Dev Environment:
python3 decryptLinux.py default 906511ad-7120-48d8-aad7-b41e8aad26dc ./ .env development

Test Environment:
python3 decryptLinux.py default cc50bca8-feb3-496a-a58e-476f256f2cb2 ./ .env test

Uat Environment:
python3 decryptLinux.py default 4af62c94-0142-4cf1-8172-0637b575587c ./ .env uat

Prod Environment:
python3 decryptLinux.py default d54ed4c3-b77a-4cae-84bb-3a3f414f3c4f ./ .env production
```
### Encrypt:
```bash
Dev Environment:
python3 encryptLinux.py default 906511ad-7120-48d8-aad7-b41e8aad26dc ./ .env development

Test Environment:
python3 encryptLinux.py default cc50bca8-feb3-496a-a58e-476f256f2cb2 ./ .env test

Uat Environment:
python3 encryptLinux.py default 4af62c94-0142-4cf1-8172-0637b575587c ./ .env uat

Prod Environment:
python3 encryptLinux.py default d54ed4c3-b77a-4cae-84bb-3a3f414f3c4f ./ .env production
```