#!/bin/bash

# Setup neo-devpack-ts for smart contract development
# Run this script once to setup the contract development environment

set -e

echo "🔧 Setting up NEO Smart Contract Development Environment"
echo "========================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this script from the project root (neo-spoon-vibe-coding-app)"
  exit 1
fi

# Create contracts directory
echo ""
echo "📁 Step 1: Creating contracts directory..."
mkdir -p contracts
cd contracts

# Clone neo-devpack-ts if not exists
if [ -d "neo-devpack-ts" ]; then
  echo "✓ neo-devpack-ts already exists"
  cd neo-devpack-ts
  git pull origin main
else
  echo "📥 Cloning neo-devpack-ts..."
  git clone https://github.com/N3developertoolkit/neo-devpack-ts.git
  cd neo-devpack-ts
fi

# Install dependencies
echo ""
echo "📦 Step 2: Installing dependencies..."
npm install

# Setup neo-express
echo ""
echo "🛠️  Step 3: Setting up Neo-Express..."
npm run setup

# Build devpack
echo ""
echo "🔨 Step 4: Building devpack..."
npm run build

# Success
echo ""
echo "✅ Setup Complete!"
echo ""
echo "📚 Next Steps:"
echo "  1. Try a sample: cd contracts/neo-devpack-ts && npx foy tank"
echo "  2. Write your contract in: contracts/neo-devpack-ts/samples/mycontract/"
echo "  3. Read docs: docs/neo-typescript-smart-contracts.md"
echo ""
echo "Happy coding! 🚀"

