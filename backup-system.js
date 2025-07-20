const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BackupSystem {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
    this.backupDir = `./backups/pre-fixes-${this.timestamp[0]}-${this.timestamp[1].split('.')[0]}`;
  }

  async createFullBackup() {
    console.log('🛡️ === TWORZENIE PEŁNEGO BACKUP ===');
    
    // Utwórz katalog backup
    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups', { recursive: true });
    }
    fs.mkdirSync(this.backupDir, { recursive: true });

    try {
      // 1. BACKUP KODU - Git snapshot
      console.log('📁 1/4 - Backup kodu...');
      execSync(`git add . && git commit -m "BACKUP: Stan przed naprawami ${this.timestamp[0]}" || echo "No changes to commit"`);
      execSync(`git tag -a "backup-${this.timestamp[0]}" -m "BACKUP przed naprawami bezpieczeństwa"`);
      
      // 2. BACKUP BAZY DANYCH
      console.log('💾 2/4 - Backup bazy danych...');
      const userDataPath = this.getUserDataPath();
      const dbPath = path.join(userDataPath, 'serwis.db');
      
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, path.join(this.backupDir, 'serwis-backup.db'));
        console.log(`   ✓ Baza skopiowana: ${dbPath}`);
      } else {
        console.log('   ⚠️ Baza danych nie istnieje jeszcze');
      }

      // 3. BACKUP PACKAGE.JSON i CONFIG
      console.log('⚙️ 3/4 - Backup konfiguracji...');
      this.backupConfig();

      // 4. BACKUP NODE_MODULES versions
      console.log('📦 4/4 - Backup wersji pakietów...');
      this.backupDependencies();

      console.log(`✅ === BACKUP KOMPLETNY ===`);
      console.log(`📂 Lokalizacja: ${this.backupDir}`);
      console.log(`🏷️ Git tag: backup-${this.timestamp[0]}`);
      
      return this.backupDir;

    } catch (error) {
      console.error('❌ Błąd podczas backup:', error);
      throw error;
    }
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

  backupConfig() {
    const configs = [
      'package.json',
      'package-lock.json',
      'desktop/package.json',
      'desktop/vite.config.js',
      'desktop/tailwind.config.js',
      'desktop/railway-backend/package.json',
      'mobile/manifest.json'
    ];

    configs.forEach(configFile => {
      if (fs.existsSync(configFile)) {
        const targetPath = path.join(this.backupDir, configFile);
        const targetDir = path.dirname(targetPath);
        
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        fs.copyFileSync(configFile, targetPath);
        console.log(`   ✓ ${configFile}`);
      }
    });
  }

  backupDependencies() {
    try {
      const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
      const versions = {
        timestamp: new Date().toISOString(),
        node_version: process.version,
        npm_version: execSync('npm --version', { encoding: 'utf8' }).trim(),
        dependencies: packageLock.packages
      };
      
      fs.writeFileSync(
        path.join(this.backupDir, 'dependency-versions.json'),
        JSON.stringify(versions, null, 2)
      );
      console.log('   ✓ dependency-versions.json');
    } catch (error) {
      console.log('   ⚠️ Nie udało się zapisać wersji pakietów');
    }
  }

  // ROLLBACK SYSTEM
  static createRollbackScript(backupDir) {
    const rollbackScript = `#!/bin/bash
# ROLLBACK SCRIPT - Powrót do stanu przed naprawami
echo "🔄 === ROLLBACK DO BACKUP ==="

# 1. Cofnij Git
echo "📁 1/3 - Rollback kodu..."
git reset --hard backup-${new Date().toISOString().split('T')[0]}

# 2. Przywróć bazę danych
echo "💾 2/3 - Rollback bazy danych..."
USER_DATA=$(node -e "
const os = require('os');
const path = require('path');
const appName = 'system-serwisowy';
switch (process.platform) {
  case 'win32': console.log(path.join(os.homedir(), 'AppData', 'Roaming', appName)); break;
  case 'darwin': console.log(path.join(os.homedir(), 'Library', 'Application Support', appName)); break;
  default: console.log(path.join(os.homedir(), '.config', appName));
}
")

if [ -f "${backupDir}/serwis-backup.db" ]; then
  cp "${backupDir}/serwis-backup.db" "$USER_DATA/serwis.db"
  echo "   ✓ Baza przywrócona"
else
  echo "   ⚠️ Backup bazy nie istnieje"
fi

# 3. Reinstall dependencies
echo "📦 3/3 - Rollback pakietów..."
npm install

echo "✅ === ROLLBACK KOMPLETNY ==="
echo "🚀 Uruchom: npm run dev:desktop"
`;

    fs.writeFileSync(path.join(backupDir, 'rollback.sh'), rollbackScript);
    fs.writeFileSync(path.join(backupDir, 'rollback.bat'), rollbackScript.replace('#!/bin/bash', '@echo off'));
    console.log(`🔄 Skrypt rollback: ${backupDir}/rollback.sh`);
  }
}

// URUCHOM BACKUP
if (require.main === module) {
  (async () => {
    try {
      const backup = new BackupSystem();
      const backupDir = await backup.createFullBackup();
      BackupSystem.createRollbackScript(backupDir);
      
      console.log('\n🎯 === GOTOWE DO BEZPIECZNYCH ZMIAN ===');
      console.log('📋 Następne kroki:');
      console.log('1. Uruchom testy: node test-system.js');  
      console.log('2. Zacznij naprawki: node security-fixes.js');
      console.log('3. W razie problemów: ./rollback.sh');
      
    } catch (error) {
      console.error('💥 BŁĄD BACKUP:', error);
      process.exit(1);
    }
  })();
}

module.exports = BackupSystem; 