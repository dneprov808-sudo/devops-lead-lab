FROM python:3.12-slim
WORKDIR /app
RUN mkdir /data && chown 10001:10001 /data
COPY app.py .
USER 10001:10001
ENTRYPOINT ["python", "-u", "/app/app.py"]
