# SafeNode Debugging System

Quick start guide for the automated debugging tool.

## Quick Commands

```bash
# Scan for issues (no fixes)
npm run fix:all

# See what would be fixed
npm run fix:dry-run

# Apply fixes automatically
npm run fix:auto

# Alias for dry-run
npm run debug:check
```

## Prerequisites

Install required dependencies:

```bash
npm install -D ts-node typescript
```

## Safety First

Always commit your work before running auto-fix:

```bash
git add .
git commit -m "Before auto-fix"
npm run fix:auto
git diff  # Review changes
```

For detailed documentation, see [runFixes.md](./runFixes.md).

