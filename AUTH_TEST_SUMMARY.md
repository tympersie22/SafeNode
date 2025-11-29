# Authentication Flow Test Suite

This document describes the comprehensive test suite for authentication and app flow.

## Test Files Created

### Frontend Tests

1. **`frontend/tests/authService.test.ts`**
   - Token management (set, get, remove)
   - `register()` function tests
   - `login()` function tests
   - `getCurrentUser()` function tests
   - Error handling and timeouts
   - Network error handling

2. **`frontend/tests/authFlow.test.tsx`**
   - Complete login flow with navigation
   - Complete signup flow with navigation
   - Mode switching (login ↔ signup)
   - Loading states during authentication
   - Error handling in forms

3. **`frontend/tests/appAuthFlow.test.tsx`**
   - App component initial load
   - Token validation on mount
   - Non-blocking auth check
   - Route handling after authentication
   - Authentication callback handling

### Backend Tests

4. **`backend/tests/e2e/auth-complete-flow.e2e.test.ts`**
   - Complete E2E authentication flow
   - Register → Login → getCurrentUser
   - Token persistence across requests
   - Response format validation
   - Error handling (invalid credentials, tokens)

## Running Tests

### Run All Authentication Tests

```bash
# Run the test script
./test-auth-flow.sh
```

### Run Frontend Tests Only

```bash
cd frontend
npm test -- authService authFlow appAuthFlow
```

### Run Backend Tests Only

```bash
cd backend
npm test -- auth auth-flow auth-complete-flow
```

### Run with Coverage

```bash
# Frontend
cd frontend
npm run test:coverage

# Backend
cd backend
npm run test:coverage
```

## Test Coverage

### Frontend Coverage

- ✅ Token storage and retrieval
- ✅ Login flow with navigation
- ✅ Signup flow with navigation
- ✅ Error handling
- ✅ Loading states
- ✅ Timeout handling
- ✅ Network error handling
- ✅ App component auth state management
- ✅ Non-blocking auth checks

### Backend Coverage

- ✅ User registration
- ✅ User login
- ✅ Token generation and validation
- ✅ getCurrentUser endpoint
- ✅ Error responses (401, 404, 500)
- ✅ Response format validation
- ✅ Token persistence
- ✅ Authorization header validation

## Test Scenarios Covered

1. **Happy Path**
   - Register new user → Get token → Login → Get user data
   - Token persists across requests
   - Navigation works after authentication

2. **Error Handling**
   - Invalid credentials
   - Invalid/expired tokens
   - Missing Authorization header
   - Network errors
   - Timeout scenarios

3. **Edge Cases**
   - Slow backend responses (non-blocking)
   - Multiple concurrent requests
   - Token format validation
   - Response structure validation

4. **Security**
   - Token validation
   - Authorization header format
   - Unauthorized access attempts

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

- Frontend tests use Vitest (fast, compatible with Vite)
- Backend tests use Jest (standard Node.js testing)
- All tests are isolated and can run in parallel
- No external dependencies required (mocked)

## Next Steps

To add more tests:

1. Add test cases to existing files
2. Create new test files following the same patterns
3. Update this document with new test coverage
4. Ensure tests pass in CI/CD pipeline

