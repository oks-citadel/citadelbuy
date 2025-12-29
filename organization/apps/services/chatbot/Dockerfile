# Chatbot Service Dockerfile
# ENCODING-HARDENED: UTF-8 safe across all environments
FROM python:3.11-slim

# ENCODING FIX: Install locale and set UTF-8 for Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    locales \
    gcc \
    g++ \
    curl \
    libgomp1 \
    dos2unix \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen

# ENCODING FIX: Set UTF-8 locale environment
ENV LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8 \
    PYTHONIOENCODING=utf-8 \
    PYTHONUNBUFFERED=1

# ENCODING FIX: Use bash shell
SHELL ["/bin/bash", "-c"]

# Set working directory
WORKDIR /app

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create sessions directory
RUN mkdir -p /app/sessions && chown -R appuser:appuser /app/sessions

# Copy requirements first for caching
COPY requirements.txt .

# ENCODING FIX: Normalize CRLF
RUN dos2unix requirements.txt 2>/dev/null || sed -i 's/\r$//' requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# ENCODING FIX: Normalize all Python and config files
RUN find . -type f \( -name "*.py" -o -name "*.txt" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.sh" \) -exec dos2unix {} \; 2>/dev/null || \
    find . -type f \( -name "*.py" -o -name "*.txt" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.sh" \) -exec sed -i 's/\r$//' {} \;

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8004/health || exit 1

# Run the application
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8004", "--workers", "2"]

# ==========================================
# ENCODING HARDENING APPLIED:
# - Debian locale-gen en_US.UTF-8
# - LANG=en_US.UTF-8, LC_ALL=en_US.UTF-8
# - PYTHONIOENCODING=utf-8, PYTHONUNBUFFERED=1
# - SHELL ["/bin/bash", "-c"]
# - dos2unix for Windows CRLF compatibility
# ==========================================
