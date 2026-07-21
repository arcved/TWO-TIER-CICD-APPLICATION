FROM python:3.12-slim

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV NO_PROXY=$NO_PROXY

WORKDIR /app

COPY requirements.txt .

RUN pip install \
    --proxy=http://10.158.100.6:8080 \
    --no-cache-dir \
    -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]