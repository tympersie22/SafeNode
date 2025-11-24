# 🔐 SafeNode

**A complete, production-ready, zero-knowledge password manager with Web, Mobile, Desktop, and SaaS infrastructure.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.0-green.svg)](https://www.fastify.io/)

## ✨ Features

### 🔒 Core Security
- **Zero-Knowledge Architecture**: Your master password never leaves your device
- **Argon2id + AES-256-GCM**: Military-grade encryption
- **Two-Factor Authentication**: TOTP support with backup codes
- **Biometric Unlock**: Face ID, Touch ID, Windows Hello support
- **Breach Monitoring**: Integration with HaveIBeenPwned API
- **Password Health Dashboard**: Strength analysis, reuse detection, breach alerts

### 💼 Business Features
- **Team Vaults**: Shared vaults with RBAC (owner/admin/manager/member/viewer)
- **Audit Logging**: Complete activity tracking with CSV export
- **Device Management**: Track and manage registered devices
- **Subscription Plans**: Free, Individual, Family, Teams, Business tiers
- **Stripe Integration**: Full billing and subscription management

### 🎨 User Experience
- **Beautiful SaaS UI**: Modern design with SafeNode Design System
- **Dark Mode**: Full dark mode support
- **Smooth Animations**: Framer Motion for web, Reanimated for mobile
- **Responsive Design**: Works seamlessly on all devices
- **Travel Mode**: Hide vault entries when traveling

### 🔧 Developer Experience
- **TypeScript**: Full type safety across the stack
- **Hot Reload**: Fast development experience
- **Testing**: Jest (backend) + Vitest (frontend)
- **CI/CD**: GitHub Actions workflows
- **Error Tracking**: Sentry integration
- **Security**: Rate limiting, Helmet, input validation

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+ 
- **PostgreSQL** 15+ (or MongoDB)
- **Rust** (for desktop builds)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/SafeNode.git
cd SafeNode
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. **Set up database**
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

4. **Start development servers**

**Backend** (Terminal 1):
```bash
cd backend
npm run dev
```

**Frontend** (Terminal 2):
```bash
cd frontend

# Create .env file
echo "VITE_API_URL=http://localhost:4000" > .env

npm run dev
```

5. **Open your browser**
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Prisma Studio: `cd backend && npm run db:studio`

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](./QUICK_START.md)** - Get running in 5 minutes
- **[Environment Variables](./.env.example)** - All configuration options

### Pre-Production
- **[Mega Prompt](./MEGA_PROMPT.md)** - Copy/paste prompt for Cursor to complete all tasks
- **[Execution Roadmap](./EXECUTION_ROADMAP.md)** - Step-by-step guide to complete pre-production tasks
- **[Incomplete Features](./INCOMPLETE_FEATURES.md)** - What's partially implemented and needs completion
- **[Production Checklist](./PRODUCTION_CHECKLIST.md)** - Pre-launch checklist

### Deployment & Operations
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Billing Setup Guide](./BILLING_SETUP.md)** - Stripe integration and billing configuration
- **[Post-Completion Guide](./POST_COMPLETION_GUIDE.md)** - What to do after completing all tasks

## 🏗️ Project Structure

```
SafeNode/
├── backend/              # Fastify API server
│   ├── src/
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Auth, rate limiting, security
│   │   ├── db/         # Database adapters (Prisma/MongoDB)
│   │   └── models/     # Type definitions
│   ├── prisma/         # Database schema & migrations
│   └── tests/          # Backend tests (Jest)
│
├── frontend/            # React web application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API clients
│   │   ├── crypto/     # Encryption utilities
│   │   ├── ui/         # UI component library
│   │   └── icons/      # SVG icon components
│   └── tests/          # Frontend tests (Vitest)
│
├── mobile/              # React Native app (Expo)
├── src-tauri/           # Desktop app (Tauri)
└── .github/workflows/   # CI/CD pipelines
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Query** - Data fetching (optional)

### Backend
- **Fastify** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM (PostgreSQL/MySQL)
- **MongoDB** - Alternative database adapter
- **Argon2** - Password hashing
- **JWT** - Authentication
- **Stripe** - Payment processing

### Infrastructure
- **PostgreSQL** - Primary database
- **MongoDB** - Alternative database
- **Sentry** - Error tracking
- **GitHub Actions** - CI/CD
- **Vercel/Railway** - Hosting options

## 🔐 Security Features

- ✅ **Zero-Knowledge Architecture** - Server never sees plaintext passwords
- ✅ **Argon2id Key Derivation** - Memory-hard password hashing
- ✅ **AES-256-GCM Encryption** - Authenticated encryption
- ✅ **Rate Limiting** - Protection against brute force
- ✅ **Security Headers** - Helmet.js integration
- ✅ **Input Validation** - Zod schema validation
- ✅ **SQL Injection Protection** - Prisma ORM
- ✅ **XSS Protection** - React's built-in escaping
- ✅ **CORS Configuration** - Restricted origins
- ✅ **Audit Logging** - Complete activity tracking

## 📊 Available Scripts

### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Run production build
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run type-check   # Type check without building
npm run lint         # Lint code
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio (database GUI)
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
npm run type-check   # Type check without building
npm run lint         # Lint code
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Test coverage
cd backend && npm run test:coverage
cd frontend && npm run test:coverage
```

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

**Backend** (Railway/Render):
```bash
cd backend
npm run build
npm start
```

**Frontend** (Vercel):
```bash
cd frontend
npm run build
# Deploy dist/ folder
```

## 🔑 Environment Variables

See [.env.example](./.env.example) for all required environment variables.

### Backend (.env)
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
DB_ADAPTER=prisma
JWT_SECRET=your-strong-secret-min-32-chars
STRIPE_SECRET_KEY=sk_live_...
CORS_ORIGIN=https://safenode.app
SENTRY_DSN=https://...
```

### Frontend (.env)
```env
VITE_API_URL=https://api.safenode.app
VITE_SENTRY_DSN=https://...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [HaveIBeenPwned](https://haveibeenpwned.com/) - Breach data API
- [Fastify](https://www.fastify.io/) - Web framework
- [Prisma](https://www.prisma.io/) - Database toolkit
- [Stripe](https://stripe.com/) - Payment processing
- [Sentry](https://sentry.io/) - Error tracking

## 📞 Support

- **Documentation**: Check [QUICK_START.md](./QUICK_START.md) and [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues**: Open an issue on GitHub
- **Security**: Report security issues privately

## 🎯 Roadmap

- [ ] Mobile app (iOS/Android)
- [ ] Desktop app (Windows/macOS/Linux)
- [ ] Marketing website
- [ ] Biometric ML enhancements
- [ ] Advanced password sharing
- [ ] Browser extensions

---

**Built with ❤️ by the SafeNode team**
