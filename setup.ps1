# Nexora AED Platform - Quick Setup Script
# This script sets up the development environment for the Nexora UI/UX Design System

Write-Host "🚀 Nexora AED Platform - UI/UX Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

# Install dependencies
try {
    npm install
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Setting up development environment..." -ForegroundColor Yellow

# Create environment file if it doesn't exist
if (!(Test-Path ".env.local")) {
    @"
# Nexora AED Platform - Development Environment
NEXT_PUBLIC_APP_NAME=Nexora AED Platform
NEXT_PUBLIC_APP_VERSION=1.2.0
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080/ws
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_ENABLE_ANALYTICS=false
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local file" -ForegroundColor Green
} else {
    Write-Host "✅ .env.local already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎨 Nexora UI/UX Design System Setup Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Quick Start Commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Development Server:" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host "    Open: http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "  Component Development:" -ForegroundColor White
Write-Host "    npm run storybook" -ForegroundColor Gray
Write-Host "    Open: http://localhost:6006" -ForegroundColor Gray
Write-Host ""
Write-Host "  Testing:" -ForegroundColor White
Write-Host "    npm test                    # Run tests" -ForegroundColor Gray
Write-Host "    npm run accessibility       # Accessibility tests" -ForegroundColor Gray
Write-Host "    npm run lint                # Code quality" -ForegroundColor Gray
Write-Host ""
Write-Host "  Production Build:" -ForegroundColor White
Write-Host "    npm run build" -ForegroundColor Gray
Write-Host "    npm run start" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  - README.md                  # Complete setup guide" -ForegroundColor Gray
Write-Host "  - docs/DESIGN_SYSTEM_SUMMARY.md  # Design system overview" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Key Features Implemented:" -ForegroundColor Cyan
Write-Host "  ✅ Security-First Design System" -ForegroundColor Green
Write-Host "  ✅ Dark Mode Optimized UI" -ForegroundColor Green
Write-Host "  ✅ WCAG 2.1 AA Accessibility" -ForegroundColor Green
Write-Host "  ✅ Main Dashboard" -ForegroundColor Green
Write-Host "  ✅ Identity Inventory" -ForegroundColor Green
Write-Host "  ✅ Threat Detection Center" -ForegroundColor Green
Write-Host "  ✅ Reusable UI Components" -ForegroundColor Green
Write-Host "  ✅ TypeScript + Tailwind CSS" -ForegroundColor Green
Write-Host ""
Write-Host "Ready to start development! Run 'npm run dev' to begin." -ForegroundColor Yellow
Write-Host ""
