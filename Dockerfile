# Python 3.12.0
FROM python:3.12.0-slim-bookworm

# Create a working directory
RUN mkdir /home/app/

# Change working directory
WORKDIR /home/app/

# Copy requirements.txt file
COPY requirements.txt .

#Update pip
RUN pip3 install --upgrade pip

#Install required packages
RUN pip3 install -r requirements.txt

# Copy all source code
COPY . .

# Expose API port to the outside
EXPOSE 8080

# Launch application
ENTRYPOINT ["python3","routes/main.py"]