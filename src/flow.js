import path from 'path';
import os from 'os';
import fs from 'fs';
import { getBrowser, getFlowPage, closeBrowser, PROFILE_DIR, DEFAULT_URL } from './browser.js';

const SCREENSHOT_DIR = path.join(os.homedir(), '.google-flow-mcp', 'screenshots');

/**
 * Checks connection state, active tabs, and whether authentication is needed.
 */
export async function getStatus(options = {}) {
  try {
    const { browser, mode } = await getBrowser(options);
    const page = await getFlowPage(browser);
    const url = page.url();
    const title = await page.title();
    const isSignIn = url.includes('accounts.google.com');
    const isFlow = url.includes('flow.google.com');

    return {
      status: 'connected',
      mode,
      url,
      title,
      isLoggedIn: isFlow && !isSignIn,
      needsLogin: isSignIn,
      profileDir: PROFILE_DIR,
      hint: isSignIn
        ? 'Google login required. Run "npm run login" or call flow_launch_browser with headed: true.'
        : 'Google Flow ready for background generation.',
    };
  } catch (err) {
    return {
      status: 'error',
      error: err.message,
    };
  }
}

/**
 * Launches or switches browser mode (headless vs headed for 1-time login).
 */
export async function launchBrowser({ headed = false, targetUrl = DEFAULT_URL, port } = {}) {
  const { browser, mode } = await getBrowser({ headed, port, forceRestart: true });
  const page = await getFlowPage(browser, targetUrl);
  return {
    success: true,
    mode,
    url: page.url(),
    title: await page.title(),
    profileDir: PROFILE_DIR,
  };
}

/**
 * Navigates to a specific URL or ensures Flow tab is open.
 */
export async function openTab(url = DEFAULT_URL) {
  const { browser } = await getBrowser();
  const page = await getFlowPage(browser, url);
  if (page.url() !== url && !page.url().includes('flow.google.com')) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  return {
    success: true,
    url: page.url(),
    title: await page.title(),
  };
}

/**
 * High-performance inspection of the active Google Flow workspace.
 */
export async function inspectCanvas() {
  const { browser } = await getBrowser();
  const page = await getFlowPage(browser);

  const data = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
      .map((b) => ({
        text: (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 60),
        ariaLabel: b.getAttribute('aria-label') || null,
        disabled: b.hasAttribute('disabled') || b.getAttribute('aria-disabled') === 'true',
      }))
      .filter((b) => b.text.length > 0)
      .slice(0, 25);

    const inputs = Array.from(
      document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]')
    )
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        placeholder: el.getAttribute('placeholder') || null,
        ariaLabel: el.getAttribute('aria-label') || null,
        value: (el.value || el.innerText || '').slice(0, 100),
      }))
      .slice(0, 10);

    const headings = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
      .map((h) => h.innerText?.trim())
      .filter(Boolean)
      .slice(0, 10);

    return {
      title: document.title,
      url: window.location.href,
      headings,
      inputs,
      buttons,
    };
  });

  return data;
}

/**
 * Injects a prompt into Google Flow and triggers generation.
 */
export async function executePrompt({ prompt, selector, submit = true }) {
  if (!prompt) throw new Error('Prompt is required.');

  const { browser } = await getBrowser();
  const page = await getFlowPage(browser);

  let targetSelector = selector;
  if (!targetSelector) {
    const candidates = [
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="describe" i]',
      'textarea',
      '[contenteditable="true"]',
      'input[type="text"]',
    ];
    for (const sel of candidates) {
      const el = await page.$(sel);
      if (el) {
        targetSelector = sel;
        break;
      }
    }
  }

  if (!targetSelector) {
    throw new Error('Prompt input field not found. Call flow_inspect_canvas to locate input selectors.');
  }

  const inputEl = await page.$(targetSelector);
  await inputEl.click();

  // Clear and type prompt
  await page.keyboard.down('Meta');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Meta');
  await page.keyboard.press('Backspace');
  await inputEl.type(prompt, { delay: 10 });

  if (submit) {
    await page.keyboard.press('Enter');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        /run|generate|create|submit/i.test(b.innerText || b.getAttribute('aria-label') || '')
      );
      if (btn) btn.click();
    });
  }

  return {
    success: true,
    prompt,
    submitted: submit,
  };
}

/**
 * Clicks an element by selector, ariaLabel, or text.
 */
export async function clickElement({ selector, text, ariaLabel }) {
  const { browser } = await getBrowser();
  const page = await getFlowPage(browser);

  const clicked = await page.evaluate(
    ({ sel, txt, aria }) => {
      let target = null;
      if (sel) {
        target = document.querySelector(sel);
      } else if (aria) {
        target = document.querySelector(`[aria-label="${aria}"]`);
      } else if (txt) {
        const els = Array.from(document.querySelectorAll('button, a, [role="button"], span, div'));
        target = els.find((e) => (e.innerText || '').trim().toLowerCase() === txt.trim().toLowerCase());
      }
      if (target) {
        target.click();
        return true;
      }
      return false;
    },
    { sel: selector, txt: text, aria: ariaLabel }
  );

  if (!clicked) {
    throw new Error(`Element not found matching: ${selector || text || ariaLabel}`);
  }

  return { success: true, clicked: selector || text || ariaLabel };
}

/**
 * Saves a screenshot from the background browser.
 */
export async function captureScreenshot({ filename } = {}) {
  const { browser } = await getBrowser();
  const page = await getFlowPage(browser);

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const file = filename || `flow_${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, file);

  await page.screenshot({ path: filepath, fullPage: false });
  return {
    success: true,
    savedTo: filepath,
    filename: file,
  };
}

/**
 * Evaluates custom JS on the Flow page.
 */
export async function evalJs(script) {
  const { browser } = await getBrowser();
  const page = await getFlowPage(browser);
  const result = await page.evaluate(script);
  return { success: true, result };
}
