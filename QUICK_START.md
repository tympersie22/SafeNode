# SafeNode Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or use MongoDB)
- Git

### Step 1: Clone & Install
```bash
git clone <your-repo-url>
cd SafeNode

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Setup Database
```bash
cd backend

# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/safenode
DB_ADAPTER=prisma
JWT_SECRET=dev-secret-change-in-production-$(date +%s)
CORS_ORIGIN=http://localhost:5173
EOF

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### Step 3: Start Backend
```bash
# In backend directory
npm run dev
# Server starts on http://localhost:4000
```

### Step 4: Start Frontend
```bash
# In frontend directory (new terminal)
cd frontend

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:4000
EOF

# Start dev server
npm run dev
# Opens on http://localhost:5173
```

### Step 5: Test It Out!
1. Open http://localhost:5173
2. Click "Get Started" or "Sign Up"
3. Create an account
4. Set your master password
5. Add your first password entry

## 🎯 Common Commands

### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Run production build
npm test             # Run tests
npm run db:studio    # Open Prisma Studio (database GUI)
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
```

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql postgresql://user:password@localhost:5432/safenode
```

### Port Already in Use
```bash
# Backend (default: 4000)
PORT=4001 npm run dev

# Frontend (default: 5173)
# Vite will automatically use next available port
```

### Module Not Found Errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps

- Read [README.md](./README.md) for full documentation
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Check [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for feature status

## 💡 Development Tips

1. **Database GUI**: Use `npm run db:studio` to visually browse/edit data
2. **Hot Reload**: Both frontend and backend support hot reload
3. **Type Safety**: Use `npm run type-check` to verify TypeScript types
4. **Linting**: Use `npm run lint` to check code quality

## 🆘 Need Help?

- Check the [README.md](./README.md) for detailed documentation
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- Check existing issues or create a new one

Happy coding! 🎉

