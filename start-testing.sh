#!/bin/bash

echo "🚀 SafeNode Testing Environment Setup"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend is running
BACKEND_PID=$(lsof -ti:4000 2>/dev/null)
if [ -z "$BACKEND_PID" ]; then
    echo -e "${YELLOW}⚠️  Backend not running on port 4000${NC}"
    echo "Starting backend..."
    cd backend
    npm run dev > /tmp/safenode-backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Backend starting (PID: $BACKEND_PID)${NC}"
    echo "   Logs: tail -f /tmp/safenode-backend.log"
    sleep 3
else
    echo -e "${GREEN}✅ Backend already running (PID: $BACKEND_PID)${NC}"
fi

# Check if frontend is running
FRONTEND_PID=$(lsof -ti:5173 2>/dev/null)
if [ -z "$FRONTEND_PID" ]; then
    echo -e "${YELLOW}⚠️  Frontend not running on port 5173${NC}"
    echo "Starting frontend..."
    cd frontend
    npm run dev > /tmp/safenode-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ Frontend starting (PID: $FRONTEND_PID)${NC}"
    echo "   Logs: tail -f /tmp/safenode-frontend.log"
    sleep 3
else
    echo -e "${GREEN}✅ Frontend already running (PID: $FRONTEND_PID)${NC}"
fi

echo ""
echo "🌐 Access Points:"
echo -e "   ${GREEN}Web App:${NC} http://localhost:5173"
echo -e "   ${GREEN}Backend API:${NC} http://localhost:4000"
echo ""
echo "📋 Testing Steps:"
echo "   1. Open Safari: http://localhost:5173"
echo "   2. Login with: demo-password"
echo "   3. Click '👆 Biometric' to setup Touch ID"
echo "   4. Follow QUICK_TEST.md for full testing"
echo ""
echo "💡 Tip: Use Safari for Touch ID support on macOS"
echo ""
echo "📝 View logs:"
echo "   Backend:  tail -f /tmp/safenode-backend.log"
echo "   Frontend: tail -f /tmp/safenode-frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"

