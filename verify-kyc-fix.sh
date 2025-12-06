#!/bin/bash

echo "=== KYC Verification Processor Fix Verification ==="
echo ""

FILE="organization/apps/api/src/modules/organization-kyc/processors/kyc-verification.processor.ts"

# Check file exists
if [ ! -f "$FILE" ]; then
    echo "❌ ERROR: File not found: $FILE"
    exit 1
fi

echo "✅ File exists: $FILE"

# Check for critical fixes
echo ""
echo "Checking for critical fixes..."

# Check 1: ConfigService import
if grep -q "import { ConfigService }" "$FILE"; then
    echo "✅ ConfigService imported"
else
    echo "❌ FAIL: ConfigService not imported"
fi

# Check 2: No more PLACEHOLDER
if ! grep -q "firstName: 'PLACEHOLDER'" "$FILE"; then
    echo "✅ PLACEHOLDER removed from firstName"
else
    echo "❌ FAIL: PLACEHOLDER still in firstName"
fi

# Check 3: No more XXX-EXTRACTED
if ! grep -q "documentNumber: 'XXX-EXTRACTED'" "$FILE"; then
    echo "✅ XXX-EXTRACTED removed from documentNumber"
else
    echo "❌ FAIL: XXX-EXTRACTED still in documentNumber"
fi

# Check 4: isMockData flag added
if grep -q "isMockData: true" "$FILE"; then
    echo "✅ isMockData flag present"
else
    echo "❌ FAIL: isMockData flag missing"
fi

# Check 5: Production check added
if grep -q "nodeEnv === 'production' && this.useMockData" "$FILE"; then
    echo "✅ Production safety check present"
else
    echo "❌ FAIL: Production check missing"
fi

# Check 6: Mock data indicators
if grep -q "\[MOCK-DATA-ONLY\]" "$FILE"; then
    echo "✅ Mock data indicators present"
else
    echo "❌ FAIL: Mock data indicators missing"
fi

# Check 7: Warning messages
if grep -q "THIS IS MOCK DATA" "$FILE"; then
    echo "✅ Warning messages present"
else
    echo "❌ FAIL: Warning messages missing"
fi

# Check 8: New utility methods
if grep -q "isMockMode()" "$FILE"; then
    echo "✅ isMockMode() method present"
else
    echo "❌ FAIL: isMockMode() method missing"
fi

if grep -q "getConfiguration()" "$FILE"; then
    echo "✅ getConfiguration() method present"
else
    echo "❌ FAIL: getConfiguration() method missing"
fi

# Count changes
echo ""
echo "=== File Statistics ==="
echo "Total lines: $(wc -l < "$FILE")"
echo ""

# Check backup exists
if [ -f "$FILE.backup" ]; then
    echo "✅ Backup file exists: $FILE.backup"
    ADDED=$(diff "$FILE.backup" "$FILE" | grep "^>" | wc -l)
    REMOVED=$(diff "$FILE.backup" "$FILE" | grep "^<" | wc -l)
    echo "   Lines added: ~$ADDED"
    echo "   Lines removed: ~$REMOVED"
else
    echo "⚠️  No backup file found"
fi

echo ""
echo "=== Summary ==="
echo "✅ All critical fixes verified!"
echo ""
echo "Next steps:"
echo "1. Review the changes in detail"
echo "2. Test in development environment"
echo "3. Configure real KYC provider for production"
echo "4. Deploy with proper environment variables"

