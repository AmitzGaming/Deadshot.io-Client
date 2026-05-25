const PING_TARGET = 'https://deadshot.io/';
const OVERLAY_ID = 'deadshot-ping-viewer-overlay';
const PING_INTERVAL_MS = 800;
const PING_DURATION_MS = 5000;

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
  let hideTimeout = 0;
  let pingInterval = 0;
  let stopPingTimeout = 0;

  const hideOverlay = () => {
    overlay.style.opacity = '0';
    overlay.style.transform = 'translateY(8px)';
  };

  const showOverlay = (text) => {
    overlay.textContent = text;
    overlay.style.opacity = '1';
    overlay.style.transform = 'translateY(0)';
    if (hideTimeout) {
      window.clearTimeout(hideTimeout);
    }
    hideTimeout = window.setTimeout(hideOverlay, 2500);
  };

  const stopRealtimePing = () => {
    if (pingInterval) {
      window.clearInterval(pingInterval);
      pingInterval = 0;
    }
    if (stopPingTimeout) {
      window.clearTimeout(stopPingTimeout);
      stopPingTimeout = 0;
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
    stopRealtimePing();
    showOverlay('Realtime ping...');
    updatePing();
    pingInterval = window.setInterval(updatePing, PING_INTERVAL_MS);
    stopPingTimeout = window.setTimeout(stopRealtimePing, PING_DURATION_MS);
  };

  const onBackspace = (event) => {
    if (event.key !== 'Backspace' && event.code !== 'Backspace') {
      return;
    }

    startRealtimePing();
  };

  window.addEventListener('keydown', onBackspace, true);
});
