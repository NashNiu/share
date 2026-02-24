@echo off
echo LAN File and Message Sharing System
echo ================================
echo.

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js not found, please install Node.js first
    echo Download URL: https://nodejs.org/
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting server...
echo ================================
echo Press Ctrl+C to stop the server
echo.

call npm start

pause
