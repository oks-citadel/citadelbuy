#!/bin/bash
#===============================================================================
# Broxiva GoDaddy VPS Provisioning Script
# Step 1: Initial Server Setup
#===============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

#===============================================================================
# Configuration
#===============================================================================
BROXIVA_USER="broxiva"
BROXIVA_HOME="/opt/broxiva"
LOG_DIR="/var/log/broxiva"
BACKUP_DIR="/opt/backups"
SWAP_SIZE="4G"

#===============================================================================
# Pre-flight Checks
#===============================================================================
log_info "Starting Broxiva GoDaddy VPS Provisioning..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Check Ubuntu version
if ! grep -q "22.04" /etc/os-release; then
    log_warning "This script is designed for Ubuntu 22.04. Current OS may have compatibility issues."
fi

#===============================================================================
# System Update
#===============================================================================
log_info "Updating system packages..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
apt-get autoremove -y
log_success "System packages updated"

#===============================================================================
# Set Timezone
#===============================================================================
log_info "Setting timezone to UTC..."
timedatectl set-timezone UTC
log_success "Timezone set to UTC"

#===============================================================================
# Create Broxiva User
#===============================================================================
log_info "Creating broxiva system user..."
if id "$BROXIVA_USER" &>/dev/null; then
    log_warning "User $BROXIVA_USER already exists"
else
    useradd -m -s /bin/bash -d /home/$BROXIVA_USER $BROXIVA_USER
    usermod -aG sudo $BROXIVA_USER
    log_success "User $BROXIVA_USER created"
fi

#===============================================================================
# Create Directory Structure
#===============================================================================
log_info "Creating directory structure..."

mkdir -p $BROXIVA_HOME/{frontend,backend,shared,scripts}
mkdir -p $LOG_DIR/{frontend,backend,nginx,pm2}
mkdir -p $BACKUP_DIR/{database,configs}
mkdir -p /etc/broxiva

# Set ownership
chown -R $BROXIVA_USER:$BROXIVA_USER $BROXIVA_HOME
chown -R $BROXIVA_USER:$BROXIVA_USER $LOG_DIR
chown -R $BROXIVA_USER:$BROXIVA_USER $BACKUP_DIR

log_success "Directory structure created"

#===============================================================================
# Configure Swap
#===============================================================================
log_info "Configuring swap space..."

if [ -f /swapfile ]; then
    log_warning "Swap file already exists"
else
    fallocate -l $SWAP_SIZE /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # Optimize swap settings
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    sysctl -p

    log_success "Swap configured ($SWAP_SIZE)"
fi

#===============================================================================
# Install Essential Packages
#===============================================================================
log_info "Installing essential packages..."

apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    iotop \
    ncdu \
    tree \
    unzip \
    zip \
    jq \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    acl \
    rsync \
    net-tools \
    dnsutils \
    telnet \
    openssl

log_success "Essential packages installed"

#===============================================================================
# Configure System Limits
#===============================================================================
log_info "Configuring system limits..."

cat >> /etc/security/limits.conf << 'EOF'
# Broxiva Application Limits
broxiva soft nofile 65535
broxiva hard nofile 65535
broxiva soft nproc 65535
broxiva hard nproc 65535
* soft nofile 65535
* hard nofile 65535
EOF

cat >> /etc/sysctl.conf << 'EOF'
# Broxiva Network Optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
fs.file-max = 2097152
EOF

sysctl -p

log_success "System limits configured"

#===============================================================================
# Create Environment Template
#===============================================================================
log_info "Creating environment configuration template..."

cat > /etc/broxiva/server.conf << 'EOF'
# Broxiva Server Configuration
# Generated during provisioning

BROXIVA_ENV=production
BROXIVA_HOME=/opt/broxiva
BROXIVA_USER=broxiva
LOG_DIR=/var/log/broxiva
BACKUP_DIR=/opt/backups

# Server Info (to be filled)
SERVER_IP=
DOMAIN=broxiva.com

# Ports
FRONTEND_PORT=3000
BACKEND_PORT=4000
POSTGRES_PORT=5432
REDIS_PORT=6379

# Timestamps
PROVISIONED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

log_success "Environment template created at /etc/broxiva/server.conf"

#===============================================================================
# Summary
#===============================================================================
echo ""
echo "==============================================================================="
log_success "Server Provisioning Complete!"
echo "==============================================================================="
echo ""
echo "Next Steps:"
echo "  1. Run ./02-install-dependencies.sh to install Node.js, Docker, etc."
echo "  2. Update /etc/broxiva/server.conf with your server IP"
echo "  3. Configure SSH keys for the broxiva user"
echo ""
echo "Server Details:"
echo "  - User: $BROXIVA_USER"
echo "  - Home: $BROXIVA_HOME"
echo "  - Logs: $LOG_DIR"
echo "  - Backups: $BACKUP_DIR"
echo "  - Swap: $SWAP_SIZE"
echo ""
