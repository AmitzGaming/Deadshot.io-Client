const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, Menu, ipcMain, nativeImage } = require('electron');

const COOKIE_STORE_PATH = path.join(__dirname, 'cookies');
const SETTINGS_FILE_PATH = path.join(COOKIE_STORE_PATH, 'settings.json');
let pingOverlayEnabled = true;
let fpsOverlayEnabled = true;

function updatePingMenuItem() {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;

  const item = menu.getMenuItemById('toggle-ping-overlay');
  if (item) {
    item.checked = pingOverlayEnabled;
  }
}

function ensureSettingDirectory() {
  if (!fs.existsSync(COOKIE_STORE_PATH)) {
    try {
      fs.mkdirSync(COOKIE_STORE_PATH, { recursive: true });
    } catch (e) {
      console.warn('Failed to create setting directory:', e);
    }
  }
}

function loadSettings() {
  ensureSettingDirectory();

  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, 'utf8');
      return Object.assign({ vsyncEnabled: true }, JSON.parse(raw));
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }

  return { vsyncEnabled: true };
}

function saveSettings(settings) {
  ensureSettingDirectory();

  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

app.setPath('userData', COOKIE_STORE_PATH);

// --- CRITICAL PERFORMANCE FLAGS ---
const settings = loadSettings();
if (!settings.vsyncEnabled) {
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  app.commandLine.appendSwitch('disable-gpu-vsync');
}
app.commandLine.appendSwitch('force-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
// FIX 1: Prevents Chromium from crashing the GPU process when WebGL initializes
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('enable-webgl2-compute-context');
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');

function createClientWindow() {
  // Prefer a user-supplied icon inside the `ico/` folder (app.ico or icon.png). Fall back to an inline SVG.
  let icon;
  try {
    const icoPath = path.join(__dirname, 'ico', 'app.ico');
    const pngPath = path.join(__dirname, 'ico', 'icon.png');
    if (fs.existsSync(icoPath)) {
      icon = nativeImage.createFromPath(icoPath);
    } else if (fs.existsSync(pngPath)) {
      icon = nativeImage.createFromPath(pngPath);
    }
  } catch (e) {
    icon = null;
  }

  if (!icon || icon.isEmpty && icon.isEmpty()) {
    const iconSvg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='0' stroke-linecap='round' stroke-linejoin='round'><rect width='24' height='24' rx='4' fill='#0b84ff'/><path d='M6 12h12v2H6z' fill='#fff' opacity='0.9'/></svg>`;
    icon = nativeImage.createFromDataURL('data:image/svg+xml;base64,' + Buffer.from(iconSvg).toString('base64'));
  }

  const win = new BrowserWindow({
    width: 1366,
    height: 720,
    fullscreen: true,
    autoHideMenuBar: true,
    icon,
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

  const loadingHtml = `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Loading…</title><style>body{margin:0;background:#070714;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,Segoe UI,Arial,sans-serif} .loader{display:flex;flex-direction:column;align-items:center;gap:20px} .spinner{width:72px;height:72px;border:8px solid rgba(255,255,255,.12);border-top-color:#4cc9f0;border-radius:50%;animation:spin 1s linear infinite} .text{font-size:1rem;text-align:center;max-width:320px;line-height:1.5} @keyframes spin{to{transform:rotate(360deg)}}</style></head><body><div class="loader"><div class="spinner"></div><div class="text">Deadshot.io client is loading...<br>Preparing your session.</div></div></body></html>`)} `;

  win.loadURL(loadingHtml);

  win.webContents.once('did-finish-load', () => {
    win.loadURL('https://deadshot.io', { userAgent: chromeUserAgent });
  });

  win.webContents.on('did-finish-load', () => {
    if (win.webContents.getURL().startsWith('https://deadshot.io')) {
      win.webContents.send('ping-overlay-toggle', pingOverlayEnabled);
      win.webContents.send('fps-overlay-toggle', fpsOverlayEnabled);
    }
  });

  setupAppMenu(win);

  win.webContents.on('render-process-gone', (event, detailed) => {
    console.log(`CRASH DETECTED: ${detailed.reason}, Exit Code: ${detailed.exitCode}`);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.warn(`Main frame failed to load: ${validatedURL} (${errorCode}) ${errorDescription}`);
    }
  });

  win.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
    }
  });
}

function setupAppMenu(win) {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Open Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (win && !win.isDestroyed()) {
              win.webContents.send('open-settings-overlay');
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          id: 'toggle-ping-overlay',
          label: 'Toggle Ping Overlay',
          accelerator: 'CmdOrCtrl+P',
          type: 'checkbox',
          checked: pingOverlayEnabled,
          click: (menuItem) => {
            pingOverlayEnabled = menuItem.checked;
            if (win && !win.isDestroyed()) {
              win.webContents.send('ping-overlay-toggle', pingOverlayEnabled);
            }
          }
        },
        {
          id: 'toggle-fps-overlay',
          label: 'Toggle FPS Overlay',
          accelerator: 'CmdOrCtrl+F',
          type: 'checkbox',
          checked: fpsOverlayEnabled,
          click: (menuItem) => {
            fpsOverlayEnabled = menuItem.checked;
            if (win && !win.isDestroyed()) {
              win.webContents.send('fps-overlay-toggle', fpsOverlayEnabled);
            }
          }
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'reload' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createClientWindow();

  ipcMain.on('renderer-toggle-ping-overlay', (event) => {
    pingOverlayEnabled = !pingOverlayEnabled;
    updatePingMenuItem();
    event.sender.send('ping-overlay-toggle', pingOverlayEnabled);
  });

  ipcMain.on('renderer-settings-update', (_event, newSettings) => {
    if (newSettings && typeof newSettings.vsyncEnabled === 'boolean') {
      saveSettings({ vsyncEnabled: newSettings.vsyncEnabled });
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createClientWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
