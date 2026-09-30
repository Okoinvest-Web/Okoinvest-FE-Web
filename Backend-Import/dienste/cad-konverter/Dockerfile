# CAD-Konverter (DWG → DXF/SVG) – Standard: GNU LibreDWG (GPL-3.0-or-later) als eigenständige Programme dwg2dxf/dwg2SVG.
# Der Dienst (dienst.py, Python-Standardbibliothek) ruft sie als separaten Prozess auf – kein Linken, keine Weitergabe an
# die übrige Plattform. Quelle: offizieller GNU-Server; Prüfsumme bitte beim Bauen setzen (siehe README, GPG-Signatur .sig).
#
#   docker build -t oekoinvest/cad-konverter --build-arg LIBREDWG_SHA256=<sha256 des Tarballs> .
#
# Alternative ODA File Converter: siehe README (nicht im Image – Lizenzbedingungen der Open Design Alliance beachten).

FROM debian:bookworm-slim AS bau
ARG LIBREDWG_VERSION=0.13.3
ARG LIBREDWG_SHA256=""
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential ca-certificates curl xz-utils pkg-config \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN curl -fsSLO "https://ftp.gnu.org/gnu/libredwg/libredwg-${LIBREDWG_VERSION}.tar.xz" \
 && if [ -n "${LIBREDWG_SHA256}" ]; then echo "${LIBREDWG_SHA256}  libredwg-${LIBREDWG_VERSION}.tar.xz" | sha256sum -c -; else echo "WARNUNG: LIBREDWG_SHA256 nicht gesetzt – Prüfsumme nicht verifiziert"; fi \
 && tar xf "libredwg-${LIBREDWG_VERSION}.tar.xz" \
 && cd "libredwg-${LIBREDWG_VERSION}" \
 && ./configure --prefix=/opt/libredwg --disable-bindings --disable-static \
 && make -j"$(nproc)" \
 && make install \
 && cp COPYING /opt/libredwg/COPYING-LibreDWG

FROM python:3.12-slim
LABEL org.opencontainers.image.title="oekoinvest-cad-konverter" \
      org.opencontainers.image.description="DWG → DXF/SVG über GNU LibreDWG (GPL, separater Prozess)" \
      org.opencontainers.image.licenses="Proprietär (dienst.py); LibreDWG: GPL-3.0-or-later"
COPY --from=bau /opt/libredwg /opt/libredwg
ENV PATH="/opt/libredwg/bin:${PATH}" \
    LD_LIBRARY_PATH="/opt/libredwg/lib" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    KONVERTER=libredwg \
    KONVERTER_PORT=8080
RUN useradd --system --uid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin konverter
WORKDIR /app
COPY dienst.py /app/dienst.py
USER 10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/gesund', timeout=4).status == 200 else 1)"]
CMD ["python", "/app/dienst.py"]
