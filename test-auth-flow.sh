#!/bin/bash

# Complete Authentication Flow Test Script
# Runs all authentication-related tests

set -e

echo "🧪 Running Authentication Flow Tests..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Frontend Tests
echo -e "${BLUE}📱 Running Frontend Authentication Tests...${NC}"
cd frontend || exit 1
npm test -- authService.test.ts authFlow.test.tsx appAuthFlow.test.tsx --run
FRONTEND_EXIT=$?
cd .. || exit 1

if [ $FRONTEND_EXIT -eq 0 ]; then
  echo -e "${GREEN}✅ Frontend tests passed!${NC}"
else
  echo -e "${RED}❌ Frontend tests failed!${NC}"
fi

echo ""

# Backend Tests
echo -e "${BLUE}🔧 Running Backend Authentication Tests...${NC}"
cd backend || exit 1
npm test -- auth.test.ts integration/auth-flow.test.ts e2e/auth-complete-flow.e2e.test.ts
BACKEND_EXIT=$?
cd .. || exit 1

if [ $BACKEND_EXIT -eq 0 ]; then
  echo -e "${GREEN}✅ Backend tests passed!${NC}"
else
  echo -e "${RED}❌ Backend tests failed!${NC}"
fi

echo ""

# Summary
if [ $FRONTEND_EXIT -eq 0 ] && [ $BACKEND_EXIT -eq 0 ]; then
  echo -e "${GREEN}🎉 All authentication tests passed!${NC}"
  exit 0
else
  echo -e "${RED}💥 Some tests failed!${NC}"
  exit 1
fi

