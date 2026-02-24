#!/usr/bin/env pwsh
# Restart Backend Script

Write-Host "`n=== ARIA Backend Restart ===" -ForegroundColor Cyan

# Stop any running Python processes
Write-Host "`nStopping existing backend processes..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Activate virtual environment if it exists
$venvPath = ".\.venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    & $venvPath
}

# Start backend
Write-Host "`nStarting backend server..." -ForegroundColor Green
Set-Location backend
python minimal_local.py
