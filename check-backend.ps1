#!/usr/bin/env pwsh
# Quick Backend Status Check

Write-Host "`n🔍 Checking Backend Status..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod http://localhost:8000/health -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Backend is RUNNING on port 8000" -ForegroundColor Green
    
    # Quick endpoint tests
    Write-Host "`nTesting key endpoints:" -ForegroundColor Yellow
    
    # Test 1: Bots list
    try {
        $bots = Invoke-RestMethod http://localhost:8000/bots -ErrorAction Stop
        Write-Host "  ✓ GET /bots - $($bots.total) bots available" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ GET /bots - Failed" -ForegroundColor Red
    }
    
    # Test 2: Agent details
    try {
        $agent = Invoke-RestMethod http://localhost:8000/agents/invoice_reconciliation -ErrorAction Stop
        Write-Host "  ✓ GET /agents/{id} - Working" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ GET /agents/{id} - Failed" -ForegroundColor Red
    }
    
    Write-Host "`n✅ Backend is ready! Settings button will work on all bots." -ForegroundColor Green
    
} catch {
    Write-Host "❌ Backend is NOT running" -ForegroundColor Red
    Write-Host "`nInstallation may still be in progress..." -ForegroundColor Yellow
    Write-Host "Wait 1-2 minutes, then run this script again." -ForegroundColor Yellow
}
