const { ipcRenderer } = require('electron');
const PING_TARGET = 'https://deadshot.io/';
const OVERLAY_ID = 'deadshot-ping-viewer-overlay';
const FPS_OVERLAY_ID = 'deadshot-fps-viewer-overlay';

let featuresEnabled = true;
let sniperModeEnabled = true;
let fireworkInterval = null;
let kKeyInterval = null;
let isRightMousePressed = false;
let spacebarLockEnabled = false;
let fpsDisplay = null;
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
const fpsThreshold = 30;
const SETTINGS_STORAGE_KEY = 'deadshotio_client_settings';
let vsyncEnabled = true;

const newSettingsContent = `
    <div class="setting toggle" style="padding: 9px 30px;">
        <p style="font-size: 21px;">Sniper Mode</p>
        <label>
            <input id="vfSniperMode" class="checkbox" type="checkbox">
            <span></span>
        </label>
    </div>
    <div class="setting toggle" style="padding: 9px 30px; background-color: rgba(255, 255, 255, 0.03);">
        <p style="font-size: 21px;">Vortex Forge Mode</p>
        <label>
            <input id="vfsettings" class="checkbox" type="checkbox" checked="">
            <span></span>
        </label>
    </div>
    `;

function loadRendererSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.vsyncEnabled === 'boolean') {
        vsyncEnabled = parsed.vsyncEnabled;
      }
    }
  } catch (e) {
    console.warn('Failed to load renderer settings:', e);
  }
}

function saveRendererSettings() {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ vsyncEnabled }));
    ipcRenderer.send('renderer-settings-update', { vsyncEnabled });
  } catch (e) {
    console.warn('Failed to save renderer settings:', e);
  }
}

function createSettingsOverlay() {
  if (document.getElementById('custom-settings-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'custom-settings-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.72);backdrop-filter:blur(12px);z-index:100000;';
  overlay.innerHTML = `
    <div style="width:min(760px,calc(100%-40px));background:rgba(8,10,20,0.95);border:1px solid rgba(255,255,255,0.08);border-radius:24px;box-shadow:0 28px 100px rgba(0,0,0,0.5);overflow:hidden;color:#fff;font-family:system-ui,Segoe UI,Arial,sans-serif;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:24px 28px;background:linear-gradient(90deg,#0b84ff,#7c3aed);">
        <div>
          <div style="font-size:1.35rem;font-weight:700;letter-spacing:0.02em;">Client Settings</div>
          <div style="font-size:0.95rem;opacity:0.86;margin-top:4px;">VSync and feature controls live here.</div>
        </div>
        <button id="custom-settings-close" style="background:rgba(255,255,255,0.12);border:none;color:#fff;width:42px;height:42px;border-radius:50%;cursor:pointer;font-size:1.4rem;line-height:1;">×</button>
      </div>
      <div style="padding:24px 28px;display:grid;gap:18px;">
        <div style="display:grid;gap:12px;padding:20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
            <div>
              <div style="font-size:1.08rem;font-weight:700;">VSync</div>
              <div style="font-size:0.92rem;opacity:0.82;">Sync render updates to your display refresh rate for smoother motion.</div>
            </div>
            <label style="position:relative;display:inline-block;width:56px;height:32px;">
              <input id="toggle-vsync-checkbox" type="checkbox" style="opacity:0;width:0;height:0;">
              <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#344154;border-radius:999px;transition:.3s;"></span>
              <span style="position:absolute;left:4px;top:4px;width:24px;height:24px;background:#fff;border-radius:50%;transition:.3s;"></span>
            </label>
          </div>
          <div id="vsync-hint" style="font-size:0.9rem;opacity:0.75;">Changes will be stored locally and are applied after restart.</div>
        </div>
        <div style="display:grid;gap:12px;padding:20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
            <div>
              <div style="font-size:1.08rem;font-weight:700;">Ping Overlay</div>
              <div style="font-size:0.92rem;opacity:0.82;">Quickly toggle the ping display from settings.</div>
            </div>
            <button id="open-ping-settings" style="border:none;background:#0b84ff;color:#fff;padding:10px 16px;border-radius:999px;cursor:pointer;font-weight:700;">Open</button>
          </div>
        </div>
        <div style="display:grid;gap:12px;padding:20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
            <div>
              <div style="font-size:1.08rem;font-weight:700;">Other Features</div>
              <div style="font-size:0.92rem;opacity:0.82;">Future controls and enhancements will appear here.</div>
            </div>
            <span style="padding:10px 16px;border-radius:999px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.92);font-size:0.88rem;">Coming soon</span>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <button id="custom-settings-close-2" style="background:transparent;border:1px solid rgba(255,255,255,0.18);color:#fff;padding:12px 18px;border-radius:12px;cursor:pointer;">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const style = document.createElement('style');
  style.id = 'custom-settings-style';
  style.textContent = `
    #toggle-vsync-checkbox:checked + span { background: #0b84ff; }
    #toggle-vsync-checkbox:checked + span + span { transform: translateX(24px); }
  `;
  document.head.appendChild(style);

  document.getElementById('custom-settings-close').addEventListener('click', closeSettingsOverlay);
  document.getElementById('custom-settings-close-2').addEventListener('click', closeSettingsOverlay);
  document.getElementById('toggle-vsync-checkbox').addEventListener('change', (event) => {
    vsyncEnabled = event.target.checked;
    saveRendererSettings();
    updateVsyncHint();
  });
  document.getElementById('open-ping-settings').addEventListener('click', () => {
    closeSettingsOverlay();
    ipcRenderer.send('renderer-toggle-ping-overlay');
  });
}

function setSettingsOverlayValues() {
  const checkbox = document.getElementById('toggle-vsync-checkbox');
  if (checkbox) {
    checkbox.checked = vsyncEnabled;
  }
  updateVsyncHint();
}

function updateVsyncHint() {
  const hint = document.getElementById('vsync-hint');
  if (hint) {
    hint.textContent = vsyncEnabled
      ? 'VSync is enabled. Restart the client to apply the new display sync mode.'
      : 'VSync is disabled. Restart the client to apply the new display sync mode.';
  }
}

function openSettingsOverlay() {
  createSettingsOverlay();
  setSettingsOverlayValues();
  const overlay = document.getElementById('custom-settings-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
}

function closeSettingsOverlay() {
  const overlay = document.getElementById('custom-settings-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

ipcRenderer.on('open-settings-overlay', () => {
  openSettingsOverlay();
});


function removeLeftHandedSetting() {
  const leftHandedDiv = document.querySelector('.setting.toggle input#lefthand')?.closest('.setting.toggle');
  if (leftHandedDiv) {
    leftHandedDiv.remove();
    console.log("Left-Handed setting removed.");
  }
}

function removeADSToggle() {
  const leftHandedDiv = document.querySelector('.setting.toggle input#toggleads')?.closest('.setting.toggle');
  if (leftHandedDiv) {
    leftHandedDiv.remove();
    console.log("Toggle ADS removed.");
  }
}

function addCustomSettingsToTop() {
  const settingsDiv = document.getElementById('settingsDiv');
  if (settingsDiv && !document.getElementById('vfSniperMode')) {
    const customDiv = document.createElement('div');
    customDiv.innerHTML = newSettingsContent;
    settingsDiv.insertBefore(customDiv, settingsDiv.firstChild);

  }
}

function waitForSettingsDiv() {
  const retryInterval = setInterval(() => {
    const settingsDiv = document.getElementById('settingsDiv');
    if (settingsDiv) {
      removeLeftHandedSetting();
      removeADSToggle();
      addCustomSettingsToTop();
      setupSniperModeToggle();
      setupVortexForgeModeToggle();
      clearInterval(retryInterval);
    }
  }, 500);
}

function setupSniperModeToggle() {
  const sniperModeCheckbox = document.getElementById('vfSniperMode');
  if (sniperModeCheckbox) {
    sniperModeCheckbox.addEventListener('change', (event) => {
      sniperModeEnabled = event.target.checked;
    });
  }
}

function setupVortexForgeModeToggle() {
  const vfCheckbox = document.getElementById('vfsettings');
  if (vfCheckbox) {
    vfCheckbox.addEventListener('change', (event) => {
      featuresEnabled = event.target.checked;
      toggleFeatures(featuresEnabled);
    });
  }
}

function toggleFeatures(enabled) {
  if (!enabled) {
    stopKKeyPress();
    isRightMousePressed = false;
  }
}

function startKKeyPress() {
  if (!kKeyInterval) {
    kKeyInterval = setInterval(() => {
      const kKeyEvent = new KeyboardEvent('keydown', {
        key: 'K',
        code: 'KeyK',
        keyCode: 75,
        which: 75,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(kKeyEvent);
    }, 100);
  }
}

function stopKKeyPress() {
  if (kKeyInterval) {
    clearInterval(kKeyInterval);
    kKeyInterval = null;

    const kKeyUpEvent = new KeyboardEvent('keyup', {
      key: 'K',
      code: 'KeyK',
      keyCode: 75,
      which: 75,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(kKeyUpEvent);
  }
}

function getScreenCenter() {
  const canvas = document.querySelector('canvas');
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function getElementCenter(el) {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function startShooting() {
  const shootKeyEvent = new KeyboardEvent('keydown', {
    key: 'K',
    code: 'KeyK',
    keyCode: 75,
    which: 75,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(shootKeyEvent);

  const shootKeyUpEvent = new KeyboardEvent('keyup', {
    key: 'K',
    code: 'KeyK',
    keyCode: 75,
    which: 75,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(shootKeyUpEvent);
}

document.addEventListener('mousedown', (e) => {
  if (!featuresEnabled) return;

  if (e.button === 2) {
    if (!isRightMousePressed) {
      isRightMousePressed = true;

      if (!sniperModeEnabled) {
        startKKeyPress();
      }
    }
  }
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    if (sniperModeEnabled) {
      startShooting();
    } else {
      stopKKeyPress();
    }

    isRightMousePressed = false;
  }
});

function createFPSDisplay() {
  fpsDisplay = document.createElement('div');
  fpsDisplay.style.position = 'fixed';
  fpsDisplay.style.bottom = '10px';
  fpsDisplay.style.right = '10px';
  fpsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  fpsDisplay.style.padding = '10px';
  fpsDisplay.style.borderRadius = '5px';
  fpsDisplay.style.color = 'white';
  fpsDisplay.style.fontSize = '14px';
  fpsDisplay.style.zIndex = '10000';
  document.body.appendChild(fpsDisplay);
}

function updateFPS() {
  const now = performance.now();
  frameCount++;

  if (now - lastFrameTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFrameTime = now;
    fpsDisplay.innerText = `FPS: ${fps}`;
    if (fps < fpsThreshold) {
      boostFPS();
    }
  }
  requestAnimationFrame(updateFPS);
}

function boostFPS() {
  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.style.imageRendering = 'pixelated';
  });
  reduceGraphicsQuality();
}

function reduceGraphicsQuality() {
  const elementsToModify = [
    ...document.querySelectorAll('img, video, canvas')
  ];
  elementsToModify.forEach(el => {
    el.style.filter = 'brightness(0.9) contrast(0.9)';
  });
}

window.addEventListener('load', () => {
  loadRendererSettings();
  createSettingsOverlay();
  waitForSettingsDiv();
  createFPSDisplay();
  updateFPS();
});

