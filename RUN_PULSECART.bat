@echo off
title PulseCart Full-Stack Launcher
color 0B

echo.
echo  🛒 PulseCart Professional Launcher
echo  ──────────────────────────────────
echo.

:: 1. Check for Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python not found. Please install Python to run the ML service.
    pause
    exit /b
)

:: 2. Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js to run the Backend/Frontend.
    pause
    exit /b
)

:: 3. Start Python ML Service (Port 8000)
echo [1/3] Starting Python Sentiment Service...
start "PulseCart-ML-Service" cmd /k "cd ml-service && python app.py"
timeout /t 3 >nul

:: 4. Start Node.js Backend (Port 5000)
echo [2/3] Starting Express Backend...
start "PulseCart-Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 >nul

:: 5. Start React Frontend (Port 3000)
echo [3/3] Starting React Frontend...
echo.
echo 🚀 All services are starting!
echo 🔗 Frontend: http://localhost:3000
echo 🔗 Backend API: http://localhost:5000
echo 🔗 ML Service: http://localhost:8000
echo.
npm start

pause
