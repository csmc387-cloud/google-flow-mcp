import puppeteer from 'puppeteer-core';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DEFAULT_PORT = parseInt(process.env.FLOW_DEBUG_PORT || '9222', 10);
const DEFAULT_URL = process.env.FLOW_URL || 'https://flow.google.com';
const PROFILE_DIR = process.env.FLOW_PROFILE_DIR || path.join(os.homedir(), '.google-flow-mcp', 'profile');

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Arc.app/Contents/MacOS/Arc',
  path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
];

export function getBrowserExecutable() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chromium/Chrome/Arc executable not found in /Applications.');
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
 * Finds or navigates to the Google Flow page.
 */
export async function getFlowPage(browser, targetUrl = DEFAULT_URL) {
  if (activePage && !activePage.isClosed() && activePage.browser().isConnected()) {
    return activePage;
  }

  const pages = await browser.pages();
  for (const p of pages) {
    if (p.url().includes('flow.google.com')) {
      activePage = p;
      return activePage;
    }
  }

  activePage = pages[0] || (await browser.newPage());
  if (!activePage.url().includes('flow.google.com')) {
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
