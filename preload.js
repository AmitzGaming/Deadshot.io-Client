const { ipcRenderer } = require('electron');
const PING_TARGET = 'https://deadshot.io/';
const OVERLAY_ID = 'deadshot-ping-viewer-overlay';
const FPS_OVERLAY_ID = 'deadshot-fps-viewer-overlay';

function createPingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = [
    'position: fixed',
    'right: 16px',
    'bottom: 16px',
    'z-index: 999999999',
    'padding: 10px 14px',
    'border-radius: 10px',
    'background: rgba(0, 0, 0, 0.78)',
    'color: #fff',
    'font-family: system-ui, sans-serif',
    'font-size: 14px',
    'font-weight: 600',
    'letter-spacing: 0.02em',
    'box-shadow: 0 12px 28px rgba(0, 0, 0, 0.36)',
    'pointer-events: none',
    'opacity: 0',
    'transform: translateY(8px)',
    'transition: opacity 180ms ease, transform 180ms ease'
  ].join(';');
  overlay.textContent = 'Backspace = ping';
  document.body.appendChild(overlay);
  return overlay;
}

function createFPSOverlay() {
  const overlay = document.createElement('div');
  overlay.id = FPS_OVERLAY_ID;
  overlay.style.cssText = [
    'position: fixed',
    'right: 16px',
    'bottom: 56px',
    'z-index: 999999999',
    'padding: 10px 14px',
    'border-radius: 10px',
    'background: rgba(0, 0, 0, 0.78)',
    'color: #fff',
    'font-family: system-ui, sans-serif',
    'font-size: 14px',
    'font-weight: 600',
    'letter-spacing: 0.02em',
    'box-shadow: 0 12px 28px rgba(0, 0, 0, 0.36)',
    'pointer-events: none',
    'opacity: 0',
    'transform: translateY(8px)',
    'transition: opacity 180ms ease, transform 180ms ease'
  ].join(';');
  overlay.textContent = 'Enter = fps';
  document.body.appendChild(overlay);
  return overlay;
}

async function measurePing() {
  const start = performance.now();
  try {
    await fetch(PING_TARGET, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'omit'
    });
    return Math.round(performance.now() - start);
  } catch (headError) {
    try {
      await fetch(PING_TARGET, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit'
      });
      return Math.round(performance.now() - start);
    } catch (error) {
      throw error;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const overlay = createPingOverlay();
  const fpsOverlay = createFPSOverlay();
  let hideTimeout = 0;
  let pingInterval = 0;
  let pingOverlayEnabled = true;
  let fpsOverlayEnabled = true;
  let fpsActive = false;
  let fpsAnimationFrameId = 0;
  let lastFrameTime = 0;

  const hideOverlay = () => {
    overlay.style.opacity = '0';
    overlay.style.transform = 'translateY(8px)';
  };

  const showOverlay = (text) => {
    if (!pingOverlayEnabled) {
      return;
    }

    overlay.textContent = text;
    overlay.style.opacity = '1';
    overlay.style.transform = 'translateY(0)';
    if (hideTimeout) {
      window.clearTimeout(hideTimeout);
    }
    hideTimeout = window.setTimeout(hideOverlay, 2500);
  };

  const showFPSOverlay = (text) => {
    if (!fpsOverlayEnabled) {
      return;
    }

    fpsOverlay.textContent = text;
    fpsOverlay.style.opacity = '1';
    fpsOverlay.style.transform = 'translateY(0)';
  };

  const hideFPSOverlay = () => {
    fpsOverlay.style.opacity = '0';
    fpsOverlay.style.transform = 'translateY(8px)';
  };

  const stopRealtimePing = () => {
    if (pingInterval) {
      window.clearInterval(pingInterval);
      pingInterval = 0;
    }
    hideOverlay();
  };

  const updatePing = async () => {
    try {
      const ping = await measurePing();
      showOverlay(`Realtime ping: ${ping} ms`);
    } catch (err) {
      console.error('Ping viewer error:', err);
      showOverlay('Ping failed');
    }
  };

  const startRealtimePing = () => {
    if (pingInterval) {
      return;
    }

    showOverlay('Realtime ping...');
    updatePing();
    pingInterval = window.setInterval(updatePing, 500);
  };

  const togglePing = () => {
    if (!pingOverlayEnabled) {
      pingOverlayEnabled = true;
      startRealtimePing();
      showOverlay('Ping overlay enabled');
      return;
    }

    pingOverlayEnabled = false;
    stopRealtimePing();
    showOverlay('Ping overlay disabled');
  };

  const fpsFrame = (time) => {
    if (!fpsActive) {
      return;
    }

    if (lastFrameTime) {
      const delta = time - lastFrameTime;
      const fps = delta > 0 ? Math.round(1000 / delta) : 0;
      showFPSOverlay(`FPS: ${fps}`);
    }

    lastFrameTime = time;
    fpsAnimationFrameId = window.requestAnimationFrame(fpsFrame);
  };

  const startFPS = () => {
    if (fpsActive) {
      return;
    }

    fpsActive = true;
    lastFrameTime = 0;
    showFPSOverlay('FPS: calculating...');
    fpsAnimationFrameId = window.requestAnimationFrame(fpsFrame);
  };

  const stopFPS = () => {
    if (!fpsActive) {
      return;
    }

    fpsActive = false;
    lastFrameTime = 0;
    if (fpsAnimationFrameId) {
      window.cancelAnimationFrame(fpsAnimationFrameId);
      fpsAnimationFrameId = 0;
    }
    hideFPSOverlay();
  };

  const toggleFPS = () => {
    if (!fpsOverlayEnabled) {
      return;
    }

    if (fpsActive) {
      stopFPS();
    } else {
      startFPS();
    }
  };

  const onBackspace = (event) => {
    if (event.key !== 'Backspace' && event.code !== 'Backspace') {
      return;
    }

    ipcRenderer.send('renderer-toggle-ping-overlay');
  };

  const onEnter = (event) => {
    if (!fpsOverlayEnabled) {
      return;
    }

    if (event.key !== 'Enter' && event.code !== 'Enter') {
      return;
    }

    toggleFPS();
  };

  ipcRenderer.on('ping-overlay-toggle', (_event, enabled) => {
    const wasEnabled = pingOverlayEnabled;
    pingOverlayEnabled = enabled;
    if (!enabled) {
      stopRealtimePing();
      showOverlay('Ping overlay disabled');
    } else {
      if (!wasEnabled) {
        startRealtimePing();
        showOverlay('Ping overlay enabled');
      }
    }
  });

  ipcRenderer.on('fps-overlay-toggle', (_event, enabled) => {
    fpsOverlayEnabled = enabled;
    if (!enabled) {
      stopFPS();
    } else {
      showFPSOverlay('FPS overlay enabled');
    }
  });

  window.addEventListener('keydown', onBackspace, true);
  window.addEventListener('keydown', onEnter, true);
});
