#!/bin/bash
set -e

echo "🧹 Cleaning up existing node_modules..."
rm -rf node_modules package-lock.json 2>/dev/null || true

echo "🔧 Cleaning npm cache..."
npm cache clean --force || true

echo "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps --no-audit --no-fund

echo "✅ Installation complete!"

