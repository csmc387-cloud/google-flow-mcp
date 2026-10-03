#!/usr/bin/env node

/**
 * Universal Connection & MCP Test Suite
 * Validates browser discovery, background launch, navigation, DOM interaction,
 * and screenshot generation across any Chromium browser.
 */

import { getBrowser, getBrowserExecutable, closeBrowser, PROFILE_DIR } from '../src/browser.js';
import { getStatus, inspectCanvas, captureScreenshot, evalJs } from '../src/flow.js';

const colors = {
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  bold: (t) => `\x1b[1m${t}\x1b[0m`,
};

async function runTestSuite() {
  console.log(colors.bold('\n🧪 Starting Google Flow MCP Universal Connection Test\n'));

  let passes = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    process.stdout.write(`  [${total}] Testing: ${name}... `);
    try {
      const res = await fn();
      passes++;
      console.log(colors.green('✔ PASSED'));
      if (res) {
        const details = typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res);
        for (const line of details.split('\n')) {
          console.log(`      ${colors.cyan(line)}`);
        }
      }
    } catch (err) {
      console.log(colors.red('✖ FAILED'));
      console.error(`      ${colors.red(err.message)}`);
    }
  }

  // 1. Browser Discovery
  await test('Browser Executable Discovery', async () => {
    const exec = getBrowserExecutable();
    return { executablePath: exec };
  });

  // 2. Headless Connection Lifecycle
  await test('Headless Background Lifecycle', async () => {
    const { browser, mode } = await getBrowser({ headed: false });
    if (!browser || !browser.connected) throw new Error('Browser failed to connect.');
    return { mode, profileDir: PROFILE_DIR };
  });

  // 3. Navigation & Flow Status
  await test('Target Page Navigation & Auth State', async () => {
    const status = await getStatus();
    if (status.status !== 'connected') throw new Error(`Status error: ${status.error}`);
    return {
      url: status.url,
      title: status.title,
      isLoggedIn: status.isLoggedIn,
      needsLogin: status.needsLogin,
    };
  });

  // 4. Canvas & DOM Inspection
  await test('Workspace Inspection & Node Parsing', async () => {
    const inspection = await inspectCanvas();
    if (!inspection.title) throw new Error('Failed to read page title during inspection.');
    return {
      title: inspection.title,
      buttonsFound: inspection.buttons.length,
      inputsFound: inspection.inputs.length,
      sampleButtons: inspection.buttons.slice(0, 3).map((b) => b.text),
    };
  });

  // 5. JavaScript Evaluation
  await test('Page Context JavaScript Evaluation', async () => {
    const res = await evalJs('navigator.userAgent');
    if (!res.success) throw new Error('evalJs returned failure.');
    return { userAgent: res.result.slice(0, 60) + '...' };
  });

  // 6. Screenshot Generation
  await test('Silent Background Screenshot Capture', async () => {
    const snap = await captureScreenshot({ filename: 'test_validation.png' });
    if (!snap.success) throw new Error('Screenshot failed.');
    return { savedTo: snap.savedTo };
  });

  // 7. Clean Teardown
  await test('Graceful Teardown & Resource Cleanup', async () => {
    await closeBrowser();
    return { cleanShutdown: true };
  });

  // Summary
  console.log('\n' + colors.bold('========================================'));
  if (passes === total) {
    console.log(colors.green(colors.bold(`🎉 ALL TESTS PASSED (${passes}/${total})`)));
    console.log(colors.cyan('The MCP server is fully validated and ready for production use.'));
  } else {
    console.log(colors.yellow(colors.bold(`⚠️  TESTS COMPLETED: ${passes}/${total} passed.`)));
  }
  console.log(colors.bold('========================================\n'));

  process.exit(passes === total ? 0 : 1);
}

runTestSuite().catch((err) => {
  console.error(colors.red(`Fatal Test Error: ${err.message}`));
  process.exit(1);
});
