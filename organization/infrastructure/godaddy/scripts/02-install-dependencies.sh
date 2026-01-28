#!/bin/bash
#===============================================================================
# Broxiva GoDaddy VPS - Dependency Installation Script
# Step 2: Install Node.js, Docker, Nginx, PostgreSQL, Redis, PM2
#===============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

#===============================================================================
# Configuration
#===============================================================================
NODE_VERSION="20"
PNPM_VERSION="10.23.0"
POSTGRES_VERSION="16"
REDIS_VERSION="7"

#===============================================================================
# Pre-flight Checks
#===============================================================================
log_info "Starting dependency installation..."

if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

#===============================================================================
# Install Node.js 20
#===============================================================================
log_info "Installing Node.js ${NODE_VERSION}..."

if command -v node &> /dev/null; then
    CURRENT_NODE=$(node -v)
    log_warning "Node.js already installed: $CURRENT_NODE"
else
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    log_success "Node.js $(node -v) installed"
fi

#===============================================================================
# Install pnpm
#===============================================================================
log_info "Installing pnpm ${PNPM_VERSION}..."

npm install -g pnpm@${PNPM_VERSION}
log_success "pnpm $(pnpm -v) installed"

#===============================================================================
# Install PM2
#===============================================================================
log_info "Installing PM2..."

npm install -g pm2
pm2 install pm2-logrotate

# Configure PM2 logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

log_success "PM2 $(pm2 -v) installed"

#===============================================================================
# Install Docker
#===============================================================================
log_info "Installing Docker..."

if command -v docker &> /dev/null; then
    log_warning "Docker already installed: $(docker -v)"
else
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Add the repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add broxiva user to docker group
    usermod -aG docker broxiva

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    log_success "Docker $(docker -v) installed"
fi

#===============================================================================
# Install Nginx
#===============================================================================
log_info "Installing Nginx..."

if command -v nginx &> /dev/null; then
    log_warning "Nginx already installed: $(nginx -v 2>&1)"
else
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    log_success "Nginx installed"
fi

# Create Nginx directories
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
mkdir -p /etc/nginx/ssl
mkdir -p /var/cache/nginx

#===============================================================================
# Install PostgreSQL 16
#===============================================================================
log_info "Installing PostgreSQL ${POSTGRES_VERSION}..."

if command -v psql &> /dev/null; then
    log_warning "PostgreSQL already installed"
else
    # Add PostgreSQL repository
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update

    apt-get install -y postgresql-${POSTGRES_VERSION} postgresql-contrib-${POSTGRES_VERSION}

    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql

    log_success "PostgreSQL ${POSTGRES_VERSION} installed"
fi

#===============================================================================
# Install Redis 7
#===============================================================================
log_info "Installing Redis ${REDIS_VERSION}..."

if command -v redis-server &> /dev/null; then
    log_warning "Redis already installed"
else
    # Add Redis repository
    curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/redis.list
    apt-get update

    apt-get install -y redis

    # Configure Redis
    sed -i 's/^bind 127.0.0.1 ::1$/bind 127.0.0.1/' /etc/redis/redis.conf
    sed -i 's/^# maxmemory <bytes>$/maxmemory 2gb/' /etc/redis/redis.conf
    sed -i 's/^# maxmemory-policy noeviction$/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

    # Start and enable Redis
    systemctl restart redis-server
    systemctl enable redis-server

    log_success "Redis installed"
fi

#===============================================================================
# Install Certbot
#===============================================================================
log_info "Installing Certbot..."

if command -v certbot &> /dev/null; then
    log_warning "Certbot already installed"
else
    apt-get install -y certbot python3-certbot-nginx
    log_success "Certbot installed"
fi

#===============================================================================
# Install Elasticsearch (Optional - Docker)
#===============================================================================
log_info "Setting up Elasticsearch via Docker..."

# Elasticsearch will be managed via Docker Compose
log_success "Elasticsearch will be configured via Docker Compose"

#===============================================================================
# Install Additional Tools
#===============================================================================
log_info "Installing additional tools..."

# Install fail2ban
apt-get install -y fail2ban

# Install logrotate (usually pre-installed)
apt-get install -y logrotate

# Install monitoring tools
apt-get install -y sysstat iftop

log_success "Additional tools installed"

#===============================================================================
# Verify Installations
#===============================================================================
echo ""
echo "==============================================================================="
log_info "Verifying installations..."
echo "==============================================================================="
echo ""

echo "Node.js:     $(node -v)"
echo "npm:         $(npm -v)"
echo "pnpm:        $(pnpm -v)"
echo "PM2:         $(pm2 -v)"
echo "Docker:      $(docker -v)"
echo "Nginx:       $(nginx -v 2>&1 | cut -d'/' -f2)"
echo "PostgreSQL:  $(psql --version | cut -d' ' -f3)"
echo "Redis:       $(redis-server --version | cut -d'=' -f2 | cut -d' ' -f1)"
echo "Certbot:     $(certbot --version | cut -d' ' -f2)"

echo ""
echo "==============================================================================="
log_success "All dependencies installed!"
echo "==============================================================================="
echo ""
echo "Next Steps:"
echo "  1. Run ./03-security-hardening.sh to secure the server"
echo "  2. Configure PostgreSQL database user and database"
echo "  3. Configure Redis password (optional but recommended)"
echo ""
