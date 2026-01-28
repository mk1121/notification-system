#!/bin/bash

# Notification System Test Suite
# This script runs all tests for the notification system

set -e

echo "=========================================="
echo "NOTIFICATION SYSTEM TEST SUITE"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
print_section() {
    echo -e "\n${BLUE}>>> $1${NC}\n"
}

test_case() {
    echo -n "  [$((TOTAL_TESTS+1))] $1 ... "
    TOTAL_TESTS=$((TOTAL_TESTS+1))
}

pass() {
    echo -e "${GREEN}PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS+1))
}

fail() {
    echo -e "${RED}FAIL${NC}: $1"
    FAILED_TESTS=$((FAILED_TESTS+1))
}

# Configuration
GATEWAY_URL="http://localhost:9090"
CONTROL_URL="http://localhost:3000"
API_KEY="test-secret-key-12345"

export API_KEY

print_section "1. ENVIRONMENT SETUP"

test_case "Check Node.js version"
if node --version > /dev/null 2>&1; then
    pass
else
    fail "Node.js not installed"
fi

test_case "Check npm packages installed"
if [ -d "node_modules" ]; then
    pass
else
    fail "Run npm install first"
    exit 1
fi

print_section "2. GATEWAY AUTHENTICATION TESTS"

test_case "Gateway health check (no auth required)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$GATEWAY_URL/")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" = "200" ]; then
    pass
else
    fail "Got HTTP $HTTP_CODE"
fi

test_case "Valid API Key authentication"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" \
    "$GATEWAY_URL/api/admin/kill-switch")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    pass
else
    fail "Got HTTP $HTTP_CODE"
fi

test_case "Invalid API Key returns 401"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: wrong-key" \
    "$GATEWAY_URL/api/admin/kill-switch")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    pass
else
    fail "Expected 401, got $HTTP_CODE"
fi

test_case "Missing API Key returns 401"
RESPONSE=$(curl -s -w "\n%{http_code}" \
    "$GATEWAY_URL/api/admin/kill-switch")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    pass
else
    fail "Expected 401, got $HTTP_CODE"
fi

print_section "3. KILL SWITCH TESTS"

test_case "Get kill switch status"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" \
    "$GATEWAY_URL/api/admin/kill-switch")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    pass
else
    fail "Got HTTP $HTTP_CODE"
fi

test_case "Disable gateway kill switch"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"gateway": false}' \
    "$GATEWAY_URL/api/admin/kill-switch")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    pass
else
    fail "Got HTTP $HTTP_CODE"
fi

test_case "SMS endpoint returns 503 when disabled"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" \
    "$GATEWAY_URL/api/sms/send?to=01234567890&text=test")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "503" ]; then
    pass
else
    fail "Expected 503, got $HTTP_CODE"
fi

test_case "Re-enable gateway kill switch"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"gateway": true}' \
    "$GATEWAY_URL/api/admin/kill-switch")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    pass
else
    fail "Got HTTP $HTTP_CODE"
fi

print_section "4. GATEWAY VALIDATION TESTS"

test_case "SMS send requires phone number"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" \
    "$GATEWAY_URL/api/sms/send?text=test")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    pass
else
    fail "Expected 400, got $HTTP_CODE"
fi

test_case "SMS send requires message text"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" \
    "$GATEWAY_URL/api/sms/send?to=01234567890")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    pass
else
    fail "Expected 400, got $HTTP_CODE"
fi

test_case "Email send requires recipient"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"subject": "Test", "text": "Test"}' \
    "$GATEWAY_URL/api/email/send")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    pass
else
    fail "Expected 400, got $HTTP_CODE"
fi

test_case "Email send requires subject"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"to": "test@example.com", "text": "Test"}' \
    "$GATEWAY_URL/api/email/send")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    pass
else
    fail "Expected 400, got $HTTP_CODE"
fi

print_section "5. CONTROL SERVER TESTS"

test_case "Control server health check"
RESPONSE=$(curl -s -w "\n%{http_code}" "$CONTROL_URL/" -L)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    pass
else
    fail "Got HTTP $HTTP_CODE"
fi

test_case "Setup UI requires login"
RESPONSE=$(curl -s -w "\n%{http_code}" "$CONTROL_URL/setup/ui")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    pass
else
    fail "Expected redirect, got $HTTP_CODE"
fi

test_case "Endpoints UI requires login"
RESPONSE=$(curl -s -w "\n%{http_code}" "$CONTROL_URL/endpoints/ui")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    pass
else
    fail "Expected redirect, got $HTTP_CODE"
fi

print_section "6. CONFIG & STATE TESTS"

test_case "Config file exists"
if [ -f "controllerServer/config-state.json" ] || [ -f "controllerServer/config-store.js" ]; then
    pass
else
    fail "Config file not found"
fi

test_case "Notification state file exists"
if [ -f "controllerServer/notification-state.json" ]; then
    pass
else
    fail "State file not found"
fi

test_case "Environment file exists"
if [ -f ".env" ]; then
    pass
else
    fail ".env file not found"
fi

print_section "7. FILE STRUCTURE TESTS"

test_case "Core files exist"
FILES=(
    "controllerServer/server.js"
    "controllerServer/control-server.js"
    "controllerServer/scheduler.js"
    "controllerServer/email.js"
    "controllerServer/sms.js"
    "controllerServer/logger.js"
    "controllerServer/console-logger.js"
    "email-sms-gateway/server.js"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        ALL_EXIST=false
        break
    fi
done

if [ "$ALL_EXIST" = true ]; then
    pass
else
    fail "Some core files missing"
fi

test_case "Documentation files exist"
DOCS=(
    "email-sms-gateway/docs/AUTHENTICATION.md"
    "email-sms-gateway/docs/KILL_SWITCH.md"
)

ALL_DOCS_EXIST=true
for doc in "${DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
        ALL_DOCS_EXIST=false
        break
    fi
done

if [ "$ALL_DOCS_EXIST" = true ]; then
    pass
else
    fail "Some documentation missing"
fi

print_section "TEST SUMMARY"

echo -e "Total Tests:   ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:        ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:        ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
