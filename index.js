const path = require('path');
const { app, BrowserWindow } = require('electron');

// --- CRITICAL PERFORMANCE FLAGS ---
app.commandLine.appendSwitch('disable-frame-rate-limit');
app.commandLine.appendSwitch('force-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
// FIX 1: Prevents Chromium from crashing the GPU process when WebGL initializes
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('enable-webgl2-compute-context');
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');

function createClientWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 720,
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      // FIX 2: Bypasses strict CORS/Cross-Origin blocks on game assets
      webSecurity: false, 
      experimentalFeatures: true
    }
  });

  // FIX 3: Pretend to be standard Google Chrome to pass game client validation
  const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Load the game with the custom browser signature
  win.loadURL('https://deadshot.io', { userAgent: chromeUserAgent });

  // CRITICAL DEBUG: This will pop up a window side-by-side with your app
  win.webContents.openDevTools();

  // Error listener to catch and print exactly why it's breaking
  win.webContents.on('render-process-gone', (event, detailed) => {
    console.log(`CRASH DETECTED: ${detailed.reason}, Exit Code: ${detailed.exitCode}`);
  });
}

app.whenReady().then(() => {
  createClientWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createClientWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
