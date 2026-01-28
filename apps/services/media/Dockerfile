# Media AI Service Dockerfile
# Multi-stage build for optimized production image
# ENCODING-HARDENED: UTF-8 safe across all environments

# Build stage
FROM python:3.11-slim as builder

# ENCODING FIX: Set UTF-8 locale for Debian
ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    PYTHONIOENCODING=utf-8

# Set working directory
WORKDIR /app

# Install system dependencies including locale
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    libmagic1 \
    libmagic-dev \
    locales \
    dos2unix \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen

# ENCODING FIX: Use bash shell
SHELL ["/bin/bash", "-c"]

# Copy requirements
COPY requirements.txt .

# ENCODING FIX: Normalize CRLF
RUN dos2unix requirements.txt 2>/dev/null || sed -i 's/\r$//' requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

# ENCODING FIX: Install locale and set UTF-8 for Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    curl \
    locales \
    dos2unix \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen

# ENCODING FIX: Set UTF-8 locale environment
ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8 \
    PYTHONIOENCODING=utf-8 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8008 \
    LOG_LEVEL=INFO

# ENCODING FIX: Use bash shell
SHELL ["/bin/bash", "-c"]

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY main.py .

# ENCODING FIX: Normalize Python files
RUN dos2unix main.py 2>/dev/null || sed -i 's/\r$//' main.py

# Create directories for data and logs
RUN mkdir -p /app/data /app/logs && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Update PATH to include user-installed packages
ENV PATH=/home/appuser/.local/bin:$PATH

# Expose port
EXPOSE 8008

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8008/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8008", "--workers", "4"]

# ==========================================
# ENCODING HARDENING APPLIED:
# - Debian locale-gen en_US.UTF-8 in both stages
# - LANG=en_US.UTF-8, LC_ALL=en_US.UTF-8
# - PYTHONIOENCODING=utf-8, PYTHONUNBUFFERED=1
# - SHELL ["/bin/bash", "-c"]
# - dos2unix for Windows CRLF compatibility
# ==========================================
