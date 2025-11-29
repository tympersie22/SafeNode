#!/usr/bin/env node

/**
 * SafeNode API Testing Script (Node.js version)
 * Tests all authentication and vault endpoints
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_DISPLAY_NAME = `Test User ${Date.now()}`;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let passed = 0;
let failed = 0;
let token = '';

// Helper function to make HTTP requests
function makeRequest(method, endpoint, data = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, raw: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test function
async function test(name, method, endpoint, data, expectedStatus, authToken = null) {
  process.stdout.write(`${colors.blue}Testing: ${name}${colors.reset}\n`);
  
  try {
    const response = await makeRequest(method, endpoint, data, authToken);
    const success = response.status === expectedStatus;
    
    if (success) {
      console.log(`${colors.green}✓${colors.reset} ${name} (Status: ${response.status})`);
      console.log(JSON.stringify(response.data, null, 2));
      passed++;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${name} (Expected: ${expectedStatus}, Got: ${response.status})`);
      console.log('Response:', response.raw);
      failed++;
    }
    console.log('');
    return response;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name} (Error: ${error.message})`);
    console.log('');
    failed++;
    return null;
  }
}

// Check if backend is running
async function checkBackend() {
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status === 200) {
      console.log(`${colors.green}Backend is running!${colors.reset}\n`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}Error: Backend is not running on ${BASE_URL}${colors.reset}`);
    console.log('Please start the backend with: cd backend && npm run dev\n');
    return false;
  }
  return false;
}

// Main test suite
async function runTests() {
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}SafeNode API Test Suite${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}\n`);

  // Check backend
  if (!(await checkBackend())) {
    process.exit(1);
  }

  // Test 1: Register
  console.log(`${colors.yellow}[1/8] Testing User Registration${colors.reset}`);
  const registerResponse = await test(
    'User Registration',
    'POST',
    '/api/auth/register',
    {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: TEST_DISPLAY_NAME,
    },
    200
  );

  if (registerResponse && registerResponse.data.token) {
    token = registerResponse.data.token;
    console.log(`${colors.green}Token received: ${token.substring(0, 50)}...${colors.reset}\n`);
  } else if (registerResponse && registerResponse.status === 409) {
    // User exists, try login
    console.log(`${colors.yellow}User exists, trying login...${colors.reset}\n`);
    const loginResponse = await test(
      'User Login (after failed registration)',
      'POST',
      '/api/auth/login',
      {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
      200
    );
    if (loginResponse && loginResponse.data.token) {
      token = loginResponse.data.token;
    }
  }

  // Test 2: Login
  console.log(`${colors.yellow}[2/8] Testing User Login${colors.reset}`);
  const loginResponse = await test(
    'User Login',
    'POST',
    '/api/auth/login',
    {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
    200
  );

  if (loginResponse && loginResponse.data.token) {
    token = loginResponse.data.token;
  }

  // Test 3: Get Current User
  console.log(`${colors.yellow}[3/8] Testing Get Current User${colors.reset}`);
  if (token) {
    await test('Get Current User', 'GET', '/api/auth/me', null, 200, token);
  } else {
    console.log(`${colors.red}✗${colors.reset} Get Current User (No token available)\n`);
    failed++;
  }

  // Test 4: Verify Token
  console.log(`${colors.yellow}[4/8] Testing Token Verification${colors.reset}`);
  if (token) {
    await test(
      'Token Verification',
      'POST',
      '/api/auth/verify',
      { token },
      200
    );
  } else {
    console.log(`${colors.red}✗${colors.reset} Token Verification (No token available)\n`);
    failed++;
  }

  // Test 5: Get Vault Salt
  console.log(`${colors.yellow}[5/8] Testing Get Vault Salt${colors.reset}`);
  await test('Get Vault Salt', 'GET', '/api/user/salt', null, 200);

  // Test 6: Get Latest Vault
  console.log(`${colors.yellow}[6/8] Testing Get Latest Vault${colors.reset}`);
  await test('Get Latest Vault', 'GET', '/api/vault/latest', null, 200);

  // Test 7: Save Vault
  console.log(`${colors.yellow}[7/8] Testing Save Vault${colors.reset}`);
  await test(
    'Save Vault',
    'POST',
    '/api/vault',
    {
      encryptedVault: 'dGVzdC1lbmNyeXB0ZWQtdmF1bHQtZGF0YQ==',
      iv: 'dGVzdC1pdi1kYXRh',
      version: Date.now(),
    },
    200
  );

  // Test 8: Invalid Credentials
  console.log(`${colors.yellow}[8/8] Testing Invalid Credentials (Should Fail)${colors.reset}`);
  await test(
    'Invalid Credentials Rejected',
    'POST',
    '/api/auth/login',
    {
      email: 'invalid@example.com',
      password: 'WrongPassword123!',
    },
    401
  );

  // Summary
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${passed + failed}\n`);

  if (failed === 0) {
    console.log(`${colors.green}All tests passed! ✓${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}Some tests failed. Please check the output above.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
});

