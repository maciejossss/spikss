@echo off
set DATABASE_URL=postgresql://postgres:RejcVvKxoptptXgEpWDDwuKBDwgokfwb@shuttle.proxy.rlwy.net:15442/railway
set NODE_ENV=production
set PGSSLMODE=require

echo System Serwisowy - Database Management

if "%1"=="" (
    echo Available commands:
    echo - check : Test database connection
    echo - init  : Initialize database schema
    echo - reset : Reset database ^(drop all tables^)
    echo - migrate : Migrate clients table to new schema
    echo.
    echo Usage: %0 ^<command^>
    exit /b 1
)

echo Running command: %1
node src/shared/database/manage-db.js %1
if errorlevel 1 (
    echo Command failed
    exit /b 1
)

echo Command completed successfully
exit /b 0 