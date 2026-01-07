# Replit Setup Instructions

If you encounter npm install issues on Replit, follow these steps:

## Option 1: Use the install script
```bash
chmod +x install.sh
./install.sh
```

## Option 2: Manual installation
```bash
# Clean up first
rm -rf node_modules package-lock.json
npm cache clean --force

# Install with legacy peer deps
npm install --legacy-peer-deps --no-audit --no-fund
```

## Option 3: If directories are locked
```bash
# Force remove node_modules
find node_modules -type d -exec chmod 755 {} \; 2>/dev/null || true
rm -rf node_modules package-lock.json

# Install
npm install --legacy-peer-deps
```

## Running the app
- Development: `npm run dev`
- Production: `npm run build && npm start`

The app will run on port 5000.

