#!/bin/bash

# SafeNode API Testing Script
# Tests all authentication and vault endpoints

set -e

BASE_URL="${BASE_URL:-http://localhost:4000}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_DISPLAY_NAME="Test User $(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to print test result
print_result() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $message"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $message"
        ((FAILED++))
    fi
}

# Function to make API request
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    local headers=(-H "Content-Type: application/json")
    if [ -n "$token" ]; then
        headers+=(-H "Authorization: Bearer $token")
    fi
    
    if [ -n "$data" ]; then
        curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            "${headers[@]}" \
            -d "$data" 2>/dev/null
    else
        curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            "${headers[@]}" 2>/dev/null
    fi
}

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local token=$5
    local expected_status=$6
    
    echo -e "${BLUE}Testing: $name${NC}"
    
    local response=$(api_request "$method" "$endpoint" "$data" "$token")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        print_result "PASS" "$name (Status: $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        echo ""
        echo "$body"
    else
        print_result "FAIL" "$name (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
        echo ""
        echo "$body"
    fi
    
    return 0
}

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: Backend is not running on $BASE_URL${NC}"
    echo "Please start the backend with: cd backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}Backend is running!${NC}\n"

# Check if jq is installed (for pretty JSON)
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. JSON output will not be formatted.${NC}"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    echo ""
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SafeNode API Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Register
echo -e "${YELLOW}[1/8] Testing User Registration${NC}"
REGISTER_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD",
  "displayName": "$TEST_DISPLAY_NAME"
}
EOF
)

REGISTER_RESPONSE=$(api_request "POST" "/api/auth/register" "$REGISTER_DATA" "")
REGISTER_HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$REGISTER_HTTP_CODE" = "200" ]; then
    print_result "PASS" "User Registration (Status: $REGISTER_HTTP_CODE)"
    TOKEN=$(echo "$REGISTER_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")
    USER_ID=$(echo "$REGISTER_BODY" | grep -o '"id":"[^"]*' | cut -d'"' -f4 || echo "")
    if [ -n "$TOKEN" ]; then
        echo -e "${GREEN}Token received: ${TOKEN:0:50}...${NC}"
    fi
    echo "$REGISTER_BODY" | jq '.' 2>/dev/null || echo "$REGISTER_BODY"
else
    print_result "FAIL" "User Registration (Expected: 200, Got: $REGISTER_HTTP_CODE)"
    echo "Response: $REGISTER_BODY"
    # Try to extract token anyway (might be 409 if user exists)
    TOKEN=$(echo "$REGISTER_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")
fi
echo ""

# If registration failed, try login instead
if [ -z "$TOKEN" ] || [ "$REGISTER_HTTP_CODE" != "200" ]; then
    echo -e "${YELLOW}Registration failed or user exists. Trying login...${NC}"
    LOGIN_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)
    LOGIN_RESPONSE=$(api_request "POST" "/api/auth/login" "$LOGIN_DATA" "")
    LOGIN_HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
    LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')
    
    if [ "$LOGIN_HTTP_CODE" = "200" ]; then
        TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")
        if [ -n "$TOKEN" ]; then
            echo -e "${GREEN}Login successful! Token received.${NC}"
        fi
    else
        echo -e "${RED}Both registration and login failed. Cannot continue.${NC}"
        exit 1
    fi
    echo ""
fi

# Test 2: Login
echo -e "${YELLOW}[2/8] Testing User Login${NC}"
LOGIN_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)

LOGIN_RESPONSE=$(api_request "POST" "/api/auth/login" "$LOGIN_DATA" "")
LOGIN_HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$LOGIN_HTTP_CODE" = "200" ]; then
    print_result "PASS" "User Login (Status: $LOGIN_HTTP_CODE)"
    # Update token from login
    NEW_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")
    if [ -n "$NEW_TOKEN" ]; then
        TOKEN="$NEW_TOKEN"
        echo -e "${GREEN}Token updated from login${NC}"
    fi
    echo "$LOGIN_BODY" | jq '.' 2>/dev/null || echo "$LOGIN_BODY"
else
    print_result "FAIL" "User Login (Expected: 200, Got: $LOGIN_HTTP_CODE)"
    echo "Response: $LOGIN_BODY"
fi
echo ""

# Test 3: Get Current User (requires auth)
echo -e "${YELLOW}[3/8] Testing Get Current User${NC}"
if [ -z "$TOKEN" ]; then
    print_result "FAIL" "Get Current User (No token available)"
else
    ME_RESPONSE=$(api_request "GET" "/api/auth/me" "" "$TOKEN")
    ME_HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
    ME_BODY=$(echo "$ME_RESPONSE" | sed '$d')
    
    if [ "$ME_HTTP_CODE" = "200" ]; then
        print_result "PASS" "Get Current User (Status: $ME_HTTP_CODE)"
        echo "$ME_BODY" | jq '.' 2>/dev/null || echo "$ME_BODY"
    else
        print_result "FAIL" "Get Current User (Expected: 200, Got: $ME_HTTP_CODE)"
        echo "Response: $ME_BODY"
    fi
fi
echo ""

# Test 4: Verify Token
echo -e "${YELLOW}[4/8] Testing Token Verification${NC}"
if [ -z "$TOKEN" ]; then
    print_result "FAIL" "Token Verification (No token available)"
else
    VERIFY_DATA=$(cat <<EOF
{
  "token": "$TOKEN"
}
EOF
)
    VERIFY_RESPONSE=$(api_request "POST" "/api/auth/verify" "$VERIFY_DATA" "")
    VERIFY_HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
    VERIFY_BODY=$(echo "$VERIFY_RESPONSE" | sed '$d')
    
    if [ "$VERIFY_HTTP_CODE" = "200" ]; then
        print_result "PASS" "Token Verification (Status: $VERIFY_HTTP_CODE)"
        echo "$VERIFY_BODY" | jq '.' 2>/dev/null || echo "$VERIFY_BODY"
    else
        print_result "FAIL" "Token Verification (Expected: 200, Got: $VERIFY_HTTP_CODE)"
        echo "Response: $VERIFY_BODY"
    fi
fi
echo ""

# Test 5: Get Vault Salt
echo -e "${YELLOW}[5/8] Testing Get Vault Salt${NC}"
SALT_RESPONSE=$(api_request "GET" "/api/user/salt" "" "")
SALT_HTTP_CODE=$(echo "$SALT_RESPONSE" | tail -n1)
SALT_BODY=$(echo "$SALT_RESPONSE" | sed '$d')

if [ "$SALT_HTTP_CODE" = "200" ]; then
    print_result "PASS" "Get Vault Salt (Status: $SALT_HTTP_CODE)"
    echo "$SALT_BODY" | jq '.' 2>/dev/null || echo "$SALT_BODY"
else
    print_result "FAIL" "Get Vault Salt (Expected: 200, Got: $SALT_HTTP_CODE)"
    echo "Response: $SALT_BODY"
fi
echo ""

# Test 6: Get Latest Vault
echo -e "${YELLOW}[6/8] Testing Get Latest Vault${NC}"
VAULT_RESPONSE=$(api_request "GET" "/api/vault/latest" "" "")
VAULT_HTTP_CODE=$(echo "$VAULT_RESPONSE" | tail -n1)
VAULT_BODY=$(echo "$VAULT_RESPONSE" | sed '$d')

if [ "$VAULT_HTTP_CODE" = "200" ]; then
    print_result "PASS" "Get Latest Vault (Status: $VAULT_HTTP_CODE)"
    echo "$VAULT_BODY" | jq '.' 2>/dev/null || echo "$VAULT_BODY"
else
    print_result "FAIL" "Get Latest Vault (Expected: 200, Got: $VAULT_HTTP_CODE)"
    echo "Response: $VAULT_BODY"
fi
echo ""

# Test 7: Save Vault
echo -e "${YELLOW}[7/8] Testing Save Vault${NC}"
SAVE_VAULT_DATA=$(cat <<EOF
{
  "encryptedVault": "dGVzdC1lbmNyeXB0ZWQtdmF1bHQtZGF0YQ==",
  "iv": "dGVzdC1pdi1kYXRh",
  "version": $(date +%s)
}
EOF
)

SAVE_RESPONSE=$(api_request "POST" "/api/vault" "$SAVE_VAULT_DATA" "")
SAVE_HTTP_CODE=$(echo "$SAVE_RESPONSE" | tail -n1)
SAVE_BODY=$(echo "$SAVE_RESPONSE" | sed '$d')

if [ "$SAVE_HTTP_CODE" = "200" ]; then
    print_result "PASS" "Save Vault (Status: $SAVE_HTTP_CODE)"
    echo "$SAVE_BODY" | jq '.' 2>/dev/null || echo "$SAVE_BODY"
else
    print_result "FAIL" "Save Vault (Expected: 200, Got: $SAVE_HTTP_CODE)"
    echo "Response: $SAVE_BODY"
fi
echo ""

# Test 8: Test Invalid Credentials
echo -e "${YELLOW}[8/8] Testing Invalid Credentials (Should Fail)${NC}"
INVALID_LOGIN_DATA=$(cat <<EOF
{
  "email": "invalid@example.com",
  "password": "WrongPassword123!"
}
EOF
)

INVALID_RESPONSE=$(api_request "POST" "/api/auth/login" "$INVALID_LOGIN_DATA" "")
INVALID_HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
INVALID_BODY=$(echo "$INVALID_RESPONSE" | sed '$d')

if [ "$INVALID_HTTP_CODE" = "401" ]; then
    print_result "PASS" "Invalid Credentials Rejected (Status: $INVALID_HTTP_CODE)"
    echo "$INVALID_BODY" | jq '.' 2>/dev/null || echo "$INVALID_BODY"
else
    print_result "FAIL" "Invalid Credentials (Expected: 401, Got: $INVALID_HTTP_CODE)"
    echo "Response: $INVALID_BODY"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please check the output above.${NC}"
    exit 1
fi

