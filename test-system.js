const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SystemTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { passed: 0, failed: 0, warnings: 0 }
    };
  }

  async runAllTests() {
    console.log('🧪 === TESTOWANIE SYSTEMU ===');
    
    await this.testProjectStructure();
    await this.testDependencies();
    await this.testDatabase();
    await this.testDesktopApp();
    await this.testMobileFiles();
    await this.testRailwayConfig();
    await this.testSecurity();
    
    this.generateReport();
    return this.results;
  }

  test(name, condition, message, type = 'test') {
    const result = {
      name,
      passed: condition,
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    
    if (type === 'warning') {
      this.results.summary.warnings++;
      console.log(`⚠️  ${name}: ${message}`);
    } else if (condition) {
      this.results.summary.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      this.results.summary.failed++;
      console.log(`❌ ${name}: ${message}`);
    }
    
    return condition;
  }

  async testProjectStructure() {
    console.log('\n📁 === STRUKTURA PROJEKTU ===');
    
    // Sprawdź główne pliki
    this.test(
      'Package.json główny',
      fs.existsSync('package.json'),
      'Główny package.json istnieje'
    );
    
    this.test(
      'Desktop folder',
      fs.existsSync('desktop') && fs.existsSync('desktop/package.json'),
      'Folder desktop z package.json istnieje'
    );
    
    this.test(
      'Mobile folder', 
      fs.existsSync('mobile') && fs.existsSync('mobile/index.html'),
      'Folder mobile z index.html istnieje'
    );
    
    this.test(
      'Railway backend',
      fs.existsSync('desktop/railway-backend/server.js'),
      'Railway backend server.js istnieje'
    );

    // Sprawdź konfigurację workspace
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const hasApiWorkspace = pkg.workspaces && pkg.workspaces.includes('api');
      const apiExists = fs.existsSync('api');
      
      this.test(
        'Workspace consistency',
        !hasApiWorkspace || apiExists,
        hasApiWorkspace ? 'Workspace definiuje "api" ale folder nie istnieje' : 'Workspace OK',
        hasApiWorkspace && !apiExists ? 'warning' : 'test'
      );
    } catch (error) {
      this.test('Package.json syntax', false, 'Błąd parsowania package.json');
    }
  }

  async testDependencies() {
    console.log('\n📦 === DEPENDENCIES ===');
    
    try {
      // Test główne dependencies
      execSync('npm list --depth=0', { stdio: 'pipe' });
      this.test('Root dependencies', true, 'Główne pakiety zainstalowane');
    } catch (error) {
      this.test('Root dependencies', false, 'Problemy z pakietami w root');
    }

    try {
      // Test desktop dependencies
      execSync('cd desktop && npm list --depth=0', { stdio: 'pipe' });
      this.test('Desktop dependencies', true, 'Pakiety desktop zainstalowane');
    } catch (error) {
      this.test('Desktop dependencies', false, 'Problemy z pakietami desktop');
    }

    // Sprawdź wersje krytycznych pakietów
    try {
      const desktopPkg = JSON.parse(fs.readFileSync('desktop/package.json', 'utf8'));
      this.test(
        'Vue 3',
        desktopPkg.dependencies.vue && desktopPkg.dependencies.vue.includes('3.'),
        `Vue version: ${desktopPkg.dependencies.vue}`
      );
      
      this.test(
        'Electron',
        desktopPkg.devDependencies.electron,
        `Electron: ${desktopPkg.devDependencies.electron}`
      );
    } catch (error) {
      this.test('Package versions', false, 'Nie można sprawdzić wersji pakietów');
    }
  }

  async testDatabase() {
    console.log('\n💾 === BAZA DANYCH ===');
    
    const userDataPath = this.getUserDataPath();
    const dbPath = path.join(userDataPath, 'serwis.db');
    
    this.test(
      'Database file',
      fs.existsSync(dbPath),
      fs.existsSync(dbPath) ? `Baza istnieje: ${dbPath}` : 'Baza nie została jeszcze utworzona'
    );
    
    // Test struktury bazy (jeśli istnieje)
    if (fs.existsSync(dbPath)) {
      try {
        const sqlite3 = require('sqlite3');
        const db = new sqlite3.Database(dbPath);
        
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
          if (err) {
            this.test('Database schema', false, 'Błąd odczytu struktury bazy');
          } else {
            const tableNames = tables.map(t => t.name);
            const requiredTables = ['clients', 'devices', 'service_orders', 'users'];
            const hasAllTables = requiredTables.every(table => tableNames.includes(table));
            
            this.test(
              'Database tables',
              hasAllTables,
              hasAllTables ? `Wszystkie tabele: ${tableNames.join(', ')}` : `Brakuje tabel: ${requiredTables.filter(t => !tableNames.includes(t)).join(', ')}`
            );
          }
          db.close();
        });
      } catch (error) {
        this.test('Database access', false, 'Nie można uzyskać dostępu do bazy');
      }
    }
  }

  async testDesktopApp() {
    console.log('\n🖥️  === DESKTOP APP ===');
    
    // Test głównych plików
    const mainFiles = [
      'desktop/src/main.js',
      'desktop/src/App.vue', 
      'desktop/src/electron/main.js',
      'desktop/src/electron/database.js',
      'desktop/src/electron/api-server.js'
    ];
    
    mainFiles.forEach(file => {
      this.test(
        `File: ${path.basename(file)}`,
        fs.existsSync(file),
        fs.existsSync(file) ? 'Istnieje' : 'Brakuje'
      );
    });

    // Test konfiguracji Vite
    this.test(
      'Vite config',
      fs.existsSync('desktop/vite.config.js'),
      'Konfiguracja Vite istnieje'
    );

    // Test skryptów npm
    try {
      const desktopPkg = JSON.parse(fs.readFileSync('desktop/package.json', 'utf8'));
      const hasDevScript = desktopPkg.scripts && desktopPkg.scripts.dev;
      this.test(
        'Dev script',
        hasDevScript,
        hasDevScript ? 'npm run dev dostępne' : 'Brak skryptu dev'
      );
    } catch (error) {
      this.test('Desktop package.json', false, 'Błąd odczytu package.json');
    }
  }

  async testMobileFiles() {
    console.log('\n📱 === MOBILE APP ===');
    
    const mobileFiles = [
      'mobile/index.html',
      'mobile/manifest.json',
      'mobile/js/app.js',
      'mobile-server.js'
    ];
    
    mobileFiles.forEach(file => {
      this.test(
        `Mobile: ${path.basename(file)}`,
        fs.existsSync(file),
        fs.existsSync(file) ? 'Istnieje' : 'Brakuje'
      );
    });

    // Test mobile-server config
    if (fs.existsSync('mobile-server.js')) {
      const serverContent = fs.readFileSync('mobile-server.js', 'utf8');
      const hasPort3001 = serverContent.includes('3001');
      this.test(
        'Mobile server port',
        hasPort3001,
        'Mobile server skonfigurowany na port 3001'
      );
    }
  }

  async testRailwayConfig() {
    console.log('\n🚂 === RAILWAY CONFIG ===');
    
    const railwayFiles = [
      'desktop/railway-backend/server.js',
      'desktop/railway-backend/package.json'
    ];
    
    railwayFiles.forEach(file => {
      this.test(
        `Railway: ${path.basename(file)}`,
        fs.existsSync(file),
        fs.existsSync(file) ? 'Istnieje' : 'Brakuje'
      );
    });

    // Test Railway package.json
    try {
      const railwayPkg = JSON.parse(fs.readFileSync('desktop/railway-backend/package.json', 'utf8'));
      this.test(
        'Railway start script',
        railwayPkg.scripts && railwayPkg.scripts.start,
        railwayPkg.scripts?.start ? `Start: ${railwayPkg.scripts.start}` : 'Brak start script'
      );
      
      this.test(
        'Node engine',
        railwayPkg.engines && railwayPkg.engines.node,
        railwayPkg.engines?.node ? `Node: ${railwayPkg.engines.node}` : 'Brak wymagań Node'
      );
    } catch (error) {
      this.test('Railway package.json', false, 'Błąd odczytu Railway package.json');
    }
  }

  async testSecurity() {
    console.log('\n🔒 === SECURITY CHECKS ===');
    
    // Test auth store
    if (fs.existsSync('desktop/src/stores/auth.js')) {
      const authContent = fs.readFileSync('desktop/src/stores/auth.js', 'utf8');
      
      this.test(
        'Hardcoded passwords',
        !authContent.includes('admin123'),
        'Znaleziono hardkodowane hasło demo',
        'warning'
      );
      
      this.test(
        'Base64 tokens',
        !authContent.includes('btoa('),
        'Używa base64 zamiast JWT',
        'warning'
      );
    }

    // Test API server
    if (fs.existsSync('desktop/src/electron/api-server.js')) {
      const apiContent = fs.readFileSync('desktop/src/electron/api-server.js', 'utf8');
      
      this.test(
        'Rate limiting',
        apiContent.includes('rateLimits'),
        'Rate limiting zaimplementowane'
      );
      
      this.test(
        'CORS configuration',
        apiContent.includes('cors'),
        'CORS skonfigurowane'
      );
    }

    // Test hardkodowane IP
    const jsFiles = this.findJSFiles(['mobile/js', 'desktop/src']);
    let hardcodedIPs = 0;
    
    jsFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('192.168.1.27') || content.includes('localhost') && content.includes('5174')) {
        hardcodedIPs++;
      }
    });
    
    this.test(
      'Hardcoded IPs',
      hardcodedIPs === 0,
      hardcodedIPs > 0 ? `Znaleziono ${hardcodedIPs} plików z hardkodowanymi IP` : 'Brak hardkodowanych IP',
      hardcodedIPs > 0 ? 'warning' : 'test'
    );
  }

  findJSFiles(dirs) {
    let files = [];
    dirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        files = files.concat(this.getJSFilesRecursive(dir));
      }
    });
    return files;
  }

  getJSFilesRecursive(dir) {
    let files = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files = files.concat(this.getJSFilesRecursive(fullPath));
      } else if (item.endsWith('.js') || item.endsWith('.vue')) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  getUserDataPath() {
    const os = require('os');
    const appName = 'system-serwisowy';
    
    switch (process.platform) {
      case 'win32':
        return path.join(os.homedir(), 'AppData', 'Roaming', appName);
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', appName);
      default:
        return path.join(os.homedir(), '.config', appName);
    }
  }

  generateReport() {
    console.log('\n📊 === RAPORT TESTÓW ===');
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
    
    const total = this.results.summary.passed + this.results.summary.failed;
    const successRate = total > 0 ? Math.round((this.results.summary.passed / total) * 100) : 0;
    
    console.log(`📈 Success Rate: ${successRate}%`);
    
    // Zapisz raport
    const reportPath = `./test-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Raport zapisany: ${reportPath}`);
    
    if (this.results.summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(t => !t.passed && t.type === 'test')
        .forEach(t => console.log(`   - ${t.name}: ${t.message}`));
    }
    
    if (this.results.summary.warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.tests
        .filter(t => t.type === 'warning')
        .forEach(t => console.log(`   - ${t.name}: ${t.message}`));
    }
  }
}

// URUCHOM TESTY
if (require.main === module) {
  (async () => {
    try {
      const tester = new SystemTester();
      const results = await tester.runAllTests();
      
      // Exit code based on results
      if (results.summary.failed > 0) {
        console.log('\n💥 Testy zakończone z błędami');
        process.exit(1);
      } else {
        console.log('\n🎯 Wszystkie testy przeszły pomyślnie');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('💥 BŁĄD TESTÓW:', error);
      process.exit(1);
    }
  })();
}

module.exports = SystemTester; 