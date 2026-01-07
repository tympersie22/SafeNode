# Quick Start: Testing SafeNode APIs with Postman

## 1. Start the Backend
```bash
cd backend
npm run dev
```
Server should start on `http://localhost:4000`

## 2. Test Register Endpoint

**Request:**
- Method: `POST`
- URL: `http://localhost:4000/api/auth/register`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "displayName": "Test User"
}
```

**Expected:** Status 200 with token and user data

## 3. Test Login Endpoint

**Request:**
- Method: `POST`
- URL: `http://localhost:4000/api/auth/login`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```

**Expected:** Status 200 with token and user data

## 4. Test Get Current User (Protected)

**Request:**
- Method: `GET`
- URL: `http://localhost:4000/api/auth/me`
- Headers: 
  - `Authorization: Bearer <token-from-login>`
  - `Content-Type: application/json`

**Expected:** Status 200 with user data

## 5. Common Issues

- **401 Unauthorized**: Token missing or invalid
- **500 Error**: Check backend console for details
- **Connection Refused**: Backend not running

See `POSTMAN_TESTING_GUIDE.md` for complete documentation.
