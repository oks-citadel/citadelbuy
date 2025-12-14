#!/bin/bash

# Broxiva Final Migration Script
# This script performs the final renaming from CitadelBuy to Broxiva

set -e

echo "========================================="
echo "Broxiva Final Migration Script"
echo "========================================="
echo ""

# Change to organization directory
cd "$(dirname "$0")"

echo "Step 1: Updating package.json files..."
# Update package.json files (excluding node_modules and .expo cache)
find . -name "package.json" -type f ! -path "*/node_modules/*" ! -path "*/.expo/*" ! -path "*/.next/*" -exec sed -i 's/@citadelbuy/@broxiva/g' {} \;
find . -name "package.json" -type f ! -path "*/node_modules/*" ! -path "*/.expo/*" ! -path "*/.next/*" -exec sed -i 's/citadelbuy-backend/broxiva-backend/g' {} \;
find . -name "package.json" -type f ! -path "*/node_modules/*" ! -path "*/.expo/*" ! -path "*/.next/*" -exec sed -i 's/CitadelBuy/Broxiva/g' {} \;
find . -name "package.json" -type f ! -path "*/node_modules/*" ! -path "*/.expo/*" ! -path "*/.next/*" -exec sed -i 's/citadelbuy/broxiva/g' {} \;

echo "Step 2: Updating mobile app configuration files..."
# Update app.json and app.config.json
for file in apps/mobile/app.json apps/mobile/app.config.json apps/mobile/eas.json; do
    if [ -f "$file" ]; then
        sed -i 's/CitadelBuy/Broxiva/g' "$file"
        sed -i 's/citadelbuy/broxiva/g' "$file"
        sed -i 's/com\.citadelbuy\.app/com.broxiva.app/g' "$file"
    fi
done

echo "Step 3: Updating TypeScript source files..."
# Update TS/TSX files
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .expo | grep -v .next | while read file; do
    sed -i 's/citadelbuy_access_token/broxiva_access_token/g' "$file"
    sed -i 's/citadelbuy_refresh_token/broxiva_refresh_token/g' "$file"
    sed -i 's/citadelbuy_language/broxiva_language/g' "$file"
    sed -i 's/CITADELBUY_LANG/BROXIVA_LANG/g' "$file"
    sed -i 's/citadelbuy_session_id/broxiva_session_id/g' "$file"
    sed -i 's/@citadelbuy\.com/@broxiva.com/g' "$file"
    sed -i 's/admin@citadelbuy/admin@broxiva/g' "$file"
    sed -i 's/customer@citadelbuy/customer@broxiva/g' "$file"
    sed -i 's/test@citadelbuy/test@broxiva/g' "$file"
    sed -i 's/CitadelBuy/Broxiva/g' "$file"
    sed -i 's/class CitadelBuyAI/class BroxivaAI/g' "$file"
    sed -i 's/export default CitadelBuyAI/export default BroxivaAI/g' "$file"
    sed -i '/ \* CitadelBuy/s/CitadelBuy/Broxiva/g' "$file"
    sed -i 's/Utility functions for CitadelBuy/Utility functions for Broxiva/g' "$file"
    sed -i 's/for CitadelBuy/for Broxiva/g' "$file"
done

echo "Step 4: Updating Terraform files..."
# Update Terraform files
find infrastructure -name "*.tf" | while read file; do
    sed -i 's/CitadelBuy/Broxiva/g' "$file"
    sed -i 's/citadelbuy/broxiva/g' "$file"
    sed -i 's/citadelbuy_admin/broxiva_admin/g' "$file"
    sed -i 's/postgres\.${var\.environment}\.citadelbuy\.internal/postgres.${var.environment}.broxiva.internal/g' "$file"
    sed -i 's/redis\.${var\.environment}\.citadelbuy\.internal/redis.${var.environment}.broxiva.internal/g' "$file"
done

echo "Step 5: Updating YAML/YML configuration files..."
# Update YAML files
find . -name "*.yml" -o -name "*.yaml" | grep -v node_modules | while read file; do
    sed -i 's/citadelbuy/broxiva/g' "$file"
    sed -i 's/CitadelBuy/Broxiva/g' "$file"
    sed -i 's/citadelbuyacr/broxivaacr/g' "$file"
    sed -i 's/citadelbuy-/broxiva-/g' "$file"
    sed -i 's/citadelcloudmanagement\/CitadelBuy/citadelcloudmanagement\/Broxiva/g' "$file"
    sed -i 's/staging\.citadelbuy\.com/staging.broxiva.com/g' "$file"
    sed -i 's/www\.citadelbuy\.com/www.broxiva.com/g' "$file"
    sed -i 's/citadelbuy\.com/broxiva.com/g' "$file"
    sed -i 's/CITADELBUY/BROXIVA/g' "$file"
done

echo "Step 6: Updating Vault policies..."
# Update Vault HCL files
find infrastructure/vault -name "*.hcl" | while read file; do
    sed -i 's/citadelbuy/broxiva/g' "$file"
    sed -i 's/CitadelBuy/Broxiva/g' "$file"
done

echo "Step 7: Updating Docker and Nginx configuration..."
# Update docker-compose files
find infrastructure/docker -name "docker-compose*.yml" | while read file; do
    sed -i 's/citadelbuy/broxiva/g' "$file"
    sed -i 's/CitadelBuy/Broxiva/g' "$file"
    sed -i 's/com\.citadelbuy\./com.broxiva./g' "$file"
done

# Update Nginx configs
find infrastructure -name "*.conf" | while read file; do
    sed -i 's/citadelbuy/broxiva/g' "$file"
    sed -i 's/CitadelBuy/Broxiva/g' "$file"
done

echo "Step 8: Updating shell scripts..."
# Update shell scripts
find scripts -name "*.sh" | while read file; do
    sed -i 's/citadelbuy/broxiva/g' "$file"
    sed -i 's/CitadelBuy/Broxiva/g' "$file"
    sed -i 's/CITADELBUY/BROXIVA/g' "$file"
done

echo "Step 9: Updating PowerShell scripts..."
# Update PowerShell scripts
find scripts -name "*.ps1" | while read file; do
    sed -i 's/citadelbuy/broxiva/g' "$file"
    sed -i 's/CitadelBuy/Broxiva/g' "$file"
    sed -i 's/CITADELBUY/BROXIVA/g' "$file"
done

echo "Step 10: Updating test files..."
# Update test configuration files
find tests -name "*.json" -o -name "*.js" -o -name "*.ts" | while read file; do
    sed -i 's/citadelbuy/broxiva/g' "$file"
    sed -i 's/CitadelBuy/Broxiva/g' "$file"
    sed -i 's/citadelbuy_/broxiva_/g' "$file"
done

echo ""
echo "========================================="
echo "Migration Complete!"
echo "========================================="
echo ""
echo "Files updated successfully."
echo "Note: .expo cache files were excluded and can be regenerated."
echo ""
echo "Next steps:"
echo "1. Review the changes with: git diff"
echo "2. Run: pnpm install (to update lock files)"
echo "3. Run tests to verify everything works"
echo "4. Commit the changes"
echo ""
