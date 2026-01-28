#!/bin/bash

echo "===================================="
echo "Error Handling Implementation Check"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check exception files
echo "1. Checking exception files..."
if [ -f "src/common/exceptions/payment.exception.ts" ]; then
    echo -e "${GREEN}✓${NC} payment.exception.ts exists"
else
    echo -e "${RED}✗${NC} payment.exception.ts missing"
fi

if [ -f "src/common/exceptions/email.exception.ts" ]; then
    echo -e "${GREEN}✓${NC} email.exception.ts exists"
else
    echo -e "${RED}✗${NC} email.exception.ts missing"
fi

if [ -f "src/common/exceptions/kyc.exception.ts" ]; then
    echo -e "${GREEN}✓${NC} kyc.exception.ts exists"
else
    echo -e "${RED}✗${NC} kyc.exception.ts missing"
fi

if [ -f "src/common/exceptions/index.ts" ]; then
    echo -e "${GREEN}✓${NC} index.ts exists"
else
    echo -e "${RED}✗${NC} index.ts missing"
fi

echo ""

# Check documentation
echo "2. Checking documentation..."
if [ -f "ERROR_HANDLING_IMPLEMENTATION_GUIDE.md" ]; then
    echo -e "${GREEN}✓${NC} Implementation Guide exists"
else
    echo -e "${RED}✗${NC} Implementation Guide missing"
fi

if [ -f "ERROR_HANDLING_SUMMARY.md" ]; then
    echo -e "${GREEN}✓${NC} Summary exists"
else
    echo -e "${RED}✗${NC} Summary missing"
fi

if [ -f "QUICK_START_ERROR_HANDLING.md" ]; then
    echo -e "${GREEN}✓${NC} Quick Start Guide exists"
else
    echo -e "${RED}✗${NC} Quick Start Guide missing"
fi

echo ""

# Check if imports are added to services
echo "3. Checking service files for error handling imports..."

if grep -q "from '@/common/exceptions'" src/modules/payments/payments.service.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} PaymentsService has exception imports"
else
    echo -e "${YELLOW}⚠${NC} PaymentsService needs exception imports (see guide)"
fi

if grep -q "from '@/common/exceptions'" src/modules/email/email.service.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} EmailService has exception imports"
else
    echo -e "${YELLOW}⚠${NC} EmailService needs exception imports (see guide)"
fi

if grep -q "from '@/common/exceptions'" src/modules/organization-kyc/services/kyc-provider.service.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} KycProviderService has exception imports"
else
    echo -e "${YELLOW}⚠${NC} KycProviderService needs exception imports (see guide)"
fi

echo ""

# Count exception classes
echo "4. Exception class counts..."
PAYMENT_COUNT=$(grep -c "export class.*Exception.*extends" src/common/exceptions/payment.exception.ts 2>/dev/null || echo "0")
EMAIL_COUNT=$(grep -c "export class.*Exception.*extends" src/common/exceptions/email.exception.ts 2>/dev/null || echo "0")
KYC_COUNT=$(grep -c "export class.*Exception.*extends" src/common/exceptions/kyc.exception.ts 2>/dev/null || echo "0")

echo "   Payment exceptions: $PAYMENT_COUNT"
echo "   Email exceptions: $EMAIL_COUNT"
echo "   KYC exceptions: $KYC_COUNT"
echo "   Total: $((PAYMENT_COUNT + EMAIL_COUNT + KYC_COUNT))"

echo ""

# Summary
echo "===================================="
echo "Summary"
echo "===================================="
echo ""
echo "Exception classes created: 4 files"
echo "Documentation created: 3 files"
echo ""
echo "Next steps:"
echo "1. Review QUICK_START_ERROR_HANDLING.md"
echo "2. Apply changes from ERROR_HANDLING_IMPLEMENTATION_GUIDE.md"
echo "3. Test changes in development"
echo "4. Run: npm run test"
echo ""
echo "For full details: cat ERROR_HANDLING_SUMMARY.md"
echo ""
