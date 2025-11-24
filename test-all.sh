#!/bin/bash

echo "🧪 SafeNode Comprehensive Test Suite"
echo "===================================="
echo ""

# Check if servers are running
echo "📡 Checking server status..."
BACKEND_RUNNING=$(lsof -ti:3000 2>/dev/null)
FRONTEND_RUNNING=$(lsof -ti:5173 2>/dev/null)

if [ -z "$BACKEND_RUNNING" ]; then
    echo "❌ Backend not running on port 3000"
    echo "   Start with: cd backend && npm run dev"
else
    echo "✅ Backend running (PID: $BACKEND_RUNNING)"
fi

if [ -z "$FRONTEND_RUNNING" ]; then
    echo "❌ Frontend not running on port 5173"
    echo "   Start with: cd frontend && npm run dev"
else
    echo "✅ Frontend running (PID: $FRONTEND_RUNNING)"
fi

echo ""
echo "🌐 Access Points:"
echo "   Web App: http://localhost:5173"
echo "   Backend API: http://localhost:3000"
echo ""
echo "📋 Testing Checklist:"
echo "   1. Open http://localhost:5173 in Safari (for Touch ID)"
echo "   2. Sign up / Login"
echo "   3. Unlock vault (password: demo-password)"
echo "   4. Test biometric setup (👆 Biometric button)"
echo "   5. Test all features from TESTING_GUIDE.md"
echo ""
echo "💡 Tip: Use Safari on macOS for full Touch ID support"
