@echo off
echo.
echo ================================
echo   ARIA ERP - Status Check
echo ================================
echo.

echo Checking Backend (Port 8000)...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Backend is running on http://localhost:8000
) else (
    echo [X] Backend is NOT running
    echo     Start with: .\start-backend.ps1
)

echo.
echo Checking Frontend (Port 12001)...
curl -s http://localhost:12001 >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Frontend is running on http://localhost:12001
) else (
    echo [X] Frontend is NOT running
    echo     Start with: .\start-frontend.ps1
)

echo.
echo Checking Database...
if exist backend\aria_erp.db (
    echo [OK] Database exists: backend\aria_erp.db
) else (
    echo [X] Database not found
    echo     Initialize with: cd backend; python init_local.py
)

echo.
echo ================================
echo.
echo To start the system:
echo   Terminal 1: .\start-backend.ps1
echo   Terminal 2: .\start-frontend.ps1
echo.
echo Then open: http://localhost:12001
echo Login: admin / admin123
echo.
pause
