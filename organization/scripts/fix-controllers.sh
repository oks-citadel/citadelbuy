#!/bin/bash

# Script to add AuthRequest import and fix all @Request() req parameters in controllers

CONTROLLERS=(
  "citadelbuy/backend/src/modules/inventory/inventory.controller.ts"
  "citadelbuy/backend/src/modules/mobile/mobile.controller.ts"
  "citadelbuy/backend/src/modules/platform/platform.controller.ts"
  "citadelbuy/backend/src/modules/security/security.controller.ts"
  "citadelbuy/backend/src/modules/social/social.controller.ts"
  "citadelbuy/backend/src/modules/support/support.controller.ts"
  "citadelbuy/backend/src/modules/tax/tax.controller.ts"
  "citadelbuy/backend/src/modules/vendors/vendors.controller.ts"
)

for controller in "${CONTROLLERS[@]}"; do
  echo "Processing $controller..."

  # Check if AuthRequest import already exists
  if ! grep -q "import.*AuthRequest.*from.*@/common/types/auth-request.types" "$controller"; then
    # Find the last import line and add AuthRequest import after it
    sed -i "/^import.*from '@prisma\/client';$/a import { AuthRequest, OptionalAuthRequest } from '@/common/types/auth-request.types';" "$controller"
  fi

  # Fix all @Request() req parameters (with JwtAuthGuard - use AuthRequest)
  # This is a simple replacement - might need manual review
  sed -i 's/@Request() req,/@Request() req: AuthRequest,/g' "$controller"
  sed -i 's/@Request() req)/@Request() req: AuthRequest)/g' "$controller"

  echo "Done with $controller"
done

echo "All controllers processed!"
