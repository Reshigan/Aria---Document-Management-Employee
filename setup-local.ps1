# ARIA ERP - Complete Setup Script
# This script sets up everything needed to run ARIA ERP locally

Write-Host "🏗️  ARIA ERP - Complete Local Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = & C:/Python313/python.exe --version
    Write-Host "✅ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Installing Backend Dependencies..." -ForegroundColor Yellow
Set-Location (Join-Path $PSScriptRoot "backend")
C:/Python313/python.exe -m pip install -r requirements.txt --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some backend dependencies may have failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Installing Frontend Dependencies..." -ForegroundColor Yellow
Set-Location (Join-Path $PSScriptRoot "frontend")
npm install --legacy-peer-deps --silent
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some frontend dependencies may have failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🗄️  Initializing Database..." -ForegroundColor Yellow
Set-Location (Join-Path $PSScriptRoot "backend")
C:/Python313/python.exe simple_init.py
Write-Host ""

Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📖 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open a terminal and run: .\start-backend.ps1" -ForegroundColor White
Write-Host "   2. Open another terminal and run: .\start-frontend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access Points:" -ForegroundColor Cyan
Write-Host "   - Frontend: http://localhost:12001" -ForegroundColor White
Write-Host "   - Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "   - API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Default Login:" -ForegroundColor Cyan
Write-Host "   - Email: admin@aria.local" -ForegroundColor White
Write-Host "   - Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "For more information, see LOCAL_SETUP_GUIDE.md" -ForegroundColor Gray
