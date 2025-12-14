# Personalization Service Dockerfile
# ENCODING-HARDENED: UTF-8 safe across all environments
FROM python:3.11-slim

# ENCODING FIX: Install locale and set UTF-8 for Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    locales \
    gcc \
    g++ \
    curl \
    dos2unix \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen

# ENCODING FIX: Set UTF-8 locale environment
ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8 \
    PYTHONIOENCODING=utf-8 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ENCODING FIX: Use bash shell
SHELL ["/bin/bash", "-c"]

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# ENCODING FIX: Normalize CRLF
RUN dos2unix requirements.txt 2>/dev/null || sed -i 's/\r$//' requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# ENCODING FIX: Normalize Python files
RUN dos2unix main.py 2>/dev/null || sed -i 's/\r$//' main.py

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8010/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]

# ==========================================
# ENCODING HARDENING APPLIED:
# - Debian locale-gen en_US.UTF-8
# - LANG=en_US.UTF-8, LC_ALL=en_US.UTF-8
# - PYTHONIOENCODING=utf-8, PYTHONUNBUFFERED=1
# - SHELL ["/bin/bash", "-c"]
# - dos2unix for Windows CRLF compatibility
# ==========================================
