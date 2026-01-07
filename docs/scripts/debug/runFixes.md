# SafeNode Automated Debugging System

## Overview

The SafeNode debugging system automatically scans your project for common errors and can apply fixes automatically. It checks for:

- Missing imports
- Type mismatches
- Invalid Tailwind classes
- Unhandled promises
- Unused variables
- React hook order violations
- Incorrect API endpoints
- Missing environment variables
- Backend route mismatches

## Installation

The debugging script is located at `/scripts/debug/fixConsoleErrors.ts` and requires:

- Node.js 16+
- TypeScript (`ts-node` package)
- Access to project files

## Usage

### Basic Scan (No Fixes)

Run a scan to identify issues without applying fixes:

```bash
npm run fix:all
```

Or directly:

```bash
npx ts-node scripts/debug/fixConsoleErrors.ts
```

### Dry Run Mode

See what would be fixed without actually applying changes:

```bash
npx ts-node scripts/debug/fixConsoleErrors.ts --dry-run
```

### Automatic Fix Mode

Automatically apply fixes (use with caution):

```bash
npx ts-node scripts/debug/fixConsoleErrors.ts --fix
```

## How It Works

### 1. Scanning Phase

The debugger scans:
- `/frontend/src` - React/TypeScript frontend code
- `/backend/src` - Backend API code
- `/mobile/src` - React Native mobile code

### 2. Detection Phase

The tool checks for:

#### Missing Imports
- Scans for common imports (React, framer-motion, etc.)
- Identifies missing dependencies
- Suggests correct import statements

#### Type Errors
- Runs TypeScript compiler in check mode
- Parses error output
- Categorizes errors by type

#### Invalid Tailwind Classes
- Checks for deprecated color classes (purple-*)
- Suggests brand/accent color alternatives
- Validates class names against Tailwind config

#### Unhandled Promises
- Detects async functions without await
- Finds fetch/axios calls without error handling
- Suggests adding .catch() or try/catch

#### React Hooks
- Detects hooks inside conditions
- Checks for hooks order violations
- Suggests proper hook usage

#### API Endpoints
- Finds hardcoded API URLs
- Suggests using environment variables
- Validates endpoint consistency

#### Environment Variables
- Checks .env.example for required variables
- Validates .env file structure
- Suggests missing variables

### 3. Reporting Phase

The tool generates a detailed report showing:
- File paths with issues
- Line numbers (when available)
- Error descriptions
- Suggested fixes

### 4. Fix Application Phase (Optional)

When `--fix` flag is used:
- Applies fixes automatically
- Modifies files in place
- Creates backups (recommended to use git)

## Example Output

```
🔍 SafeNode Debugger Starting...

Project Root: /Users/ibnally/Desktop/SafeNode
Auto-fix: DISABLED
Dry Run: NO

📁 Scanned 45 files in frontend/src
📁 Scanned 23 files in backend/src
📁 Scanned 12 files in mobile/src

🔎 Checking for missing imports...
🔎 Checking for type errors...
❌ Type errors found:
frontend/src/components/Vault.tsx(23,5): error TS2304: Cannot find name 'useVault'.

🔎 Checking for invalid Tailwind classes...
🔎 Checking for unhandled promises...

============================================================
📊 DEBUGGING RESULTS
============================================================

Found 1 potential issue(s):

📄 frontend/src/components/Vault.tsx
   1. Line 23: TS2304: Cannot find name 'useVault'
      💡 Fix: Add missing import or declare variable

💡 Run with --fix flag to automatically apply fixes
```

## Safety Guidelines

### Before Running Auto-Fix

1. **Commit Your Work**
   ```bash
   git add .
   git commit -m "Before auto-fix"
   ```

2. **Create a Branch**
   ```bash
   git checkout -b fix/auto-debug-fixes
   ```

3. **Review Changes**
   ```bash
   git diff
   ```

### After Running Auto-Fix

1. **Review All Changes**
   ```bash
   git status
   git diff
   ```

2. **Test Your Application**
   ```bash
   npm run dev
   npm run test
   ```

3. **Commit Safely**
   ```bash
   git add .
   git commit -m "Fix: Auto-applied debugging fixes"
   ```

## Checking Diff Before Applying

### Manual Review

1. Run in dry-run mode first:
   ```bash
   npx ts-node scripts/debug/fixConsoleErrors.ts --dry-run > debug-report.txt
   ```

2. Review the report:
   ```bash
   cat debug-report.txt
   ```

3. Apply fixes selectively:
   ```bash
   npx ts-node scripts/debug/fixConsoleErrors.ts --fix
   ```

4. Review changes:
   ```bash
   git diff
   ```

### Using Git

Always use git to track changes:

```bash
# Before fixes
git status

# Run fixes
npx ts-node scripts/debug/fixConsoleErrors.ts --fix

# Review changes
git diff

# Stage specific files
git add frontend/src/components/FixedComponent.tsx

# Or stage all
git add .

# Commit
git commit -m "Fix: Applied automated debugging fixes"
```

## Safely Committing Changes

### Best Practices

1. **Small, Focused Commits**
   ```bash
   # Fix one type of issue at a time
   git add frontend/src/components/
   git commit -m "Fix: Resolve missing imports in components"
   ```

2. **Descriptive Commit Messages**
   ```bash
   git commit -m "Fix: Auto-fix TypeScript errors in Vault component

   - Added missing useVault import
   - Fixed type mismatches
   - Updated Tailwind classes to use brand colors"
   ```

3. **Test Before Committing**
   ```bash
   npm run type-check
   npm run lint
   npm run test
   ```

4. **Review Before Pushing**
   ```bash
   git log --oneline -5
   git show HEAD
   ```

## Integration with Package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "fix:all": "ts-node scripts/debug/fixConsoleErrors.ts",
    "fix:dry-run": "ts-node scripts/debug/fixConsoleErrors.ts --dry-run",
    "fix:auto": "ts-node scripts/debug/fixConsoleErrors.ts --fix",
    "debug:check": "npm run fix:dry-run"
  }
}
```

Then run:

```bash
npm run fix:all          # Scan only
npm run fix:dry-run      # See what would be fixed
npm run fix:auto         # Apply fixes automatically
npm run debug:check      # Alias for dry-run
```

## Limitations

The current implementation is a foundation. For production use, consider:

1. **AST-Based Analysis**: Use TypeScript compiler API or Babel for accurate code analysis
2. **ESLint Integration**: Integrate with ESLint for more comprehensive checks
3. **Incremental Fixes**: Apply fixes one at a time with user confirmation
4. **Backup System**: Automatically create backups before applying fixes
5. **Undo Functionality**: Track changes for easy rollback

## Troubleshooting

### Script Not Found

```bash
# Install dependencies
npm install

# Install ts-node globally if needed
npm install -g ts-node typescript
```

### Permission Errors

```bash
# Make script executable
chmod +x scripts/debug/fixConsoleErrors.ts
```

### TypeScript Errors in Script

```bash
# Check TypeScript version
npx tsc --version

# Update if needed
npm install -D typescript@latest
```

## Advanced Usage

### Custom Configuration

Create a `debug.config.json`:

```json
{
  "scanPaths": [
    "frontend/src",
    "backend/src",
    "mobile/src"
  ],
  "excludePaths": [
    "node_modules",
    "dist",
    "build"
  ],
  "checks": {
    "missingImports": true,
    "typeErrors": true,
    "tailwindClasses": true,
    "unhandledPromises": true
  }
}
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/debug.yml
name: Debug Check
on: [push, pull_request]
jobs:
  debug:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run fix:dry-run
```

## Support

For issues or questions:
1. Check the error output carefully
2. Review the suggested fixes
3. Test changes in a separate branch
4. Consult the SafeNode documentation

---

**Remember**: Always review automated fixes before committing. The tool is a helper, not a replacement for code review.

