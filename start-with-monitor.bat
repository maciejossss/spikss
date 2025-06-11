@echo off
echo ==========================================
echo     SYSTEM SERWISOWY - SMART START
echo ==========================================
echo.

REM Zatrzymaj istniejące procesy jeśli działają
echo [1/4] Czyszczenie starych procesów...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Zatrzymuję proces %%a na porcie 3001
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8083 ^| findstr LISTENING') do (
    echo Zatrzymuję proces %%a na porcie 8083
    taskkill /F /PID %%a >nul 2>&1
)

echo Oczekiwanie 3 sekundy na zwolnienie portów...
timeout /t 3 /nobreak >nul

echo.
echo [2/4] Uruchamianie backendu...
start "Backend Server" cmd /k "cd /d %~dp0 && npm run dev"

echo Oczekiwanie 5 sekund na uruchomienie backendu...
timeout /t 5 /nobreak >nul

echo.
echo [3/4] Sprawdzanie czy backend odpowiada...
:check_backend
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/health' -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host 'Backend OK' } else { Write-Host 'Backend ERROR' } } catch { Write-Host 'Backend nie odpowiada, próbuję ponownie...'; Start-Sleep 3 }"

echo.
echo [4/4] Uruchamianie frontendu...
start "Frontend Server" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo [5/5] Uruchamianie monitora połączeń...
start "Connection Monitor" cmd /k "cd /d %~dp0 && node monitor-server.js"

echo.
echo ==========================================
echo    SYSTEM URUCHOMIONY POMYŚLNIE!
echo ==========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:8083
echo Health Check: http://localhost:3001/health
echo.
echo Naciśnij dowolny klawisz aby zamknąć...
pause >nul 