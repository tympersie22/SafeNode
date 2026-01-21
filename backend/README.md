# SafeNode Backend

Backend server for SafeNode password manager.

## Development Commands

### Starting the Server
```bash
# Standard start (with automatic port check)
npm run dev

# Clean start (kills old processes first)
npm run dev:clean

# Restart (stop and start)
npm run restart
```

### Process Management
```bash
# Check running backend processes
npm run status

# Stop all backend processes (graceful)
npm run kill

# Force stop (if graceful doesn't work)
npm run kill:force
```

### Troubleshooting

**Problem:** "Port 4000 is already in use"

**Solution:**
```bash
# Option 1: Clean restart
npm run dev:clean

# Option 2: Manual cleanup
npm run kill
npm run dev

# Option 3: Force kill everything
npm run kill:force
lsof -ti:4000 | xargs kill -9
npm run dev
```

**Problem:** Multiple processes running

**Solution:**
```bash
# Check what's running
npm run status

# Kill all backend processes
killall node
# OR
npm run kill:force

# Start fresh
npm run dev
```

## Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run seed

# Open Prisma Studio
npm run db:studio
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 4000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `PASSWORD_PEPPER` - Password hashing pepper
- `SEED_ON_BOOT` - Auto-seed on startup (development)

