# Multi-stage Docker build for AI Agents Service
# ENCODING-HARDENED: UTF-8 safe across all environments
FROM python:3.11-slim as builder

# ENCODING FIX: Set UTF-8 locale for Debian
ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    PYTHONIOENCODING=utf-8

# Set working directory
WORKDIR /app

# Install system dependencies including locale
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
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
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# ENCODING FIX: Install locale and set UTF-8 for Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
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
    PORT=8020 \
    LOG_LEVEL=INFO

# ENCODING FIX: Use bash shell
SHELL ["/bin/bash", "-c"]

# Set working directory
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# ENCODING FIX: Normalize all Python and config files
RUN find . -type f \( -name "*.py" -o -name "*.txt" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.sh" \) -exec dos2unix {} \; 2>/dev/null || \
    find . -type f \( -name "*.py" -o -name "*.txt" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.sh" \) -exec sed -i 's/\r$//' {} \;

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8020/health || exit 1

# Expose port
EXPOSE 8020

# Run application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8020"]

# ==========================================
# ENCODING HARDENING APPLIED:
# - Debian locale-gen en_US.UTF-8 in both stages
# - LANG=en_US.UTF-8, LC_ALL=en_US.UTF-8
# - PYTHONIOENCODING=utf-8, PYTHONUNBUFFERED=1
# - SHELL ["/bin/bash", "-c"]
# - dos2unix for Windows CRLF compatibility
# ==========================================
