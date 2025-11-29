#!/bin/bash

# Test Coverage Script
# Runs coverage for both frontend and backend

set -e

echo "📊 Running Test Coverage..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Frontend Coverage
echo -e "${BLUE}📱 Running Frontend Coverage...${NC}"
cd frontend || exit 1
npm run test:coverage
FRONTEND_EXIT=$?
cd .. || exit 1

if [ $FRONTEND_EXIT -eq 0 ]; then
  echo -e "${GREEN}✅ Frontend coverage complete!${NC}"
else
  echo -e "${RED}❌ Frontend coverage failed!${NC}"
fi

echo ""

# Backend Coverage
echo -e "${BLUE}🔧 Running Backend Coverage...${NC}"
cd backend || exit 1
npm run test:coverage
BACKEND_EXIT=$?
cd .. || exit 1

if [ $BACKEND_EXIT -eq 0 ]; then
  echo -e "${GREEN}✅ Backend coverage complete!${NC}"
else
  echo -e "${RED}❌ Backend coverage failed!${NC}"
fi

echo ""

# Summary
if [ $FRONTEND_EXIT -eq 0 ] && [ $BACKEND_EXIT -eq 0 ]; then
  echo -e "${GREEN}🎉 All coverage reports generated!${NC}"
  echo -e "${BLUE}Frontend: frontend/coverage/index.html${NC}"
  echo -e "${BLUE}Backend: backend/coverage/lcov-report/index.html${NC}"
  exit 0
else
  echo -e "${RED}💥 Some coverage reports failed!${NC}"
  exit 1
fi

