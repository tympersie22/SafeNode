#!/bin/bash

# SafeNode Desktop Build Script
echo "🚀 Building SafeNode Desktop App..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check if Tauri CLI is available
if ! command -v npx &> /dev/null; then
    echo "❌ npm/npx is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🎨 Building frontend..."
cd frontend && npm install && npm run build && cd ..

# Build desktop app
echo "🖥️  Building desktop app..."
npx tauri build

echo "✅ Desktop app built successfully!"
echo "📁 Find your app in: src-tauri/target/release/bundle/"

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SafeNode Desktop is ready!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Run: npm run dev (to test in development)"
    echo "   2. Find built app in src-tauri/target/release/bundle/"
    echo "   3. Install system dependencies if needed"
    echo ""
    echo "🔧 Development:"
    echo "   npm run dev     - Run in development mode"
    echo "   npm run build   - Build for production"
else
    echo "❌ Build failed. Check the errors above."
    exit 1
fi
