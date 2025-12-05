@echo off
REM Start backend server and open browser
cd /d "%~dp0"
REM ensure node modules installed
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo Starting server...
start "" cmd /k "node server.js"
timeout /t 2 >nul
start "" "http://localhost:3000/login.html"
echo Done.
pause
