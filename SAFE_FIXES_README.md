# 🛡️ BEZPIECZNE NAPRAWKI SYSTEMU SERWISOWEGO

## 🚀 SZYBKI START

```bash
# 1. URUCHOM BEZPIECZNE NAPRAWKI
node start-safe-fixes.js

# 2. SPRAWDŹ WYNIKI
cat test-report-$(date +%Y-%m-%d).json

# 3. W RAZIE PROBLEMÓW
./backups/*/rollback.sh  # lub rollback.bat na Windows
```

## 📋 CO ZOSTANIE NAPRAWIONE

### 🔒 **BEZPIECZEŃSTWO**
- ✅ JWT tokens zamiast base64
- ✅ Environment variables (.env files)
- ✅ Usunięcie hardkodowanych IP
- ✅ Poprawa rate limiting (200→100 req/min)
- ✅ Poprawka konfiguracji workspace

### 🗂️ **STRUKTURA PLIKÓW**
```
📦 Nowe pliki:
├── .env.example                    # Template env variables
├── desktop/.env                    # Desktop environment
├── desktop/railway-backend/.env.example  # Railway template
├── mobile/js/config.js             # API configuration
├── backups/                        # Backup directory
│   └── pre-fixes-YYYY-MM-DD/       # Timestamped backup
│       ├── serwis-backup.db        # Database backup
│       ├── rollback.sh             # Rollback script
│       └── dependency-versions.json # Package versions
└── test-report-YYYY-MM-DD.json     # Test results
```

## 🧪 SYSTEM TESTOWANIA

### **PRZED ZMIANAMI:**
- ✅ Struktura projektu
- ✅ Dependencies (npm list)
- ✅ Baza danych (SQLite tables)
- ✅ Desktop app files
- ✅ Mobile app files  
- ✅ Railway configuration
- ⚠️ Security checks (warnings expected)

### **PO ZMIANACH:**
- ✅ Wszystkie testy + improved security
- ✅ Quick tests po każdej naprawce
- ✅ JSON syntax validation

## 🔄 ROLLBACK PROCEDURE

### **Automatyczny rollback:**
```bash
# Linux/Mac
./backups/pre-fixes-*/rollback.sh

# Windows
./backups/pre-fixes-*/rollback.bat
```

### **Manualny rollback:**
```bash
# 1. Cofnij Git
git reset --hard backup-YYYY-MM-DD

# 2. Przywróć bazę danych
cp ./backups/*/serwis-backup.db ~/.config/system-serwisowy/serwis.db

# 3. Reinstall packages
npm install
cd desktop && npm install
```

## 📊 MONITORING WYNIKÓW

### **Success Indicators:**
- 🛡️ Backup: ✅ (with rollback script)
- 🧪 Pre-tests: >80% passed (warnings OK)
- 🔧 All 5 fixes: ✅ 
- 🧪 Post-tests: ≥ Pre-tests + improved security

### **Failure Indicators:**
- ❌ Backup failed → STOP
- ❌ >50% pre-tests failed → Manual review needed
- ❌ Any fix + quick test failed → Continue with warning
- ❌ Post-tests worse than pre-tests → Consider rollback

## 🎯 POST-FIX TESTING

### **1. Desktop App Test:**
```bash
cd desktop
npm run dev
# ✅ App starts
# ✅ Login works (admin/admin123 still works as fallback)
# ✅ Database operations work
```

### **2. Mobile App Test:**
```bash
npm run dev:mobile-server
# ✅ Server starts on port 3001
# ✅ API endpoints respond
# ✅ No hardcoded IPs in console
```

### **3. Railway Deployment:**
```bash
# Setup Railway (if not done)
railway login
railway link [your-project-id]

# Deploy
cd desktop/railway-backend
railway up
# ✅ Deployment successful
# ✅ Environment variables set
```

## 🚨 TROUBLESHOOTING

### **Backup Failed:**
- Check disk space
- Verify Git repository status
- Ensure database is not locked

### **Tests Failed:**
- Review `test-report-*.json`
- Check `error-report.json` if exists
- Verify all dependencies installed

### **Fix Failed:**
- Check which specific fix failed
- Review error message in console
- Consider manual application of fix

### **Rollback Failed:**
- Manual Git reset: `git reset --hard backup-YYYY-MM-DD`
- Check backup file exists: `ls -la backups/*/`
- Verify database path in rollback script

## 📞 **NEXT STEPS AFTER FIXES**

1. **✅ Verify everything works**
2. **🚂 Deploy to Railway** 
3. **📱 Test mobile connection to Railway**
4. **🔐 Update production passwords**
5. **📋 Continue with FAZA 3: Database improvements**

---

## 🔧 **MANUAL FIXES (If Automation Fails)**

<details>
<summary>Click to expand manual procedures</summary>

### **Fix 1: JWT Tokens**
```bash
# Add dependency
cd desktop
npm install jsonwebtoken@^9.0.2

# Update auth store - replace btoa() with proper JWT
# File: desktop/src/stores/auth.js
```

### **Fix 2: Environment Variables**
```bash
# Create files:
echo "NODE_ENV=development" > desktop/.env
echo "VITE_API_URL=http://localhost:5174" >> desktop/.env
echo "VITE_RAILWAY_URL=your-railway-url" >> desktop/.env
```

### **Fix 3: Remove Hardcoded IPs**
```bash
# Create config file
echo "export const API = { desktop: 'http://localhost:5174' }" > mobile/js/config.js

# Update mobile/js/app.js to import config
```

### **Fix 4: Workspace Config**
```bash
# Edit package.json - remove "api" from workspaces array
# Remove scripts: setup:api, dev:api, build:api
```

### **Fix 5: Rate Limiting**
```bash
# Edit desktop/src/electron/api-server.js
# Change: if (this.rateLimits.get(key) > 200)
# To:     if (this.rateLimits.get(key) > 100)
```

</details>

---

**🎯 Ready to proceed? Run: `node start-safe-fixes.js`** 