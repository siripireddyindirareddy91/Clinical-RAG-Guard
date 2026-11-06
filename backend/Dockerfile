FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home researcher && mkdir -p /data && chown researcher /data
USER researcher
ENV DATABASE_URL=sqlite:////data/mediverify.db
EXPOSE 8000
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","8000","--no-access-log"]
