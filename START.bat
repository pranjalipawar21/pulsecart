@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: PulseCart — START.bat
:: Windows one-click launcher
:: Double-click this file to start the dev server
:: ─────────────────────────────────────────────────────────────────────────────

title PulseCart Dev Server
color 0A

echo.
echo  ██████╗ ██╗   ██╗██╗     ███████╗███████╗ ██████╗ █████╗ ██████╗ ████████╗
echo  ██╔══██╗██║   ██║██║     ██╔════╝██╔════╝██╔════╝██╔══██╗██╔══██╗╚══██╔══╝
echo  ██████╔╝██║   ██║██║     ███████╗█████╗  ██║     ███████║██████╔╝   ██║
echo  ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  ██║     ██╔══██║██╔══██╗   ██║
echo  ██║     ╚██████╔╝███████╗███████║███████╗╚██████╗██║  ██║██║  ██║   ██║
echo  ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝
echo.
echo  Retail Intelligence Dashboard v2.0
echo  ─────────────────────────────────────────────────────────────────────────
echo.

:: ── Check Node.js is installed ───────────────────────────────────────────────
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo  [ERROR] Node.js not found.
  echo.
  echo  Please install Node.js 18+ from https://nodejs.org
  echo  Then re-run this script.
  echo.
  pause
  exit /b 1
)

:: ── Check npm is available ───────────────────────────────────────────────────
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo  [ERROR] npm not found. Reinstall Node.js from https://nodejs.org
  echo.
  pause
  exit /b 1
)

:: ── Print versions ───────────────────────────────────────────────────────────
echo  Node.js version:
node --version
echo  npm version:
npm --version
echo.

:: ── Check .env.local exists ──────────────────────────────────────────────────
if not exist ".env.local" (
  echo  [WARN] .env.local not found.
  echo  Copying from .env.local.template...
  if exist ".env.local.template" (
    copy ".env.local.template" ".env.local" >nul
    echo  Created .env.local — please fill in your Firebase config.
    echo.
    echo  Opening .env.local in Notepad...
    start notepad ".env.local"
    echo.
    echo  Fill in your Firebase values, save the file, then press any key to continue.
    pause
  ) else (
    echo  [WARN] .env.local.template also missing. App will use fallback config.
    echo.
  )
)

:: ── Install dependencies if node_modules missing ─────────────────────────────
if not exist "node_modules\" (
  echo  [INFO] node_modules not found — running npm install...
  echo  This may take 1-3 minutes on first run.
  echo.
  npm install
  if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
  echo.
  echo  [OK] Dependencies installed.
  echo.
)

:: ── Start dev server ─────────────────────────────────────────────────────────
echo  Starting PulseCart dev server...
echo  App will open at http://localhost:3000
echo.
echo  Press Ctrl+C to stop the server.
echo  ─────────────────────────────────────────────────────────────────────────
echo.

:: Open browser after 4 second delay
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

npm start

:: ── If server exits ───────────────────────────────────────────────────────────
echo.
echo  [INFO] Server stopped.
pause