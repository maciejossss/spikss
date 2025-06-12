@echo off
set DATABASE_URL=postgresql://postgres:RejcVvKxoptptXgEpWDDwuKBDwgokfwb@shuttle.proxy.rlwy.net:15442/railway
set NODE_ENV=production
set PGSSLMODE=require
set SKIP_DB_INIT=false
set PORT=8080
set JWT_SECRET=your_jwt_secret_key
set TOKEN_EXPIRY=24h
set REFRESH_TOKEN_EXPIRY=7d
set RATE_LIMIT_WINDOW_MS=60000
set RATE_LIMIT_MAX_REQUESTS=100
set ALLOWED_ORIGINS=http://localhost:8080,http://localhost:8082,http://localhost:3000
set LOG_LEVEL=debug

echo Starting application...
npm run start-prod 