@echo off
echo ==========================================
echo    SYSTEM SERWISOWY - OSTATECZNY START
echo ==========================================

REM Zatrzymaj stare procesy
echo Zatrzymuję stare procesy...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8083 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo.

REM Ustaw środowisko
set NODE_ENV=development
set PORT=3001
set "PATH=C:\Program Files\nodejs;%PATH%"

echo [1/2] Uruchamiam backend...
start "Backend Server" /min cmd /c "cd /d %~dp0 && \"C:\Program Files\nodejs\node.exe\" src/app.js"

timeout /t 4 /nobreak >nul

echo [2/2] Uruchamiam frontend...
start "Frontend Server" cmd /k "cd /d %~dp0\frontend && set \"PATH=C:\Program Files\nodejs;%%PATH%%\" && call node_modules\.bin\vite.cmd"

echo.
echo ==========================================
echo        APLIKACJA URUCHOMIONA
echo ==========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:8083
echo.
echo Otwórz http://localhost:8083 w przeglądarce
echo.
echo Naciśnij dowolny klawisz aby zamknąć to okno...
pause >nul 