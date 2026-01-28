#!/bin/bash

# Quick Test Runner - Start both servers and run all tests
# Usage: bash tests/quick-test.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   NOTIFICATION SYSTEM - QUICK TEST RUNNER  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

# Configuration
API_KEY="${API_KEY:-test-secret-key-12345}"
GATEWAY_URL="http://localhost:9090"
CONTROL_URL="http://localhost:3000"

export API_KEY
export GATEWAY_URL
export CONTROL_URL

# Check if servers are already running
echo -e "${YELLOW}Checking if servers are running...${NC}\n"

GATEWAY_RUNNING=false
CONTROL_RUNNING=false

if curl -s "$GATEWAY_URL/" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Gateway is running on port 9090"
    GATEWAY_RUNNING=true
else
    echo -e "${RED}✗${NC} Gateway not running on port 9090"
fi

if curl -s "$CONTROL_URL/" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Control Server is running on port 3000"
    CONTROL_RUNNING=true
else
    echo -e "${RED}✗${NC} Control Server not running on port 3000"
fi

echo ""

# If servers not running, start them
if [ "$GATEWAY_RUNNING" = false ] || [ "$CONTROL_RUNNING" = false ]; then
    echo -e "${YELLOW}Starting servers...${NC}\n"
    
    PIDS=()
    
    if [ "$GATEWAY_RUNNING" = false ]; then
        echo "Starting Gateway Server..."
        (cd email-sms-gateway && npm start > /tmp/gateway.log 2>&1) &
        GATEWAY_PID=$!
        PIDS+=($GATEWAY_PID)
        echo "  PID: $GATEWAY_PID"
    fi
    
    if [ "$CONTROL_RUNNING" = false ]; then
        echo "Starting Control Server..."
        (cd controllerServer && npm start > /tmp/control.log 2>&1) &
        CONTROL_PID=$!
        PIDS+=($CONTROL_PID)
        echo "  PID: $CONTROL_PID"
    fi
    
    echo ""
    echo -e "${YELLOW}Waiting for servers to start (5 seconds)...${NC}\n"
    sleep 5
    
    # Verify servers started
    if ! curl -s "$GATEWAY_URL/" > /dev/null 2>&1; then
        echo -e "${RED}✗ Gateway failed to start${NC}"
        echo "  Log: /tmp/gateway.log"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Gateway started"
    
    if ! curl -s "$CONTROL_URL/" > /dev/null 2>&1; then
        echo -e "${RED}✗ Control Server failed to start${NC}"
        echo "  Log: /tmp/control.log"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Control Server started\n"
else
    PIDS=()
fi

# Run tests
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}Running Test Suites${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}\n"

TOTAL_FAILED=0

# Test 1: Integration Tests
echo -e "${YELLOW}[1/3] Running Integration Tests...${NC}\n"
if bash tests/run-tests.sh; then
    echo -e "${GREEN}✓ Integration Tests: PASSED${NC}\n"
else
    echo -e "${RED}✗ Integration Tests: FAILED${NC}\n"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

# Test 2: Gateway Tests
echo -e "${YELLOW}[2/3] Running Gateway Tests...${NC}\n"
if node tests/gateway-tests.js; then
    echo -e "${GREEN}✓ Gateway Tests: PASSED${NC}\n"
else
    echo -e "${RED}✗ Gateway Tests: FAILED${NC}\n"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

# Test 3: Control Server Tests
echo -e "${YELLOW}[3/3] Running Control Server Tests...${NC}\n"
if node tests/control-server-tests.js; then
    echo -e "${GREEN}✓ Control Server Tests: PASSED${NC}\n"
else
    echo -e "${RED}✗ Control Server Tests: FAILED${NC}\n"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

# Summary
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}\n"

if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}\n"
else
    echo -e "${RED}✗ $TOTAL_FAILED test suite(s) failed${NC}\n"
fi

# Cleanup
if [ ${#PIDS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Stopping servers...${NC}\n"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping PID: $pid"
            kill "$pid" 2>/dev/null || true
        fi
    done
    echo ""
fi

echo -e "${BLUE}Test run complete!${NC}\n"

exit $TOTAL_FAILED
