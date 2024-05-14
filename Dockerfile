# Python 3.12.0
# FROM python:3.12.0-slim-bookworm
FROM python:3.8

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws

# Create a working directory
WORKDIR /opt/ml

# Change working directory
RUN mkdir code

# Copy requirements.txt file
COPY requirements.txt .

#Update pip
RUN pip3 install --upgrade pip

RUN pip3 install torch==2.2.2

#Install required packages
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy all source code
COPY . .

# Expose API port to the outside
# EXPOSE 8080

# Launch application
ENTRYPOINT ["python3","train.py"]