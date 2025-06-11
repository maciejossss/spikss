@echo off
echo ==========================================
echo      FRONTEND VITE DEV SERVER
echo ==========================================

cd /d "%~dp0\frontend"

echo Uruchamiam frontend na porcie 8083...
echo.

REM Ustawienie PATH dla Node.js
set "PATH=C:\Program Files\nodejs;%PATH%"

REM Uruchomienie Vite
call ".\node_modules\.bin\vite.cmd"

pause 