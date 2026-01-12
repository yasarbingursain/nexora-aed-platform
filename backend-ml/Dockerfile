# =============================================================================
# NEXORA ML SERVICE - PRODUCTION DOCKERFILE
# =============================================================================
# Python FastAPI ML service for anomaly detection and threat prediction
# Enterprise-grade with security hardening and health checks
# =============================================================================

FROM public.ecr.aws/docker/library/python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# =============================================================================
# STAGE 1: Builder
# =============================================================================
FROM base AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# =============================================================================
# STAGE 2: Production Runner
# =============================================================================
FROM base AS runner

WORKDIR /app

# Create non-root user
RUN groupadd --system --gid 1001 mlservice \
    && useradd --system --uid 1001 --gid mlservice mluser

# Copy installed packages from builder
COPY --from=builder /root/.local /home/mluser/.local

# Make sure scripts in .local are usable
ENV PATH=/home/mluser/.local/bin:$PATH

# Copy application code
COPY --chown=mluser:mlservice app/ ./app/
RUN mkdir -p ./models

# Create models directory if it doesn't exist
RUN mkdir -p /app/models && chown -R mluser:mlservice /app/models

# Switch to non-root user
USER mluser

# Expose port
EXPOSE 8002

# Environment variables
ENV PORT=8002
ENV ML_MODEL_PATH=/app/models
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')" || exit 1

# Start the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
