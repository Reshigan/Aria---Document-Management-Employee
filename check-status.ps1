# ARIA ERP - System Status Check
# Run this to verify your local setup

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "   ARIA ERP - Status Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Backend
Write-Host "Checking Backend (Port 8000)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✅ Backend is running on http://localhost:8000" -ForegroundColor Green
    Write-Host "     API Docs: http://localhost:8000/docs" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Backend is NOT running" -ForegroundColor Red
    Write-Host "     Start with: .\start-backend.ps1" -ForegroundColor Yellow
}

Write-Host ""

# Check Frontend
Write-Host "Checking Frontend (Port 12001)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:12001 -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✅ Frontend is running on http://localhost:12001" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Frontend is NOT running" -ForegroundColor Red
    Write-Host "     Start with: .\start-frontend.ps1" -ForegroundColor Yellow
}

Write-Host ""

# Check Database
Write-Host "Checking Database..." -ForegroundColor Yellow
if (Test-Path "backend\aria_erp.db") {
    $dbSize = (Get-Item "backend\aria_erp.db").Length / 1KB
    Write-Host "  ✅ Database exists: backend\aria_erp.db ($([math]::Round($dbSize, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "  ❌ Database not found" -ForegroundColor Red
    Write-Host "     Initialize with: cd backend; python init_local.py" -ForegroundColor Yellow
}

Write-Host ""

# Check Frontend Dependencies
Write-Host "Checking Frontend Dependencies..." -ForegroundColor Yellow
if (Test-Path "frontend\node_modules") {
    Write-Host "  ✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ node_modules not found" -ForegroundColor Red
    Write-Host "     Install with: cd frontend; npm install --legacy-peer-deps" -ForegroundColor Yellow
}

Write-Host ""

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = & C:/Python313/python.exe --version 2>&1
    Write-Host "  ✅ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Python not found" -ForegroundColor Red
}

Write-Host ""

# Check Node
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "  ✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "📖 Quick Start Commands:" -ForegroundColor Cyan
Write-Host "   Terminal 1: .\start-backend.ps1" -ForegroundColor White
Write-Host "   Terminal 2: .\start-frontend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:12001" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login:" -ForegroundColor Cyan
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
