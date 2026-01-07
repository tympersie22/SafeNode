# Postman API Testing Guide for SafeNode

## Base Configuration

**Base URL**: `http://localhost:4000`

Make sure your backend server is running:
```bash
cd backend
npm run dev
```

---

## 1. Authentication Endpoints

### 1.1 Register New User
**POST** `/api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "displayName": "Test User"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "test@example.com",
    "displayName": "Test User",
    "emailVerified": false,
    "subscriptionTier": "free",
    "subscriptionStatus": "active",
    "twoFactorEnabled": false,
    "biometricEnabled": false,
    "createdAt": 1234567890
  }
}
```

**Error Responses:**
- `400` - Validation error
- `409` - Email already exists

---

### 1.2 Login
**POST** `/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "test@example.com",
    "displayName": "Test User",
    "emailVerified": false,
    "subscriptionTier": "free",
    "subscriptionStatus": "active",
    "twoFactorEnabled": false,
    "biometricEnabled": false,
    "lastLoginAt": 1234567890
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid credentials
- `500` - Server error

---

### 1.3 Get Current User (Requires Auth)
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "id": "user-123",
  "email": "test@example.com",
  "displayName": "Test User",
  "emailVerified": false,
  "subscriptionTier": "free",
  "subscriptionStatus": "active",
  "twoFactorEnabled": false,
  "biometricEnabled": false,
  "lastLoginAt": 1234567890,
  "createdAt": 1234567890
}
```

**Error Responses:**
- `401` - Unauthorized (invalid or missing token)

---

### 1.4 Verify Token
**POST** `/api/auth/verify`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Expected Response (200):**
```json
{
  "valid": true
}
```

---

## 2. Vault Endpoints

### 2.1 Get Vault Salt
**GET** `/api/user/salt`

**Expected Response (200):**
```json
{
  "salt": "base64-encoded-salt-string"
}
```

---

### 2.2 Get Latest Vault
**GET** `/api/vault/latest?since=1234567890`

**Query Parameters:**
- `since` (optional) - Timestamp to check if vault is up to date

**Expected Response (200):**
```json
{
  "encryptedVault": "base64-encoded-encrypted-data",
  "iv": "base64-encoded-iv",
  "version": 1234567890
}
```

Or if up to date:
```json
{
  "upToDate": true,
  "version": 1234567890
}
```

---

### 2.3 Save Vault
**POST** `/api/vault`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "encryptedVault": "base64-encoded-encrypted-data",
  "iv": "base64-encoded-iv",
  "version": 1234567890,
  "salt": "base64-encoded-salt" // optional
}
```

**Expected Response (200):**
```json
{
  "ok": true,
  "version": 1234567890
}
```

---

### 2.4 Save Vault (Alias)
**POST** `/api/vault/save`

Same as `/api/vault` above.

---

## 3. Protected Vault Endpoints (Require Auth)

### 3.1 Initialize Vault
**POST** `/api/auth/vault/init`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "encryptedVault": "base64-encoded-encrypted-data",
  "iv": "base64-encoded-iv"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "version": 1234567890
}
```

---

### 3.2 Get Vault Salt (Protected)
**GET** `/api/auth/vault/salt`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Expected Response (200):**
```json
{
  "salt": "base64-encoded-salt-string"
}
```

---

### 3.3 Save Vault (Protected)
**POST** `/api/auth/vault/save`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "encryptedVault": "base64-encoded-encrypted-data",
  "iv": "base64-encoded-iv",
  "version": 1234567890
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "version": 1234567890
}
```

---

### 3.4 Get Latest Vault (Protected)
**GET** `/api/auth/vault/latest?since=1234567890`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Query Parameters:**
- `since` (optional) - Timestamp

**Expected Response (200):**
```json
{
  "encryptedVault": "base64-encoded-encrypted-data",
  "iv": "base64-encoded-iv",
  "version": 1234567890
}
```

---

## 4. Testing Workflow

### Step 1: Register a User
1. Create a new POST request to `http://localhost:4000/api/auth/register`
2. Set body to JSON with email, password, displayName
3. Send request
4. **Save the token** from the response

### Step 2: Set Up Postman Environment Variable
1. In Postman, create a new Environment (or use Global)
2. Add variable: `token` = `<paste-token-from-register-response>`
3. Save the environment

### Step 3: Test Authenticated Endpoints
1. For protected endpoints, add header:
   ```
   Authorization: Bearer {{token}}
   ```
2. Or use Postman's Authorization tab:
   - Type: Bearer Token
   - Token: `{{token}}`

### Step 4: Test Login
1. POST to `/api/auth/login` with same credentials
2. Update `token` variable with new token

### Step 5: Test Get Current User
1. GET `/api/auth/me` with Authorization header
2. Should return user data

---

## 5. Common Error Responses

### 400 Bad Request
```json
{
  "error": "validation_error",
  "message": "Invalid email or password",
  "details": [...]
}
```

### 401 Unauthorized
```json
{
  "error": "invalid_credentials",
  "message": "Invalid email or password"
}
```

Or for protected endpoints:
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

### 500 Internal Server Error
```json
{
  "error": "server_error",
  "message": "An unexpected error occurred"
}
```

---

## 6. Postman Collection Setup Tips

### Environment Variables
Create these variables:
- `base_url`: `http://localhost:4000`
- `token`: (will be set after login/register)

### Pre-request Script (for auto-token)
```javascript
// Auto-set token from previous response
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.token) {
        pm.environment.set("token", jsonData.token);
    }
}
```

### Tests Script (for validation)
```javascript
// Test for successful response
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Test for token in response
pm.test("Response has token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('token');
});
```

---

## 7. Quick Test Checklist

- [ ] Register new user → Get token
- [ ] Login with credentials → Get token
- [ ] Get current user with token → Verify user data
- [ ] Verify token → Should return valid: true
- [ ] Get vault salt → Should return salt
- [ ] Save vault → Should return success
- [ ] Get latest vault → Should return vault data
- [ ] Test invalid credentials → Should return 401
- [ ] Test missing token → Should return 401
- [ ] Test invalid token → Should return 401

---

## 8. Swagger Documentation

The backend also provides Swagger/OpenAPI documentation at:
**GET** `http://localhost:4000/docs`

This provides interactive API documentation where you can test endpoints directly.

---

## 9. Troubleshooting

### CORS Errors
- Make sure backend is running on `http://localhost:4000`
- Check that CORS is enabled in backend config

### 401 Errors
- Verify token is correctly set in Authorization header
- Check token hasn't expired (JWT tokens don't expire in dev mode by default)
- Ensure token format: `Bearer <token>` (with space)

### 500 Errors
- Check backend console logs for detailed error messages
- Verify database is initialized (if using database adapter)
- Check environment variables are set correctly

### Connection Refused
- Ensure backend server is running: `cd backend && npm run dev`
- Verify port 4000 is not in use by another application
- Check firewall settings

---

## 10. Example Postman Collection JSON

You can import this into Postman:

```json
{
  "info": {
    "name": "SafeNode API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"TestPassword123!\",\n  \"displayName\": \"Test User\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/register",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "register"]
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"TestPassword123!\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/login",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "login"]
            }
          }
        },
        {
          "name": "Get Current User",
          "request": {
            "method": "GET",
            "header": [
              {"key": "Authorization", "value": "Bearer {{token}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "url": {
              "raw": "{{base_url}}/api/auth/me",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "me"]
            }
          }
        }
      ]
    }
  ]
}
```

Save this as `SafeNode.postman_collection.json` and import into Postman.

