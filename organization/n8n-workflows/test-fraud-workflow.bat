@echo off
REM CitadelBuy Fraud Detection Workflow Test Script (Windows)
REM Tests all risk levels with sample data

setlocal enabledelayedexpansion

if "%N8N_WEBHOOK_URL%"=="" (
    set WEBHOOK_URL=https://n8n.citadelbuy.com/webhook/fraud-detection
) else (
    set WEBHOOK_URL=%N8N_WEBHOOK_URL%
)

echo ========================================
echo CitadelBuy Fraud Detection Test Suite
echo ========================================
echo Webhook URL: %WEBHOOK_URL%
echo.

REM Test 1: Low Risk Order
echo [32mTest 1: Low Risk Order (Expected Score: ~15)[0m
echo Description: Existing customer, corporate email, matching addresses, normal order
curl -X POST "%WEBHOOK_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"TEST-LOW-001\",\"customerId\":\"CUST-EXISTING-12345\",\"customerEmail\":\"john.doe@company.com\",\"total\":149.99,\"billingAddress\":{\"country\":\"US\",\"postalCode\":\"10001\"},\"shippingAddress\":{\"country\":\"US\",\"postalCode\":\"10001\"},\"shippingMethod\":\"standard\",\"ipAddress\":\"192.168.1.100\",\"paymentMethod\":\"stripe\",\"stripeChargeId\":\"ch_test_low_risk\"}"
echo.
timeout /t 2 /nobreak >nul

REM Test 2: Medium Risk Order
echo [33mTest 2: Medium Risk Order (Expected Score: 40-50)[0m
echo Description: New customer, free email, high value, address mismatch
curl -X POST "%WEBHOOK_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"TEST-MEDIUM-001\",\"customerId\":\"CUST-NEW-67890\",\"customerEmail\":\"customer123@gmail.com\",\"total\":749.99,\"billingAddress\":{\"country\":\"US\",\"postalCode\":\"10001\"},\"shippingAddress\":{\"country\":\"CA\",\"postalCode\":\"M5H2N2\"},\"shippingMethod\":\"standard\",\"ipAddress\":\"192.168.1.100\",\"paymentMethod\":\"stripe\",\"stripeChargeId\":\"ch_test_medium_risk\"}"
echo.
timeout /t 2 /nobreak >nul

REM Test 3: High Risk Order
echo [93mTest 3: High Risk Order (Expected Score: 70-80)[0m
echo Description: New customer, high value, high-risk country, express shipping
curl -X POST "%WEBHOOK_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"TEST-HIGH-001\",\"customerId\":\"CUST-NEW-11111\",\"customerEmail\":\"buyer@yahoo.com\",\"total\":1299.99,\"billingAddress\":{\"country\":\"US\",\"postalCode\":\"10001\"},\"shippingAddress\":{\"country\":\"NG\",\"postalCode\":\"100001\"},\"shippingMethod\":\"express\",\"ipAddress\":\"41.203.100.50\",\"paymentMethod\":\"stripe\",\"stripeChargeId\":\"ch_test_high_risk\"}"
echo.
timeout /t 2 /nobreak >nul

REM Test 4: Critical Risk Order
echo [31mTest 4: Critical Risk Order (Expected Score: 90-100)[0m
echo Description: Disposable email, high value, high-risk country, multiple risk factors
curl -X POST "%WEBHOOK_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"TEST-CRITICAL-001\",\"customerId\":\"CUST-FRAUD-99999\",\"customerEmail\":\"scammer@tempmail.com\",\"total\":2499.99,\"billingAddress\":{\"country\":\"US\",\"postalCode\":\"10001\"},\"shippingAddress\":{\"country\":\"NG\",\"postalCode\":\"100001\"},\"shippingMethod\":\"overnight\",\"ipAddress\":\"41.203.100.50\",\"paymentMethod\":\"stripe\",\"stripeChargeId\":\"ch_test_critical_risk\"}"
echo.
timeout /t 2 /nobreak >nul

REM Test 5: Edge Case - Multiple Failed Payments
echo [33mTest 5: Edge Case - Customer with Failed Payment History[0m
echo Description: Testing failed payment attempt detection
curl -X POST "%WEBHOOK_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"TEST-EDGE-001\",\"customerId\":\"CUST-FAILED-PAYMENTS\",\"customerEmail\":\"customer@gmail.com\",\"total\":399.99,\"billingAddress\":{\"country\":\"US\",\"postalCode\":\"10001\"},\"shippingAddress\":{\"country\":\"US\",\"postalCode\":\"10001\"},\"shippingMethod\":\"standard\",\"ipAddress\":\"192.168.1.100\",\"paymentMethod\":\"stripe\",\"stripeChargeId\":\"ch_test_failed_payments\"}"
echo.
timeout /t 2 /nobreak >nul

REM Test 6: Edge Case - Order Velocity
echo [33mTest 6: Edge Case - High Order Velocity[0m
echo Description: Testing order velocity detection (3rd order in 24h)
curl -X POST "%WEBHOOK_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"TEST-VELOCITY-003\",\"customerId\":\"CUST-VELOCITY-TEST\",\"customerEmail\":\"frequent@buyer.com\",\"total\":199.99,\"billingAddress\":{\"country\":\"US\",\"postalCode\":\"10001\"},\"shippingAddress\":{\"country\":\"US\",\"postalCode\":\"10001\"},\"shippingMethod\":\"standard\",\"ipAddress\":\"192.168.1.100\",\"paymentMethod\":\"stripe\",\"stripeChargeId\":\"ch_test_velocity\"}"
echo.

echo ========================================
echo Test Suite Complete
echo ========================================
echo.
echo Next Steps:
echo 1. Check Slack channels #fraud-review and #fraud-alerts for notifications
echo 2. Review Zendesk tickets for high-risk orders
echo 3. Verify order statuses in admin panel
echo 4. Check audit logs: GET /v1/audit/fraud-decisions
echo.
echo Expected Results:
echo - TEST-LOW-001:      Auto-approved (no alerts)
echo - TEST-MEDIUM-001:   Held for review (Slack #fraud-review)
echo - TEST-HIGH-001:     Manual review (Slack urgent + Zendesk)
echo - TEST-CRITICAL-001: Auto-cancelled + blocked (Slack critical)
echo - TEST-EDGE-001:     Depends on failed payment history
echo - TEST-VELOCITY-003: +25 points for velocity if ^>2 orders found
echo.

pause
