#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  getStatus,
  launchBrowser,
  openTab,
  inspectCanvas,
  executePrompt,
  clickElement,
  captureScreenshot,
  evalJs,
} from './flow.js';
import { closeBrowser, PROFILE_DIR, getBrowser } from './browser.js';

// CLI helper handlers: 1-Time Setup / Login Wizard
if (process.argv.includes('--login') || process.argv.includes('--setup')) {
  console.log('\n==============================================================');
  console.log('🔒 Google Flow MCP — 100% Local & Isolated Session Setup');
  console.log('==============================================================');
  console.log('• Browser:  Using YOUR locally installed browser');
  console.log('• Account:  Connecting to YOUR personal Google Account');
  console.log('• Storage:  Session cookies stay strictly on YOUR machine');
  console.log('• Location: ' + PROFILE_DIR);
  console.log('• Privacy:  Zero external servers or shared accounts');
  console.log('==============================================================\n');
  console.log('Opening a visible browser window for you to sign in to Google Flow...');
  
  const { browser } = await getBrowser({ headed: true, forceRestart: true });
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await page.goto('https://flow.google.com', { waitUntil: 'domcontentloaded' });

  console.log('Please log in with YOUR Google credentials in the opened window.');
  console.log('Waiting for authentication to complete...\n');

  // Monitor until user successfully signs in
  const checkInterval = setInterval(async () => {
    try {
      if (!browser.connected) {
        clearInterval(checkInterval);
        process.exit(0);
      }
      const currentUrl = page.url();
      if (currentUrl.includes('flow.google.com') && !currentUrl.includes('accounts.google.com')) {
        clearInterval(checkInterval);
        console.log('🎉 Successfully authenticated into your Google Flow account!');
        console.log(`🔒 Your session has been safely saved locally to: ${PROFILE_DIR}`);
        console.log('✨ All future MCP requests will now run 100% silently in the background.\n');
        await closeBrowser();
        process.exit(0);
      }
    } catch {
      // Browser closed or navigating
    }
  }, 2000);

  // Allow manual exit
  process.on('SIGINT', async () => {
    clearInterval(checkInterval);
    await closeBrowser();
    console.log('\nSession saved. Exiting setup.');
    process.exit(0);
  });
} else if (process.argv.includes('--status')) {
  const status = await getStatus();
  console.log(JSON.stringify(status, null, 2));
  await closeBrowser();
  process.exit(0);
} else {
  // Initialize standard MCP Server via Stdio
  const server = new Server(
    {
      name: 'google-flow-mcp',
      version: '1.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register Available Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'flow_status',
        description: 'Checks local browser connection, background status, and local Google Flow login state.',
        inputSchema: {
          type: 'object',
          properties: {
            port: { type: 'number', description: 'Local debugging port (defaults to 9222)' },
          },
        },
      },
      {
        name: 'flow_launch_browser',
        description: 'Controls local browser execution mode (headless background vs headed window for 1-time login).',
        inputSchema: {
          type: 'object',
          properties: {
            headed: { type: 'boolean', description: 'Set true to open a visible window for authentication. Default false (headless background).' },
            targetUrl: { type: 'string', description: 'Target URL to load on launch' },
            port: { type: 'number', description: 'Debugging port (default 9222)' },
          },
        },
      },
      {
        name: 'flow_open_tab',
        description: 'Navigates to or focuses Google Flow in your local browser.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to (default https://flow.google.com)' },
          },
        },
      },
      {
        name: 'flow_inspect_canvas',
        description: 'Inspects active Google Flow workspace: returns prompt inputs, action buttons, and canvas nodes.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'flow_execute_prompt',
        description: 'Injects a creative prompt into Google Flow and triggers generation in your personal workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'The prompt to send to Google Flow' },
            selector: { type: 'string', description: 'Optional CSS selector for prompt input' },
            submit: { type: 'boolean', description: 'Whether to submit after typing (default true)' },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'flow_click',
        description: 'Clicks an element in the page by CSS selector, text, or aria-label.',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
            text: { type: 'string', description: 'Button text content' },
            ariaLabel: { type: 'string', description: 'Element aria-label' },
          },
        },
      },
      {
        name: 'flow_screenshot',
        description: 'Captures a screenshot of the active Google Flow workspace in your local background browser.',
        inputSchema: {
          type: 'object',
          properties: {
            filename: { type: 'string', description: 'Optional custom filename' },
          },
        },
      },
      {
        name: 'flow_eval_js',
        description: 'Runs custom JavaScript in the active page context on your local browser.',
        inputSchema: {
          type: 'object',
          properties: {
            script: { type: 'string', description: 'JavaScript to execute' },
          },
          required: ['script'],
        },
      },
    ],
  }));

  // Tool Handlers
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      let result;
      switch (name) {
        case 'flow_status':
          result = await getStatus(args);
          break;
        case 'flow_launch_browser':
          result = await launchBrowser(args);
          break;
        case 'flow_open_tab':
          result = await openTab(args.url);
          break;
        case 'flow_inspect_canvas':
          result = await inspectCanvas();
          break;
        case 'flow_execute_prompt':
          result = await executePrompt(args);
          break;
        case 'flow_click':
          result = await clickElement(args);
          break;
        case 'flow_screenshot':
          result = await captureScreenshot(args);
          break;
        case 'flow_eval_js':
          result = await evalJs(args.script);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text', text: `[Google Flow MCP Error] ${error.message}` }],
      };
    }
  });

  // Graceful cleanup on shutdown
  process.on('SIGINT', async () => {
    await closeBrowser();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await closeBrowser();
    process.exit(0);
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
