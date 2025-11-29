# API Testing Commands

## Quick Start

### Option 1: Node.js Script (Recommended)
```bash
npm run test:apis
```

### Option 2: Bash Script
```bash
npm run test:apis:bash
# or directly:
./test-apis.sh
```

### Option 3: Node.js Script Directly
```bash
node test-apis.js
```

### Option 4: Bash Script Directly
```bash
bash test-apis.sh
```

## Prerequisites

1. **Backend must be running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **For Bash script (optional):**
   - `curl` (usually pre-installed)
   - `jq` for pretty JSON (optional): `brew install jq` (macOS) or `apt-get install jq` (Linux)

## What Gets Tested

The script automatically tests:

1. ✅ User Registration (`POST /api/auth/register`)
2. ✅ User Login (`POST /api/auth/login`)
3. ✅ Get Current User (`GET /api/auth/me`) - requires auth
4. ✅ Token Verification (`POST /api/auth/verify`)
5. ✅ Get Vault Salt (`GET /api/user/salt`)
6. ✅ Get Latest Vault (`GET /api/vault/latest`)
7. ✅ Save Vault (`POST /api/vault`)
8. ✅ Invalid Credentials Rejection (`POST /api/auth/login` with wrong password)

## Customization

### Change Base URL
```bash
BASE_URL=http://localhost:4000 npm run test:apis
```

### Bash Script
```bash
BASE_URL=http://localhost:4000 ./test-apis.sh
```

## Output

The script will:
- Show colored output (green for pass, red for fail)
- Display JSON responses
- Show a summary at the end
- Exit with code 0 if all tests pass, 1 if any fail

## Example Output

```
========================================
SafeNode API Test Suite
========================================

Testing: User Registration
✓ User Registration (Status: 200)
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}

...

========================================
Test Summary
========================================
Passed: 8
Failed: 0
Total: 8

All tests passed! ✓
```

## Troubleshooting

### Backend Not Running
```
Error: Backend is not running on http://localhost:4000
Please start the backend with: cd backend && npm run dev
```

### Connection Refused
- Make sure backend is running on port 4000
- Check firewall settings
- Verify BASE_URL is correct

### Tests Failing
- Check backend console for detailed error messages
- Verify database is initialized (if using database adapter)
- Check environment variables in backend

