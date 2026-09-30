# Geodaten-Dienst: GDAL (ogr2ogr, gdaldem, Python-Bindungen osgeo.*) + FastAPI
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.9.3
RUN apt-get update && apt-get install -y --no-install-recommends python3-pip python3-venv && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv --system-site-packages /opt/venv
ENV PATH=/opt/venv/bin:$PATH PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY geodaten ./geodaten
COPY sql ./sql
COPY demo ./demo
COPY tests ./tests
COPY osmconf.ini .
RUN useradd -r -u 10001 geodaten && mkdir -p /daten && chown geodaten /daten
USER geodaten
EXPOSE 8444
# Beim Start: Schema idempotent anlegen, dann API mit TLS (Zertifikate aus ./zertifikate)
CMD ["sh", "-c", "python -m geodaten.cli schema && uvicorn geodaten.api:app --host 0.0.0.0 --port 8444 --ssl-keyfile /zertifikate/api.key --ssl-certfile /zertifikate/api.crt --no-server-header"]
