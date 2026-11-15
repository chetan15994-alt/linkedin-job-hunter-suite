const fs = require('fs');
const path = require('path');

/**
 * 1. Pre-flight Chrome Profile Sanitizer
 * Removes dirty-shutdown flags so Chrome never prompts:
 * "Restore pages? Chromium didn't shut down correctly."
 */
function sanitizeChromeProfile(profileDir) {
  try {
    const prefPath = path.join(profileDir, 'Default', 'Preferences');
    if (fs.existsSync(prefPath)) {
      const content = fs.readFileSync(prefPath, 'utf-8');
      const prefs = JSON.parse(content);
      if (prefs.profile) {
        prefs.profile.exit_type = 'Normal';
        prefs.profile.exited_cleanly = true;
      }
      fs.writeFileSync(prefPath, JSON.stringify(prefs));
    }

    const localStatePath = path.join(profileDir, 'Local State');
    if (fs.existsSync(localStatePath)) {
      const content = fs.readFileSync(localStatePath, 'utf-8');
      const localState = JSON.parse(content);
      if (localState.user_experience_metrics) {
        localState.user_experience_metrics.stability_clean_exit = true;
        localState.user_experience_metrics.stability_crashed = false;
      }
      fs.writeFileSync(localStatePath, JSON.stringify(localState));
    }
    return true;
  } catch (err) {
    // Non-fatal if profile files don't exist yet
    return false;
  }
}

/**
 * 2. Real Google Chrome Binary Detection
 * Prefer authentic Google Chrome over bundled Chromium for genuine TLS,
 * GPU hardware acceleration, DRM, and Google code-signing signatures.
 */
function getChromeExecutable() {
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'darwin' && fs.existsSync(macChrome)) {
    return macChrome;
  }
  return undefined; // Playwright will fall back to its internal Chromium
}

/**
 * 3. Stealth Chrome Command-Line Arguments
 */
function getStealthLaunchArgs() {
  return [
    '--disable-blink-features=AutomationControlled',
    '--hide-crash-restore-bubble',
    '--disable-session-crashed-bubble',
    '--disable-infobars',
    '--no-default-browser-check',
    '--disable-features=IsolateOrigins,site-per-process',
    '--password-store=basic',
    '--use-mock-keychain',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ];
}

/**
 * 4. Runtime In-Browser Stealth Scripts
 * Masks navigator.webdriver, sets up window.chrome runtime, and simulates
 * authentic browser plugins and permissions to pass Sentinel and Cloudflare.
 */
async function setupStealthPage(page) {
  await page.addInitScript(() => {
    // 1. Mask navigator.webdriver
    try {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
      delete Object.getPrototypeOf(navigator).webdriver;
    } catch (e) {}

    // 2. Mock authentic window.chrome runtime
    if (!window.chrome) {
      window.chrome = {};
    }
    window.chrome.runtime = window.chrome.runtime || {};
    window.chrome.loadTimes = window.chrome.loadTimes || function() { return {}; };
    window.chrome.csi = window.chrome.csi || function() { return {}; };
    window.chrome.app = window.chrome.app || {};

    // 3. Mock authentic navigator.plugins (Chrome PDF Viewer)
    try {
      const mockPlugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
      ];
      Object.defineProperty(navigator, 'plugins', {
        get: () => mockPlugins,
        configurable: true
      });
    } catch (e) {}

    // 4. Mock authentic navigator.languages
    try {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });
    } catch (e) {}

    // 5. Mock permissions API query
    const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
    if (originalQuery) {
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    }
  });
}

module.exports = {
  sanitizeChromeProfile,
  getChromeExecutable,
  getStealthLaunchArgs,
  setupStealthPage
};
