#!/bin/bash

# CitadelBuy Platform Setup Script
# This script sets up the development environment

set -e

echo "🚀 CitadelBuy Platform Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Installing...${NC}"
    npm install -g pnpm
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js v18+ required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Setup environment files
echo ""
echo "⚙️  Setting up environment files..."

# Backend
if [ ! -f "apps/api/.env" ]; then
    cp apps/api/.env.example apps/api/.env
    echo -e "${GREEN}✓ Created apps/api/.env${NC}"
else
    echo -e "${YELLOW}⚠ apps/api/.env already exists${NC}"
fi

# Frontend
if [ ! -f "apps/web/.env.local" ]; then
    cp apps/web/.env.example apps/web/.env.local
    echo -e "${GREEN}✓ Created apps/web/.env.local${NC}"
else
    echo -e "${YELLOW}⚠ apps/web/.env.local already exists${NC}"
fi

# Mobile
if [ ! -f "apps/mobile/.env" ]; then
    cp apps/mobile/.env.example apps/mobile/.env
    echo -e "${GREEN}✓ Created apps/mobile/.env${NC}"
else
    echo -e "${YELLOW}⚠ apps/mobile/.env already exists${NC}"
fi

# Check Docker
echo ""
echo "🐳 Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)${NC}"

    # Start Docker services
    echo ""
    read -p "Start Docker services (PostgreSQL, Redis)? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Starting Docker services..."
        docker compose -f infrastructure/docker/docker-compose.yml up -d
        echo -e "${GREEN}✓ Docker services started${NC}"

        # Wait for services to be ready
        echo "Waiting for services to be ready..."
        sleep 5
    fi
else
    echo -e "${YELLOW}⚠ Docker not found. You'll need to set up PostgreSQL and Redis manually.${NC}"
fi

# Database setup
echo ""
read -p "Run database migrations? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running database migrations..."
    cd apps/api
    pnpm prisma generate
    pnpm prisma migrate dev --name init
    cd ../..
    echo -e "${GREEN}✓ Database migrations complete${NC}"
fi

# Seed database
echo ""
read -p "Seed database with sample data? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    cd apps/api
    pnpm prisma db seed
    cd ../..
    echo -e "${GREEN}✓ Database seeded${NC}"
fi

# Build packages
echo ""
echo "🔨 Building shared packages..."
pnpm build:packages

echo ""
echo "================================"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review and update environment files"
echo "  2. Run 'pnpm dev' to start development servers"
echo "  3. Visit http://localhost:3000 for the web app"
echo "  4. API available at http://localhost:4000/api"
echo ""
