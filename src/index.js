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
import { closeBrowser } from './browser.js';

// CLI helper handlers
if (process.argv.includes('--login')) {
  console.log('[Google Flow MCP] Launching headed browser for 1-time login...');
  await launchBrowser({ headed: true });
  console.log('[Google Flow MCP] Please log in to Google Flow. Session will be saved automatically.');
  console.log('[Google Flow MCP] Press Ctrl+C when finished.');
  process.stdin.resume();
} else if (process.argv.includes('--status')) {
  const status = await getStatus();
  console.log(JSON.stringify(status, null, 2));
  await closeBrowser();
  process.exit(0);
}

// Initialize MCP Server
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
      description: 'Checks connection state, headless status, and active Google Flow login status.',
      inputSchema: {
        type: 'object',
        properties: {
          port: { type: 'number', description: 'Remote debugging port (defaults to 9222)' },
        },
      },
    },
    {
      name: 'flow_launch_browser',
      description: 'Controls browser execution mode (headless background vs headed window for 1-time login).',
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
      description: 'Navigates to or focuses the Google Flow tab.',
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
      description: 'Injects a creative prompt into Google Flow and triggers generation.',
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
      description: 'Clicks an element in the Google Flow page by CSS selector, text, or aria-label.',
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
      description: 'Captures a screenshot of the active Google Flow workspace in the background.',
      inputSchema: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Optional custom filename' },
        },
      },
    },
    {
      name: 'flow_eval_js',
      description: 'Runs custom JavaScript in the Google Flow page context and returns result.',
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
