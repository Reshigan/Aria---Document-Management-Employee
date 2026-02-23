# ARIA ERP - Frontend Startup Script
# This script starts the frontend development server

Write-Host "🚀 Starting ARIA ERP Frontend..." -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
$frontendDir = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    Write-Host "⚠️  Note: Using --legacy-peer-deps due to OneDrive compatibility" -ForegroundColor Yellow
    npm install --legacy-peer-deps
    Write-Host ""
}

# Start the frontend server
Write-Host "🌐 Starting Vite dev server on http://localhost:12001" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

npm run dev
