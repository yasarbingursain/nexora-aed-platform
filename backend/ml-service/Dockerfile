# Multi-stage Dockerfile for Nexora ML Service

# Stage 1: Base Python environment
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r mlservice && useradd -r -g mlservice mlservice

# Set working directory
WORKDIR /app

# Stage 2: Dependencies
FROM base as dependencies

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Application
FROM dependencies as application

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p models data logs && \
    chown -R mlservice:mlservice /app

# Switch to non-root user
USER mlservice

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Default command
CMD ["python", "main.py"]

# Stage 4: Production (optional, for multi-stage builds)
FROM application as production

# Additional production optimizations
ENV PYTHONOPTIMIZE=1

# Run with gunicorn for production
RUN pip install gunicorn

CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
