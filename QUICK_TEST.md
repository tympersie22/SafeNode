# Quick API Testing

## One Command to Test Everything

```bash
npm run test:apis
```

**That's it!** Make sure your backend is running first:

```bash
cd backend && npm run dev
```

Then in another terminal:

```bash
npm run test:apis
```

## What It Does

Tests all 8 main API endpoints:
- Register user
- Login
- Get current user
- Verify token
- Get vault salt
- Get latest vault
- Save vault
- Test invalid credentials

## Alternative Commands

- `node test-apis.js` - Node.js version
- `./test-apis.sh` - Bash version (requires curl)
- `npm run test:apis:bash` - Bash via npm

See `README_API_TESTING.md` for more details.
