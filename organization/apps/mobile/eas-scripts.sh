#!/bin/bash

# Broxiva EAS Build Scripts
# Common commands for building and deploying the mobile app

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Broxiva EAS Build Scripts${NC}"
echo ""

# Function to display menu
show_menu() {
    echo "Select an option:"
    echo "1) Build Development (iOS)"
    echo "2) Build Development (Android)"
    echo "3) Build Development (Both)"
    echo ""
    echo "4) Build Preview (iOS)"
    echo "5) Build Preview (Android)"
    echo "6) Build Preview (Both)"
    echo ""
    echo "7) Build Production (iOS)"
    echo "8) Build Production (Android)"
    echo "9) Build Production (Both)"
    echo ""
    echo "10) Submit to App Store (iOS)"
    echo "11) Submit to Play Store (Android)"
    echo ""
    echo "12) Deploy Update (Development)"
    echo "13) Deploy Update (Preview)"
    echo "14) Deploy Update (Production)"
    echo ""
    echo "15) View Build Status"
    echo "16) Manage Credentials"
    echo "17) Clear Build Cache"
    echo ""
    echo "0) Exit"
    echo ""
}

# Development Builds
build_dev_ios() {
    echo -e "${GREEN}Building Development iOS...${NC}"
    eas build --profile development --platform ios
}

build_dev_android() {
    echo -e "${GREEN}Building Development Android...${NC}"
    eas build --profile development --platform android
}

build_dev_both() {
    echo -e "${GREEN}Building Development (iOS & Android)...${NC}"
    eas build --profile development --platform all
}

# Preview Builds
build_preview_ios() {
    echo -e "${GREEN}Building Preview iOS...${NC}"
    eas build --profile preview --platform ios
}

build_preview_android() {
    echo -e "${GREEN}Building Preview Android...${NC}"
    eas build --profile preview --platform android
}

build_preview_both() {
    echo -e "${GREEN}Building Preview (iOS & Android)...${NC}"
    eas build --profile preview --platform all
}

# Production Builds
build_prod_ios() {
    echo -e "${YELLOW}Building Production iOS...${NC}"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        eas build --profile production --platform ios
    fi
}

build_prod_android() {
    echo -e "${YELLOW}Building Production Android...${NC}"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        eas build --profile production --platform android
    fi
}

build_prod_both() {
    echo -e "${YELLOW}Building Production (iOS & Android)...${NC}"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        eas build --profile production --platform all
    fi
}

# Submit to Stores
submit_ios() {
    echo -e "${GREEN}Submitting to App Store...${NC}"
    eas submit --platform ios --latest
}

submit_android() {
    echo -e "${GREEN}Submitting to Play Store...${NC}"
    eas submit --platform android --latest
}

# OTA Updates
update_dev() {
    echo -e "${GREEN}Deploying Update to Development...${NC}"
    read -p "Enter update message: " message
    eas update --branch development --message "$message"
}

update_preview() {
    echo -e "${GREEN}Deploying Update to Preview...${NC}"
    read -p "Enter update message: " message
    eas update --branch preview --message "$message"
}

update_prod() {
    echo -e "${YELLOW}Deploying Update to Production...${NC}"
    read -p "Enter update message: " message
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        eas update --branch production --message "$message"
    fi
}

# Utility Functions
view_builds() {
    echo -e "${BLUE}Recent Builds:${NC}"
    eas build:list
}

manage_credentials() {
    echo -e "${BLUE}Managing Credentials:${NC}"
    eas credentials
}

clear_cache() {
    echo -e "${YELLOW}Clearing Build Cache...${NC}"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        eas build --clear-cache --profile development --platform all
    fi
}

# Main loop
while true; do
    show_menu
    read -p "Enter choice: " choice

    case $choice in
        1) build_dev_ios ;;
        2) build_dev_android ;;
        3) build_dev_both ;;
        4) build_preview_ios ;;
        5) build_preview_android ;;
        6) build_preview_both ;;
        7) build_prod_ios ;;
        8) build_prod_android ;;
        9) build_prod_both ;;
        10) submit_ios ;;
        11) submit_android ;;
        12) update_dev ;;
        13) update_preview ;;
        14) update_prod ;;
        15) view_builds ;;
        16) manage_credentials ;;
        17) clear_cache ;;
        0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac

    echo ""
    read -p "Press enter to continue..."
    clear
done
