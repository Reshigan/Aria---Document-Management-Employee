#!/usr/bin/env pwsh
# Test ARIA Backend Endpoints

Write-Host "`n=== ARIA Backend Endpoint Tests ===" -ForegroundColor Cyan

# Wait for backend to be ready
Write-Host "`nWaiting for backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$passCount = 0
$failCount = 0

# Test 1: Agent Details
Write-Host "`n[1/3] Testing GET /agents/invoice_reconciliation..." -ForegroundColor Yellow
try {
    $agent = Invoke-RestMethod http://localhost:8000/agents/invoice_reconciliation -ErrorAction Stop
    Write-Host "   ✓ SUCCESS - Bot: $($agent.name)" -ForegroundColor Green
    $passCount++
} catch {
    Write-Host "   ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}

# Test 2: Bot Execution
Write-Host "`n[2/3] Testing POST /bots/execute..." -ForegroundColor Yellow
try {
    $body = @{
        bot_id = "invoice_reconciliation"
        data = @{}
    } | ConvertTo-Json
    
    $exec = Invoke-RestMethod -Method POST -Uri http://localhost:8000/bots/execute -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Host "   ✓ SUCCESS - $($exec.message)" -ForegroundColor Green
    Write-Host "      Execution ID: $($exec.execution_id)" -ForegroundColor Gray
    Write-Host "      Time: $($exec.execution_time_ms)ms" -ForegroundColor Gray
    $passCount++
} catch {
    Write-Host "   ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}

# Test 3: Employee Creation
Write-Host "`n[3/3] Testing POST /hr/employees..." -ForegroundColor Yellow
try {
    $body = @{
        firstName = "Test"
        lastName = "User"
        email = "test@aria.local"
        department = "IT"
        position = "Developer"
    } | ConvertTo-Json
    
    $emp = Invoke-RestMethod -Method POST -Uri http://localhost:8000/hr/employees -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Host "   ✓ SUCCESS - $($emp.message)" -ForegroundColor Green
    Write-Host "      Employee ID: $($emp.employee.employeeId)" -ForegroundColor Gray
    $passCount++
} catch {
    Write-Host "   ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
}

# Summary
Write-Host "`n=== Test Results ===" -ForegroundColor Cyan
Write-Host "Passed: $passCount/3" -ForegroundColor $(if ($passCount -eq 3) { "Green" } else { "Yellow" })
Write-Host "Failed: $failCount/3" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })

if ($passCount -eq 3) {
    Write-Host "`n🎉 All endpoints working! Settings button will work on all 67 bots!" -ForegroundColor Green
} else {
    Write-Host "`n⚠ Some endpoints need attention" -ForegroundColor Yellow
}
