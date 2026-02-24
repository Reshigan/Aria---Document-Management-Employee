# ARIA ERP - Backend Startup Script
# This script initializes the database and starts the backend server

Write-Host "🚀 Starting ARIA ERP Backend..." -ForegroundColor Cyan
Write-Host ""

# Navigate to backend directory
$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir

# Check if database exists
$dbPath = Join-Path $backendDir "aria_erp.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "📊 Database not found. Initializing..." -ForegroundColor Yellow
    C:/Python313/python.exe init_local.py
    Write-Host ""
}

# Start the backend server
Write-Host "🌐 Starting FastAPI server on http://localhost:8000" -ForegroundColor Green
Write-Host "📚 API Documentation: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

C:/Python313/python.exe -m uvicorn minimal_local:app --reload --host 0.0.0.0 --port 8000
