@echo off
echo ==========================================
echo        PROSTSZE URUCHOMIENIE
echo ==========================================

REM Zatrzymaj procesy na portach
echo Zatrzymuję stare procesy...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8083 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo.
echo Uruchamiam backend...
start "Backend" cmd /k "cd /d %~dp0 && set NODE_ENV=development && set PORT=3001 && \"C:\Program Files\nodejs\node.exe\" src/app.js"

timeout /t 3 /nobreak >nul

echo.
echo Uruchamiam frontend...
start "Frontend" cmd /k "cd /d %~dp0\frontend && \"C:\Program Files\nodejs\node.exe\" node_modules\.bin\vite"

echo.
echo Uruchomione! Sprawdź okna terminali.
pause 