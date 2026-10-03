import puppeteer from 'puppeteer-core';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';

const DEFAULT_PORT = parseInt(process.env.FLOW_DEBUG_PORT || process.env.DEBUG_PORT || '9222', 10);
const DEFAULT_URL = process.env.FLOW_URL || process.env.TARGET_URL || 'https://flow.google.com';
const PROFILE_DIR = process.env.FLOW_PROFILE_DIR || path.join(os.homedir(), '.google-flow-mcp', 'profile');

/**
 * Universally discovers Chromium executable across macOS, Linux, and Windows.
 * Supports Chrome, Arc, Brave, Edge, Chromium, or BROWSER_PATH / CHROME_PATH env vars.
 */
export function getBrowserExecutable() {
  if (process.env.BROWSER_PATH && fs.existsSync(process.env.BROWSER_PATH)) {
    return process.env.BROWSER_PATH;
  }
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const platform = os.platform();
  const candidates = [];

  if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Arc.app/Contents/MacOS/Arc',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      path.join(os.homedir(), 'Applications/Brave Browser.app/Contents/MacOS/Brave Browser')
    );
  } else if (platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local');

    candidates.push(
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
    );
  } else {
    // Linux
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium'
    );
    for (const bin of ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser', 'brave-browser']) {
      try {
        const found = execSync(`which ${bin} 2>/dev/null`, { encoding: 'utf-8' }).trim();
        if (found) candidates.push(found);
      } catch {}
    }
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    `No Chromium-based browser executable found on ${platform}. Please install Google Chrome, Brave, Edge, or set BROWSER_PATH in your environment.`
  );
}

let activeBrowser = null;
let activePage = null;
let isHeadless = true;

/**
 * Gets or initializes the browser connection.
 * Priority:
 * 1. Reuses existing active connection if alive.
 * 2. Checks if an active browser is on port 9222 and attaches.
 * 3. Launches a quiet headless background Chromium with persistent profile.
 */
export async function getBrowser({ port = DEFAULT_PORT, headed = false, forceRestart = false } = {}) {
  if (forceRestart && activeBrowser) {
    await closeBrowser();
  }

  if (activeBrowser && activeBrowser.connected) {
    return { browser: activeBrowser, mode: isHeadless ? 'headless' : 'headed' };
  }

  // 1. Check existing remote debugging port
  if (!headed) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(800),
      });
      if (res.ok) {
        activeBrowser = await puppeteer.connect({
          browserURL: `http://127.0.0.1:${port}`,
          defaultViewport: null,
        });
        isHeadless = false;
        hookDisconnect(activeBrowser);
        return { browser: activeBrowser, mode: 'attached' };
      }
    } catch {
      // Port not running, proceed to auto-launch
    }
  }

  // 2. Launch background Chromium instance
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const execPath = getBrowserExecutable();
  isHeadless = !headed;

  activeBrowser = await puppeteer.launch({
    headless: isHeadless ? 'new' : false,
    executablePath: execPath,
    userDataDir: PROFILE_DIR,
    defaultViewport: null,
    args: [
      `--remote-debugging-port=${port}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-search-engine-choice-screen',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });

  hookDisconnect(activeBrowser);
  return { browser: activeBrowser, mode: isHeadless ? 'headless' : 'headed' };
}

function hookDisconnect(browser) {
  browser.on('disconnected', () => {
    activeBrowser = null;
    activePage = null;
  });
}

/**
 * Finds or navigates to the target page (Google Flow or any configured URL).
 */
export async function getFlowPage(browser, targetUrl = DEFAULT_URL) {
  if (activePage && !activePage.isClosed() && activePage.browser().connected) {
    return activePage;
  }

  const pages = await browser.pages();
  for (const p of pages) {
    const u = p.url();
    if (u.includes('flow.google.com') || (targetUrl !== DEFAULT_URL && u.includes(targetUrl))) {
      activePage = p;
      return activePage;
    }
  }

  activePage = pages[0] || (await browser.newPage());
  if (!activePage.url().includes('flow.google.com') && activePage.url() !== targetUrl) {
    await activePage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  return activePage;
}

/**
 * Closes browser cleanly.
 */
export async function closeBrowser() {
  if (activeBrowser && activeBrowser.connected) {
    try {
      await activeBrowser.close();
    } catch {}
    activeBrowser = null;
    activePage = null;
  }
}

export { PROFILE_DIR, DEFAULT_PORT, DEFAULT_URL };
