import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'

function getAssetPath(...parts: string[]): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'src', 'assets', ...parts)
  }
  return path.join(app.getAppPath(), 'src', 'assets', ...parts)
}

// Must be called before app is ready
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disk-cache-size', '1')

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let backendProcess: any = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // Allow fetch to localhost
    },
    show: false,
    icon: getAssetPath('icon.ico')
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray() {
  const iconPath = getAssetPath('tray-icon.png')
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip('GAT - Game Activity Tracker')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Quit GAT', click: () => { isQuitting = true; app.quit() } }
  ]))
  tray.on('double-click', () => mainWindow?.show())
}

function startBackendServer() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'gat-backend.exe')
    : path.join(app.getAppPath(), 'backend', 'gat-backend.exe')

  if (fs.existsSync(backendPath)) {
    backendProcess = spawn(backendPath, [], {
      detached: process.platform !== 'win32',
      stdio: 'ignore'
    })
    
    if (process.platform !== 'win32') {
      backendProcess.unref()
    }
  } else {
    console.warn('Backend executable not found at', backendPath)
  }
}

app.whenReady().then(() => {
  startBackendServer()
  
  // Wait for backend to start
  setTimeout(() => {
    createWindow()
    createTray()
  }, 1000)
})

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') {
    if (backendProcess) backendProcess.kill()
    app.quit()
  }
})
