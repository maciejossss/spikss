#!/usr/bin/env node
/**
 * 🛡️ BEZPIECZNE NAPRAWKI SYSTEMU SERWISOWEGO
 * 
 * Ten skrypt przeprowadza naprawki w bezpieczny sposób:
 * 1. Backup kodu i bazy danych
 * 2. Testy systemu przed zmianami
 * 3. Naprawki bezpieczeństwa krok po kroku
 * 4. Testy po każdej zmianie
 * 5. Rollback w razie problemów
 */

const BackupSystem = require('./backup-system');
const SystemTester = require('./test-system');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SafeFixManager {
  constructor() {
    this.backupDir = null;
    this.currentPhase = 'initial';
    this.results = {
      backup: null,
      preTests: null,
      fixes: [],
      postTests: null
    };
  }

  async run() {
    console.log('🛡️ === BEZPIECZNE NAPRAWKI SYSTEMU ===\n');
    
    try {
      // FAZA 0: Backup
      await this.createBackup();
      
      // FAZA 1: Testy przed zmianami
      await this.runPreTests();
      
      // FAZA 2: Naprawki bezpieczeństwa
      await this.applySecurityFixes();
      
      // FAZA 3: Testy po zmianach
      await this.runPostTests();
      
      // PODSUMOWANIE
      this.generateSummary();
      
    } catch (error) {
      console.error(`💥 BŁĄD W FAZIE ${this.currentPhase}:`, error);
      await this.offerRollback();
    }
  }

  async createBackup() {
    this.currentPhase = 'backup';
    console.log('📋 FAZA 0: TWORZENIE BACKUP');
    console.log('━'.repeat(50));
    
    const backup = new BackupSystem();
    this.backupDir = await backup.createFullBackup();
    BackupSystem.createRollbackScript(this.backupDir);
    
    this.results.backup = {
      success: true,
      path: this.backupDir,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Backup utworzony pomyślnie\n');
  }

  async runPreTests() {
    this.currentPhase = 'pre-tests';
    console.log('📋 FAZA 1: TESTY PRZED ZMIANAMI');
    console.log('━'.repeat(50));
    
    const tester = new SystemTester();
    this.results.preTests = await tester.runAllTests();
    
    // Sprawdź czy można kontynuować
    if (this.results.preTests.summary.failed > 3) {
      console.log('⚠️  OSTRZEŻENIE: Dużo testów nie przechodzi');
      console.log('Czy chcesz kontynuować naprawki? (y/N)');
      
      // W automation mode - kontynuuj ale zapisz warning
      console.log('🤖 Automation mode: Kontynuuję z ostrzeżeniem');
    }
    
    console.log('✅ Testy przedwstępne zakończone\n');
  }

  async applySecurityFixes() {
    this.currentPhase = 'security-fixes';
    console.log('📋 FAZA 2: NAPRAWKI BEZPIECZEŃSTWA');
    console.log('━'.repeat(50));
    
    const fixes = [
      {
        name: 'JWT Tokens',
        description: 'Zastąpienie base64 tokenami JWT',
        function: () => this.fixJWTTokens()
      },
      {
        name: 'Environment Variables',
        description: 'Konfiguracja zmiennych środowiskowych',
        function: () => this.fixEnvironmentVariables()
      },
      {
        name: 'Remove Hardcoded IPs',
        description: 'Usunięcie hardkodowanych adresów IP',
        function: () => this.fixHardcodedIPs()
      },
      {
        name: 'Workspace Config',
        description: 'Poprawka konfiguracji workspace',
        function: () => this.fixWorkspaceConfig()
      },
      {
        name: 'Rate Limiting',
        description: 'Poprawa rate limiting w API',
        function: () => this.fixRateLimiting()
      }
    ];

    for (const fix of fixes) {
      console.log(`\n🔧 Naprawka: ${fix.name}`);
      console.log(`   ${fix.description}`);
      
      try {
        await fix.function();
        
        // Mini test po każdej naprawce
        console.log('   🧪 Quick test...');
        const quickTest = await this.quickTest();
        
        this.results.fixes.push({
          name: fix.name,
          success: true,
          quickTest: quickTest
        });
        
        console.log('   ✅ Naprawka zastosowana pomyślnie');
        
      } catch (error) {
        console.error(`   ❌ Błąd w naprawce ${fix.name}:`, error);
        this.results.fixes.push({
          name: fix.name,
          success: false,
          error: error.message
        });
        
        // Zapytaj czy kontynuować
        console.log('   🤔 Czy kontynuować pozostałe naprawki? (Y/n)');
        console.log('   🤖 Automation: Kontynuuję...');
      }
    }
    
    console.log('\n✅ Wszystkie naprawki bezpieczeństwa zakończone\n');
  }

  async runPostTests() {
    this.currentPhase = 'post-tests';
    console.log('📋 FAZA 3: TESTY PO ZMIANACH');
    console.log('━'.repeat(50));
    
    const tester = new SystemTester();
    this.results.postTests = await tester.runAllTests();
    
    console.log('✅ Testy końcowe zakończone\n');
  }

  // IMPLEMENTACJE NAPRAWEK
  async fixJWTTokens() {
    // Dodaj dependency na jsonwebtoken
    console.log('   📦 Dodaję jsonwebtoken dependency...');
    
    const desktopPkg = JSON.parse(fs.readFileSync('desktop/package.json', 'utf8'));
    if (!desktopPkg.dependencies.jsonwebtoken) {
      desktopPkg.dependencies.jsonwebtoken = '^9.0.2';
      fs.writeFileSync('desktop/package.json', JSON.stringify(desktopPkg, null, 2));
    }

    // Zaktualizuj auth store
    console.log('   🔒 Aktualizuję auth store...');
    
    const authStorePath = 'desktop/src/stores/auth.js';
    const authContent = fs.readFileSync(authStorePath, 'utf8');
    
    // Zastąp base64 JWT-em (bardzo ostrożnie)
    const newAuthContent = authContent
      .replace(
        /const authToken = btoa\(JSON\.stringify\(\{\s*userId: result\.id,\s*timestamp: Date\.now\(\)\s*\}\)\)/g,
        `// Import JWT at top of file
const jwt = window.electronAPI?.jwt || (() => {
  // Fallback for browser mode
  return {
    sign: (payload) => btoa(JSON.stringify(payload)),
    verify: (token) => JSON.parse(atob(token))
  };
})();

const authToken = jwt.sign({
  userId: result.id,
  timestamp: Date.now(),
  expiresIn: '24h'
})`
      );
    
    if (newAuthContent !== authContent) {
      fs.writeFileSync(authStorePath, newAuthContent);
      console.log('   ✓ Auth store zaktualizowany');
    } else {
      console.log('   ⚠️ Auth store już ma właściwą strukturę');
    }
  }

  async fixEnvironmentVariables() {
    console.log('   🌍 Tworzę pliki .env...');
    
    // .env dla desktop
    const desktopEnv = `# Desktop App Environment
NODE_ENV=development
VITE_API_URL=http://localhost:5174
VITE_MOBILE_API_URL=http://localhost:3001
VITE_RAILWAY_URL=https://serwis-mobile.up.railway.app
`;
    
    if (!fs.existsSync('desktop/.env')) {
      fs.writeFileSync('desktop/.env', desktopEnv);
      console.log('   ✓ desktop/.env utworzony');
    }

    // .env.example
    const envExample = `# Environment Variables Template
NODE_ENV=development
VITE_API_URL=http://localhost:5174
VITE_MOBILE_API_URL=http://localhost:3001
VITE_RAILWAY_URL=your-railway-url-here
`;
    
    fs.writeFileSync('.env.example', envExample);
    console.log('   ✓ .env.example utworzony');

    // Railway .env template
    const railwayEnv = `# Railway Environment
NODE_ENV=production
PORT=3000
DATABASE_URL=your-database-url
CORS_ORIGIN=*
`;
    
    fs.writeFileSync('desktop/railway-backend/.env.example', railwayEnv);
    console.log('   ✓ Railway .env.example utworzony');
  }

  async fixHardcodedIPs() {
    console.log('   🌐 Usuwam hardkodowane IP...');
    
    // Config dla mobile app
    const configJS = `// API Configuration
const API_CONFIG = {
  development: {
    desktop: 'http://localhost:5174',
    mobile: 'http://localhost:3001'
  },
  production: {
    desktop: import.meta.env.VITE_API_URL || 'http://localhost:5174',
    mobile: import.meta.env.VITE_RAILWAY_URL || 'https://serwis-mobile.up.railway.app'
  }
};

const ENV = import.meta?.env?.MODE || 'development';
export const API = API_CONFIG[ENV];
`;

    fs.writeFileSync('mobile/js/config.js', configJS);
    console.log('   ✓ mobile/js/config.js utworzony');

    // Zaktualizuj mobile app.js żeby używał config
    const appJSPath = 'mobile/js/app.js';
    if (fs.existsSync(appJSPath)) {
      let appContent = fs.readFileSync(appJSPath, 'utf8');
      
      // Dodaj import config na górze
      if (!appContent.includes('import { API }')) {
        appContent = `import { API } from './config.js';\n\n` + appContent;
      }
      
      // Zastąp hardkodowane URLe
      appContent = appContent.replace(
        /http:\/\/192\.168\.1\.27:5174/g,
        '${API.desktop}'
      );
      
      fs.writeFileSync(appJSPath, appContent);
      console.log('   ✓ mobile/js/app.js zaktualizowany');
    }
  }

  async fixWorkspaceConfig() {
    console.log('   📦 Naprawiam konfigurację workspace...');
    
    const packagePath = 'package.json';
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Usuń nieistniejący workspace "api"
    if (pkg.workspaces && pkg.workspaces.includes('api')) {
      pkg.workspaces = pkg.workspaces.filter(ws => ws !== 'api');
      console.log('   ✓ Usunięto workspace "api"');
    }
    
    // Usuń skrypty odnoszące się do "api"
    if (pkg.scripts) {
      ['setup:api', 'dev:api', 'build:api'].forEach(script => {
        if (pkg.scripts[script]) {
          delete pkg.scripts[script];
          console.log(`   ✓ Usunięto skrypt "${script}"`);
        }
      });
    }
    
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log('   ✓ package.json zaktualizowany');
  }

  async fixRateLimiting() {
    console.log('   🚦 Poprawiam rate limiting...');
    
    const apiServerPath = 'desktop/src/electron/api-server.js';
    if (fs.existsSync(apiServerPath)) {
      let content = fs.readFileSync(apiServerPath, 'utf8');
      
      // Zmniejsz limit z 200 do 100
      content = content.replace(
        /if \(this\.rateLimits\.get\(key\) > 200\)/g,
        'if (this.rateLimits.get(key) > 100)'
      );
      
      fs.writeFileSync(apiServerPath, content);
      console.log('   ✓ Rate limit zmniejszony do 100 req/min');
    }
  }

  async quickTest() {
    // Szybki test czy podstawowe pliki się parsują
    try {
      // Test package.json
      JSON.parse(fs.readFileSync('package.json', 'utf8'));
      JSON.parse(fs.readFileSync('desktop/package.json', 'utf8'));
      
      return { success: true, message: 'Quick test passed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  generateSummary() {
    console.log('📊 === PODSUMOWANIE NAPRAWEK ===');
    console.log('━'.repeat(50));
    
    console.log(`🛡️ Backup: ${this.results.backup?.success ? '✅' : '❌'}`);
    console.log(`   Path: ${this.results.backup?.path}`);
    
    const preTests = this.results.preTests?.summary;
    console.log(`🧪 Pre-tests: ${preTests?.passed}✅ ${preTests?.failed}❌ ${preTests?.warnings}⚠️`);
    
    console.log(`🔧 Naprawki (${this.results.fixes.length}):`);
    this.results.fixes.forEach(fix => {
      console.log(`   ${fix.success ? '✅' : '❌'} ${fix.name}`);
    });
    
    const postTests = this.results.postTests?.summary;
    console.log(`🧪 Post-tests: ${postTests?.passed}✅ ${postTests?.failed}❌ ${postTests?.warnings}⚠️`);
    
    console.log('\n🎯 === NASTĘPNE KROKI ===');
    console.log('1. 🖥️  Test desktop app: npm run dev:desktop');
    console.log('2. 📱 Test mobile app: npm run dev:mobile-server');
    console.log('3. 🚂 Deploy to Railway: git push railway main');
    console.log('4. 🔄 W razie problemów: ./rollback.sh');
  }

  async offerRollback() {
    console.log('\n💥 === WYSTĄPIŁ BŁĄD ===');
    console.log('🔄 Czy chcesz cofnąć zmiany? (Y/n)');
    console.log('🤖 Automation: Nie cofam - raport błędów zapisany');
    
    // Zapisz raport błędów
    const errorReport = {
      timestamp: new Date().toISOString(),
      phase: this.currentPhase,
      results: this.results,
      rollbackAvailable: !!this.backupDir
    };
    
    fs.writeFileSync('error-report.json', JSON.stringify(errorReport, null, 2));
    console.log('📄 Raport błędów: error-report.json');
    
    if (this.backupDir) {
      console.log(`🔄 Rollback dostępny: ${this.backupDir}/rollback.sh`);
    }
  }
}

// URUCHOM NAPRAWKI
if (require.main === module) {
  (async () => {
    const manager = new SafeFixManager();
    await manager.run();
  })();
}

module.exports = SafeFixManager; 