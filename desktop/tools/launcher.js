#!/usr/bin/env node
/*
  Start-Serwis Launcher (Windows friendly)
  - Kills stray electron/node dev processes
  - Frees Vite port 5173 if occupied
  - Installs deps if missing
  - Starts desktop dev: Vite (5173) + Electron
*/

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Simple file logging so user can see why launcher failed
const LOG_DIR = path.resolve(process.cwd(), 'logs')
const LOG_PATH = path.join(LOG_DIR, `launcher_${new Date().toISOString().replace(/[:.]/g, '-')}.log`)
function ensureLogDir() { try { if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true }) } catch (_) {} }
function writeLog(line) { try { ensureLogDir(); fs.appendFileSync(LOG_PATH, line + '\n') } catch (_) {} }

function log(section, msg) {
  const t = new Date().toLocaleTimeString()
  const line = `[${t}] ${section} ${msg}`
  try { console.log(line) } catch (_) {}
  writeLog(line)
}

function runPowershell(ps) {
  try {
    const out = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`, { stdio: 'pipe' }).toString()
    writeLog(`[ps] ${ps}`)
    return out
  } catch (e) {
    const err = e?.stdout?.toString() || e?.message || 'unknown'
    writeLog(`[ps-error] ${ps} :: ${err}`)
    return ''
  }
}

function killProcessByName(name) {
  try { runPowershell(`taskkill /F /IM ${name}`) } catch (_) {}
}

function freePort(port) {
  try {
    const out = runPowershell(`Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`)
    const pids = (out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    for (const pid of pids) {
      try { runPowershell(`Stop-Process -Id ${pid} -Force`) } catch (_) {}
    }
  } catch (_) {}
}

function ensureDeps(cwd) {
  log('deps', `Target dir: ${cwd}`)
  const pkgJson = path.join(cwd, 'package.json')
  if (!fs.existsSync(pkgJson)) {
    log('deps-error', `package.json not found in ${cwd}`)
    return
  }
  const nm = path.join(cwd, 'node_modules')
  if (fs.existsSync(nm)) return
  log('deps', 'Installing dependencies (this may take a minute)...')
  // Use PowerShell to avoid cmd.exe dependency inside pkg
  try {
    runPowershell(`Set-Location -LiteralPath '${cwd}'; npm ci --no-audit --fund=false`)
  } catch (e) {
    log('deps-error', 'Automatic install failed, please run: cd desktop && npm install')
  }
}

async function main() {
  console.log('\n========================================')
  console.log('   🚀 Start-Serwis Launcher')
  console.log('========================================\n')
  writeLog(`Log file: ${LOG_PATH}`)

  // In pkg, __dirname points to virtual snapshot. Use executable dir.
  const appDir = path.dirname(process.execPath)
  const desktopDir = path.join(appDir, 'desktop')
  log('info', `Base dir: ${appDir}`)
  log('info', `Desktop dir: ${desktopDir}`)
  log('step', 'Stopping old processes (electron/node)')
  killProcessByName('electron.exe')
  killProcessByName('node.exe')

  log('step', 'Freeing Vite port 5173 if used')
  freePort(5173)

  log('step', 'Ensuring dependencies')
  ensureDeps(desktopDir)

  log('step', 'Starting dev servers (Vite + Electron)')
  const psCmd = `Set-Location -LiteralPath '${desktopDir}'; npm run dev`
  const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCmd], { stdio: 'inherit' })

  child.on('exit', (code) => {
    log('done', `Dev exited with code ${code}`)
  })
}

main().catch(err => {
  console.error('❌ Launcher error:', err?.message || err)
  writeLog('ERROR: ' + (err?.stack || err?.message || String(err)))
  process.exit(1)
})


