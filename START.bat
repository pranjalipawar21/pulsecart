@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: PulseCart — START.bat
:: Windows one-click launcher — starts MySQL backend + React frontend
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
echo  Full-Stack: React + Express + MySQL + Gemini AI
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

:: ── Check MySQL is running ───────────────────────────────────────────────────
echo  Checking MySQL connection...
mysql -u root -proot -e "SELECT 1" >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo  [WARN] MySQL not reachable with root/root credentials.
  echo         Make sure MySQL is running and credentials match server\.env
  echo         The app will fall back to in-memory data if MySQL is unavailable.
  echo.
) else (
  echo  [OK] MySQL connected
  echo.
)

:: ── Print versions ───────────────────────────────────────────────────────────
echo  Node.js version:
node --version
echo  npm version:
call npm --version
echo.

:: ── Install frontend dependencies if needed ──────────────────────────────────
if not exist "node_modules\" (
  echo  [INFO] Frontend node_modules not found — running npm install...
  echo  This may take 1-3 minutes on first run.
  echo.
  call npm install
  if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
  echo.
  echo  [OK] Frontend dependencies installed.
  echo.
)

:: ── Install backend dependencies if needed ───────────────────────────────────
if not exist "server\node_modules\" (
  echo  [INFO] Backend node_modules not found — running npm install...
  echo.
  pushd server
  call npm install
  popd
  if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Backend npm install failed.
    pause
    exit /b 1
  )
  echo  [OK] Backend dependencies installed.
  echo.
)

:: ── Seed database if needed ──────────────────────────────────────────────────
echo  Checking database...
mysql -u root -proot -e "USE pulsecart; SELECT COUNT(*) FROM kpis;" >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo  [INFO] Database not seeded yet — running seed script...
  pushd server
  node seed.js
  popd
  echo.
) else (
  echo  [OK] Database 'pulsecart' already seeded
  echo.
)

:: ── Start backend server in background ───────────────────────────────────────
echo  Starting Express backend on port 5001...
start /b "PulseCart-Backend" cmd /c "cd server && node index.js"
timeout /t 2 /nobreak >nul

:: ── Start frontend dev server ────────────────────────────────────────────────
echo  Starting React frontend on port 3000...
echo.
echo  ─────────────────────────────────────────────────────────────────────────
echo   App:     http://localhost:3000
echo   API:     http://localhost:5001/api/health
echo   MySQL:   pulsecart database
echo  ─────────────────────────────────────────────────────────────────────────
echo.
echo  Press Ctrl+C to stop.
echo.

:: Open browser after 4 second delay
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

call npm start

:: ── If server exits ──────────────────────────────────────────────────────────
echo.
echo  [INFO] Server stopped.
pause