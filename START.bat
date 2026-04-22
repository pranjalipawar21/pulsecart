@echo off
title PulseCart — Retail Intelligence Dashboard
color 0A
echo.
echo  ██████╗ ██╗   ██╗██╗     ███████╗███████╗ ██████╗ █████╗ ██████╗ ████████╗
echo  ██╔══██╗██║   ██║██║     ██╔════╝██╔════╝██╔════╝██╔══██╗██╔══██╗╚══██╔══╝
echo  ██████╔╝██║   ██║██║     ███████╗█████╗  ██║     ███████║██████╔╝   ██║
echo  ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  ██║     ██╔══██║██╔══██╗   ██║
echo  ██║     ╚██████╔╝███████╗███████║███████╗╚██████╗██║  ██║██║  ██║   ██║
echo  ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝
echo.
echo  E-Commerce Retail Intelligence Platform
echo  =========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found!
    echo.
    echo  Please install Node.js from: https://nodejs.org
    echo  Download "LTS" version, install it, then run this file again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% detected
echo.

:: Install if node_modules missing
if not exist "node_modules\" (
    echo  [1/2] First run detected — installing dependencies...
    echo        This takes 1-2 minutes. Please wait...
    echo.
    npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] Installation failed. Check internet connection.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencies installed successfully!
    echo.
) else (
    echo  [OK] Dependencies already installed. Skipping...
    echo.
)

echo  [2/2] Launching PulseCart Dashboard...
echo.
echo  ► Opening in browser at: http://localhost:3000
echo  ► Press Ctrl+C here to stop the server
echo.
npm start
