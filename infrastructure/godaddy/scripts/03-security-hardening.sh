#!/bin/bash
#===============================================================================
# Broxiva GoDaddy VPS - Security Hardening Script
# Step 3: UFW, fail2ban, SSH hardening, security configs
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
SSH_PORT=22

#===============================================================================
# Pre-flight Checks
#===============================================================================
log_info "Starting security hardening..."

if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

#===============================================================================
# Configure UFW Firewall
#===============================================================================
log_info "Configuring UFW firewall..."

# Reset UFW to default
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow ${SSH_PORT}/tcp comment 'SSH'

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow internal ports (localhost only)
# These are only accessible from the server itself via Nginx reverse proxy

# Enable UFW
ufw --force enable

log_success "UFW firewall configured"

# Show UFW status
ufw status verbose

#===============================================================================
# Configure fail2ban
#===============================================================================
log_info "Configuring fail2ban..."

# Create jail.local for SSH protection
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban IP for 1 hour
bantime = 3600
# Find 5 failures within 10 minutes
findtime = 600
maxretry = 5
# Use iptables for banning
banaction = iptables-multiport

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

# Restart fail2ban
systemctl restart fail2ban
systemctl enable fail2ban

log_success "fail2ban configured"

#===============================================================================
# SSH Hardening
#===============================================================================
log_info "Hardening SSH configuration..."

# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Create hardened SSH config
cat > /etc/ssh/sshd_config.d/99-broxiva-hardening.conf << 'EOF'
# Broxiva SSH Hardening Configuration

# Disable root login
PermitRootLogin prohibit-password

# Use SSH Protocol 2 only
Protocol 2

# Disable password authentication (after setting up keys)
# Uncomment the following line after adding SSH keys:
# PasswordAuthentication no

# Disable empty passwords
PermitEmptyPasswords no

# Limit authentication attempts
MaxAuthTries 3

# Disconnect idle sessions after 5 minutes
ClientAliveInterval 300
ClientAliveCountMax 0

# Disable X11 forwarding
X11Forwarding no

# Disable TCP forwarding for security
AllowTcpForwarding no

# Use strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com

# Use strong MACs
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com

# Use strong key exchange algorithms
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org

# Log level
LogLevel VERBOSE

# Disable agent forwarding
AllowAgentForwarding no
EOF

# Test SSH configuration
sshd -t
if [ $? -eq 0 ]; then
    systemctl restart sshd
    log_success "SSH hardening applied"
else
    log_error "SSH configuration test failed. Restoring backup..."
    rm /etc/ssh/sshd_config.d/99-broxiva-hardening.conf
    exit 1
fi

#===============================================================================
# Disable Unused Services
#===============================================================================
log_info "Disabling unused services..."

# List of services to disable if present
SERVICES_TO_DISABLE=(
    "cups"
    "avahi-daemon"
    "bluetooth"
)

for service in "${SERVICES_TO_DISABLE[@]}"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        systemctl stop "$service"
        systemctl disable "$service"
        log_info "Disabled: $service"
    fi
done

log_success "Unused services disabled"

#===============================================================================
# Secure Shared Memory
#===============================================================================
log_info "Securing shared memory..."

if ! grep -q "tmpfs /run/shm" /etc/fstab; then
    echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab
fi

log_success "Shared memory secured"

#===============================================================================
# Configure System Logging
#===============================================================================
log_info "Configuring system logging..."

# Ensure rsyslog is installed and running
apt-get install -y rsyslog
systemctl enable rsyslog
systemctl start rsyslog

log_success "System logging configured"

#===============================================================================
# Secure PostgreSQL
#===============================================================================
log_info "Securing PostgreSQL..."

# Update pg_hba.conf to require password authentication
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
if [ -f "$PG_HBA" ]; then
    # Backup original
    cp "$PG_HBA" "${PG_HBA}.backup"

    # Update to use scram-sha-256 authentication
    sed -i 's/peer$/scram-sha-256/g' "$PG_HBA"
    sed -i 's/md5$/scram-sha-256/g' "$PG_HBA"

    # Ensure only localhost connections are allowed
    cat > "${PG_HBA}" << 'EOF'
# PostgreSQL Client Authentication Configuration File
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             all                                     scram-sha-256

# IPv4 local connections
host    all             all             127.0.0.1/32            scram-sha-256

# IPv6 local connections
host    all             all             ::1/128                 scram-sha-256

# Broxiva application connection
host    broxiva         broxiva         127.0.0.1/32            scram-sha-256
EOF

    systemctl restart postgresql
    log_success "PostgreSQL secured"
else
    log_warning "PostgreSQL config not found at $PG_HBA"
fi

#===============================================================================
# Secure Redis
#===============================================================================
log_info "Securing Redis..."

# Generate a strong password
REDIS_PASSWORD=$(openssl rand -base64 32)

# Update Redis configuration
cat >> /etc/redis/redis.conf << EOF

# Security settings added by Broxiva
requirepass ${REDIS_PASSWORD}
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
EOF

systemctl restart redis-server

# Save Redis password to secure location
echo "REDIS_PASSWORD=${REDIS_PASSWORD}" > /etc/broxiva/redis.secret
chmod 600 /etc/broxiva/redis.secret

log_success "Redis secured. Password saved to /etc/broxiva/redis.secret"

#===============================================================================
# Set Up Automatic Security Updates
#===============================================================================
log_info "Configuring automatic security updates..."

apt-get install -y unattended-upgrades

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

log_success "Automatic security updates configured"

#===============================================================================
# Create Security Audit Script
#===============================================================================
log_info "Creating security audit script..."

cat > /opt/broxiva/scripts/security-audit.sh << 'AUDIT_SCRIPT'
#!/bin/bash
# Broxiva Security Audit Script

echo "=== Broxiva Security Audit ==="
echo "Date: $(date)"
echo ""

echo "=== Open Ports ==="
ss -tuln

echo ""
echo "=== UFW Status ==="
ufw status verbose

echo ""
echo "=== Failed SSH Attempts (last 24h) ==="
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -20 || echo "No failures found"

echo ""
echo "=== fail2ban Status ==="
fail2ban-client status

echo ""
echo "=== Active Connections ==="
netstat -tn | grep ESTABLISHED | wc -l

echo ""
echo "=== Disk Usage ==="
df -h

echo ""
echo "=== Memory Usage ==="
free -h

echo ""
echo "=== Running Services ==="
systemctl list-units --type=service --state=running | grep -E "nginx|postgresql|redis|pm2|docker"
AUDIT_SCRIPT

chmod +x /opt/broxiva/scripts/security-audit.sh

log_success "Security audit script created"

#===============================================================================
# Summary
#===============================================================================
echo ""
echo "==============================================================================="
log_success "Security Hardening Complete!"
echo "==============================================================================="
echo ""
echo "Security Measures Applied:"
echo "  [✓] UFW Firewall (ports 22, 80, 443 only)"
echo "  [✓] fail2ban (SSH, Nginx protection)"
echo "  [✓] SSH Hardening (limited attempts, strong ciphers)"
echo "  [✓] PostgreSQL (local-only, scram-sha-256 auth)"
echo "  [✓] Redis (password protected, dangerous commands disabled)"
echo "  [✓] Automatic security updates"
echo "  [✓] Security audit script"
echo ""
echo "IMPORTANT:"
echo "  1. Set up SSH keys for the broxiva user before disabling password auth"
echo "  2. Redis password saved to: /etc/broxiva/redis.secret"
echo "  3. Run security audit: /opt/broxiva/scripts/security-audit.sh"
echo ""
echo "Next Steps:"
echo "  1. Run ./04-deploy-application.sh to deploy the application"
echo ""
