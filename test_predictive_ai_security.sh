#!/bin/bash

# ==============================================================================
# Manual Security Test Script for /api/predictive-ai
# ==============================================================================
# This script contains curl commands to verify the authentication, RBAC,
# and tenant isolation (RLS) security layers of the predictive AI endpoint.
# 
# Usage:
# 1. Replace the tokens below with actual JWTs from the application.
# 2. Start the backend server (`npm run dev` or `npm run start`).
# 3. Execute the curl commands to verify expected HTTP status codes.

SERVER_URL="http://localhost:3000/api/predictive-ai"
TEST_VEHICLE_ID="12345678-1234-1234-1234-123456789012" # Replace with an actual vehicle ID
PAYLOAD='{
  "vehicle_id": "'$TEST_VEHICLE_ID'",
  "plate": "AB-123-CD",
  "mileage": 150000,
  "active_fault_codes": ["P0300"]
}'

echo "=============================================="
echo "TEST 1: Unauthenticated request (Expected: 401)"
echo "=============================================="
curl -X POST $SERVER_URL \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
echo -e "\n\n"

# ---

echo "=============================================="
echo "TEST 2: Authenticated but unauthorized Role (e.g. MECHANIC or DRIVER) (Expected: 403)"
echo "=============================================="
# Replace this with a valid JWT for a user with the MECHANIC or DRIVER role
MECHANIC_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mechanic_token_here.signature"

curl -X POST $SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MECHANIC_JWT" \
  -d "$PAYLOAD"
echo -e "\n\n"

# ---

echo "=============================================="
echo "TEST 3: Authorized Role but WRONG Tenant / Cross-Tenant (Expected: 403)"
echo "=============================================="
# Replace this with a valid JWT for a FLEET_MANAGER in Tenant A
# The TEST_VEHICLE_ID used above must belong to Tenant B to trigger the RLS block.
FLEET_MANAGER_TENANT_A_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fleet_manager_a_token_here.signature"

curl -X POST $SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FLEET_MANAGER_TENANT_A_JWT" \
  -d "$PAYLOAD"
echo -e "\n\n"

# ---

echo "=============================================="
echo "TEST 4: Valid Request (Expected: 200 OK or 503 if Gemini key missing)"
echo "=============================================="
# Replace this with a valid JWT for a FLEET_MANAGER in the correct tenant
VALID_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid_fleet_manager_token_here.signature"

curl -X POST $SERVER_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VALID_JWT" \
  -d "$PAYLOAD"
echo -e "\n"
