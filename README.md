# 🔐 SafeNode

<div align="center">
  <img src="https://via.placeholder.com/200x200/8B5CF6/FFFFFF?text=SafeNode" alt="SafeNode Logo" width="120" height="120">
  
  **Your Zero-Knowledge, Beautifully Designed Password Vault**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
</div>

## ✨ Features

### 🔒 **Zero-Knowledge Security**
- **AES-256-GCM Encryption**: Military-grade encryption for your passwords
- **Argon2id Key Derivation**: Protection against brute-force attacks
- **Local-First**: Your data never leaves your device unencrypted
- **Zero-Knowledge Architecture**: Even we can't see your passwords

### 🎨 **Beautiful Design**
- **Glass Morphism UI**: Modern, premium interface with Apple-level smoothness
- **Dark/Light Mode Ready**: Elegant theming system
- **Responsive Design**: Perfect on desktop, tablet, and mobile
- **Smooth Animations**: Delightful micro-interactions powered by Framer Motion

### 🚀 **Multi-Platform Support**
- **🌐 Web App**: Modern PWA with offline support
- **🖥️ Desktop App**: Native Tauri application for macOS, Windows, and Linux
- **🔌 Browser Extension**: Quick access and auto-fill capabilities

### 🛡️ **Security Features**
- **Breach Monitoring**: Real-time password breach checking via HIBP
- **Password Strength Analysis**: Intelligent password scoring and suggestions
- **TOTP Support**: Built-in 2FA code generation
- **Secure Sharing**: End-to-end encrypted password sharing
- **Key Rotation**: Easy master password changes

### 🔧 **Developer Experience**
- **TypeScript**: Full type safety across the entire codebase
- **Modern Stack**: React 18, Vite, Tailwind CSS, Framer Motion
- **Clean Architecture**: Modular, maintainable code structure
- **Comprehensive Testing**: Unit and integration tests

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/safenode.git
   cd safenode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   # Backend (API server)
   cd backend && npm run dev
   
   # Frontend (Web app)
   cd frontend && npm run dev_old
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

### Demo Credentials
- **Email**: `demo@safenode.app`
- **Password**: `demo-password`
- **Sample Data**: Pre-loaded with example entries

## 🏗️ Architecture

### Frontend Stack
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety and better developer experience
- **Vite**: Lightning-fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Production-ready motion library
- **Tauri**: Secure, lightweight desktop app framework

### Backend Stack
- **Fastify**: High-performance Node.js web framework
- **Argon2id**: Secure password hashing
- **Web Crypto API**: Browser-native encryption
- **Have I Been Pwned API**: Breach monitoring integration

### Security Model
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input    │───▶│  Argon2id KDF    │───▶│  AES-256-GCM    │
│  (Password)     │    │  (Key Derivation)│    │  (Encryption)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │  Encrypted Data │
                                               │  (Local Storage)│
                                               └─────────────────┘
```

## 📱 Platform-Specific Setup

### Web Application
```bash
cd frontend
npm run dev
```
- **URL**: `http://localhost:5173`
- **Features**: Full PWA support, offline capabilities

### Desktop Application
```bash
cd src-tauri
cargo tauri dev
```
- **Platforms**: macOS, Windows, Linux
- **Features**: Native system integration, secure storage

### Browser Extension
```bash
cd extension
npm run build
```
- **Browsers**: Chrome, Firefox, Safari
- **Features**: Auto-fill, quick access, secure storage

## 🔧 Development

### Project Structure
```
SafeNode/
├── frontend/           # React web application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── crypto/     # Cryptographic utilities
│   │   ├── storage/    # Local storage management
│   │   └── sync/       # Data synchronization
│   └── package.json
├── backend/            # Node.js API server
│   ├── src/
│   │   └── index.ts    # Fastify server
│   └── package.json
├── src-tauri/          # Desktop application
│   ├── src/
│   │   └── main.rs     # Rust backend
│   └── Cargo.toml
├── extension/          # Browser extension
│   ├── manifest.json   # Extension manifest
│   └── src/           # Extension scripts
└── README.md
```

### Available Scripts

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

#### Backend
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm start           # Start production server
npm run lint        # Run ESLint
```

#### Desktop
```bash
npm run tauri:dev    # Start desktop app in dev mode
npm run tauri:build  # Build desktop app
```

### Environment Variables
Create `.env` files in the respective directories:

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=SafeNode
VITE_APP_VERSION=0.1.0
```

#### Backend (.env)
```env
PORT=4000
NODE_ENV=development
HIBP_API_URL=https://api.pwnedpasswords.com
```

## 🧪 Testing

### Run Tests
```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# E2E tests
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

## 🚀 Deployment

### Web Application (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend && vercel
```

### Desktop Application
```bash
cd src-tauri
npm run tauri:build
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🔒 Security

### Security Audit
```bash
npm audit
npm run security:audit
```

### Encryption Details
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: Argon2id with 64MB memory, 3 iterations
- **Salt**: 32-byte cryptographically secure random salt
- **IV**: 12-byte random initialization vector per encryption

### Privacy Policy
SafeNode follows a strict zero-knowledge policy:
- ✅ All encryption/decryption happens locally
- ✅ Passwords are never transmitted in plaintext
- ✅ No telemetry or analytics
- ✅ Open source and auditable

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- **ESLint**: Enforced code formatting
- **Prettier**: Consistent code style
- **TypeScript**: Strict type checking
- **Conventional Commits**: Standardized commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Have I Been Pwned**: For the breach monitoring API
- **OWASP**: For security guidelines and best practices
- **Tauri**: For the secure desktop app framework
- **React Team**: For the amazing React ecosystem
- **Tailwind CSS**: For the utility-first CSS framework

## 📞 Support

- **Documentation**: [docs.safenode.app](https://docs.safenode.app)
- **Issues**: [GitHub Issues](https://github.com/yourusername/safenode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/safenode/discussions)
- **Email**: support@safenode.app

## 🗺️ Roadmap

### v0.2.0 - Enhanced Security
- [ ] Hardware security key support (FIDO2/WebAuthn)
- [ ] Advanced breach monitoring with real-time alerts
- [ ] Password health scoring and recommendations
- [ ] Secure password sharing with expiration

### v0.3.0 - Team Features
- [ ] Team vaults and shared passwords
- [ ] Role-based access control
- [ ] Audit logs and compliance reporting
- [ ] Enterprise SSO integration

### v1.0.0 - Production Ready
- [ ] Mobile applications (iOS/Android)
- [ ] Advanced biometric authentication
- [ ] Cloud sync with end-to-end encryption
- [ ] Enterprise deployment options

---

<div align="center">
  <p>Built with ❤️ by the SafeNode team</p>
  <p>
    <a href="https://safenode.app">Website</a> •
    <a href="https://docs.safenode.app">Documentation</a> •
    <a href="https://github.com/yourusername/safenode/issues">Report Bug</a> •
    <a href="https://github.com/yourusername/safenode/discussions">Request Feature</a>
  </p>
</div>