FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

ARG INSTALL_YOLO=false
COPY requirements.txt requirements-yolo.txt requirements-yolo-cpu.txt ./
RUN if [ "$INSTALL_YOLO" = "true" ]; then \
      pip install --no-cache-dir -r requirements-yolo-cpu.txt \
      && pip install --no-cache-dir -r requirements-yolo.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

COPY . .
EXPOSE 8000
