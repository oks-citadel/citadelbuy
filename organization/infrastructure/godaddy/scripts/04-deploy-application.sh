#!/bin/bash
#===============================================================================
# Broxiva GoDaddy VPS - Application Deployment Script
# Step 4: Clone, build, and deploy frontend and backend
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
BROXIVA_HOME="/opt/broxiva"
REPO_URL="${BROXIVA_REPO_URL:-https://github.com/broxiva/organization.git}"
BRANCH="${BROXIVA_BRANCH:-main}"
FRONTEND_PORT=3000
BACKEND_PORT=4000

#===============================================================================
# Pre-flight Checks
#===============================================================================
log_info "Starting application deployment..."

if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Check if .env exists
if [ ! -f "${BROXIVA_HOME}/.env" ]; then
    log_error ".env file not found at ${BROXIVA_HOME}/.env"
    log_info "Please create the .env file first using the template from .env.example"
    exit 1
fi

#===============================================================================
# Clone Repository
#===============================================================================
log_info "Cloning Broxiva repository..."

if [ -d "${BROXIVA_HOME}/source" ]; then
    log_warning "Source directory exists. Pulling latest changes..."
    cd "${BROXIVA_HOME}/source"
    git fetch origin
    git checkout ${BRANCH}
    git pull origin ${BRANCH}
else
    git clone --branch ${BRANCH} ${REPO_URL} "${BROXIVA_HOME}/source"
fi

cd "${BROXIVA_HOME}/source"
log_success "Repository cloned/updated"

#===============================================================================
# Install Dependencies
#===============================================================================
log_info "Installing dependencies with pnpm..."

# Enable corepack for pnpm
corepack enable

# Install dependencies
pnpm install --frozen-lockfile

log_success "Dependencies installed"

#===============================================================================
# Generate Prisma Client
#===============================================================================
log_info "Generating Prisma client..."

cd "${BROXIVA_HOME}/source/apps/api"
pnpm prisma generate

log_success "Prisma client generated"

#===============================================================================
# Build Applications
#===============================================================================
log_info "Building applications with Turbo..."

cd "${BROXIVA_HOME}/source"

# Build API
log_info "Building backend API..."
pnpm turbo build --filter=broxiva-backend

# Build Web
log_info "Building frontend web..."
pnpm turbo build --filter=@broxiva/web

log_success "Applications built"

#===============================================================================
# Copy Build Artifacts
#===============================================================================
log_info "Copying build artifacts..."

# Copy backend
rm -rf "${BROXIVA_HOME}/backend"
mkdir -p "${BROXIVA_HOME}/backend"
cp -r "${BROXIVA_HOME}/source/apps/api/dist" "${BROXIVA_HOME}/backend/"
cp "${BROXIVA_HOME}/source/apps/api/package.json" "${BROXIVA_HOME}/backend/"
cp -r "${BROXIVA_HOME}/source/apps/api/node_modules" "${BROXIVA_HOME}/backend/"
cp -r "${BROXIVA_HOME}/source/apps/api/prisma" "${BROXIVA_HOME}/backend/"

# Copy frontend (Next.js standalone)
rm -rf "${BROXIVA_HOME}/frontend"
mkdir -p "${BROXIVA_HOME}/frontend"
cp -r "${BROXIVA_HOME}/source/apps/web/.next/standalone/." "${BROXIVA_HOME}/frontend/"
cp -r "${BROXIVA_HOME}/source/apps/web/.next/static" "${BROXIVA_HOME}/frontend/.next/"
cp -r "${BROXIVA_HOME}/source/apps/web/public" "${BROXIVA_HOME}/frontend/"

# Copy environment files
cp "${BROXIVA_HOME}/.env" "${BROXIVA_HOME}/backend/.env"
cp "${BROXIVA_HOME}/.env" "${BROXIVA_HOME}/frontend/.env"

log_success "Build artifacts copied"

#===============================================================================
# Set Permissions
#===============================================================================
log_info "Setting permissions..."

chown -R broxiva:broxiva "${BROXIVA_HOME}"
chmod -R 755 "${BROXIVA_HOME}/backend"
chmod -R 755 "${BROXIVA_HOME}/frontend"

log_success "Permissions set"

#===============================================================================
# Create PM2 Ecosystem File
#===============================================================================
log_info "Creating PM2 ecosystem configuration..."

cat > "${BROXIVA_HOME}/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'broxiva-api',
      cwd: '/opt/broxiva/backend',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_file: '/opt/broxiva/backend/.env',
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/broxiva/backend/error.log',
      out_file: '/var/log/broxiva/backend/out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 10000,
      listen_timeout: 10000,
      shutdown_with_message: true
    },
    {
      name: 'broxiva-web',
      cwd: '/opt/broxiva/frontend',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      env_file: '/opt/broxiva/frontend/.env',
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/broxiva/frontend/error.log',
      out_file: '/var/log/broxiva/frontend/out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 5000
    }
  ]
};
EOF

log_success "PM2 ecosystem file created"

#===============================================================================
# Run Database Migrations
#===============================================================================
log_info "Running database migrations..."

cd "${BROXIVA_HOME}/backend"
sudo -u broxiva npx prisma migrate deploy

log_success "Database migrations completed"

#===============================================================================
# Start Applications with PM2
#===============================================================================
log_info "Starting applications with PM2..."

# Stop existing processes if any
sudo -u broxiva pm2 delete all 2>/dev/null || true

# Start applications
cd "${BROXIVA_HOME}"
sudo -u broxiva pm2 start ecosystem.config.js

# Save PM2 process list
sudo -u broxiva pm2 save

# Configure PM2 to start on boot
pm2 startup systemd -u broxiva --hp /home/broxiva
sudo -u broxiva pm2 save

log_success "Applications started with PM2"

#===============================================================================
# Verify Deployment
#===============================================================================
log_info "Verifying deployment..."

sleep 5

# Check if processes are running
if sudo -u broxiva pm2 list | grep -q "broxiva-api" && sudo -u broxiva pm2 list | grep -q "broxiva-web"; then
    log_success "PM2 processes are running"
else
    log_error "Some PM2 processes are not running"
    sudo -u broxiva pm2 list
    exit 1
fi

# Test backend health
if curl -s http://localhost:${BACKEND_PORT}/api/health | grep -q "ok\|healthy"; then
    log_success "Backend health check passed"
else
    log_warning "Backend health check response:"
    curl -s http://localhost:${BACKEND_PORT}/api/health || echo "Failed to connect"
fi

# Test frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:${FRONTEND_PORT} | grep -q "200"; then
    log_success "Frontend is responding"
else
    log_warning "Frontend returned non-200 status"
fi

#===============================================================================
# Summary
#===============================================================================
echo ""
echo "==============================================================================="
log_success "Application Deployment Complete!"
echo "==============================================================================="
echo ""
echo "Deployment Details:"
echo "  - Backend: http://localhost:${BACKEND_PORT}"
echo "  - Frontend: http://localhost:${FRONTEND_PORT}"
echo "  - PM2 Ecosystem: ${BROXIVA_HOME}/ecosystem.config.js"
echo ""
echo "PM2 Commands:"
echo "  - View logs: pm2 logs"
echo "  - View status: pm2 status"
echo "  - Restart all: pm2 restart all"
echo "  - Monitor: pm2 monit"
echo ""
echo "Next Steps:"
echo "  1. Run ./05-database-migration.sh if migrating from Railway"
echo "  2. Run ./06-ssl-setup.sh to configure SSL certificates"
echo ""
