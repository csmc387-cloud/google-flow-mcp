# 🎬 Google Slow MCP

> **High-Performance Background MCP Server for Google Flow (`flow.google.com`)**  
> Seamless, silent browser automation for Google's AI creative studio (Veo & Imagen). Runs 100% in the background without popups or manual port wrangling.

[![MCP](https://img.shields.io/badge/MCP-1.1.0-blue.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Why This Exists

Google Flow provides state-of-the-art video (**Veo 3.1**) and image (**Imagen / Nano Banana**) generation, but lacks a public REST API. Standard browser automation tools either:
1. Pop up disruptive browser windows right across your desktop.
2. Require tedious manual Chrome terminal flags (`--remote-debugging-port=9222`) before every launch.
3. Dump massive, slow DOM accessibility trees into LLM context windows.

**Google Slow MCP** solves all three:
* 🥷 **Silent Background Execution:** Runs modern Chromium in headless mode (`--headless=new`). Zero windows popping up on your screen.
* 🔄 **Seamless Auto-Connection:** Automatically discovers running debugging sessions or self-heals by spawning a quiet headless instance. No manual port setup needed.
* 🔐 **Persistent Authentication:** Saves Google login cookies & tokens to `~/.google-flow-mcp/profile`. Authenticate once, and subsequent generations run automatically in the background.
* 🚀 **Lean & Fast:** Reduced from ~600 lines of monolithic code to ~260 lines of modular, asynchronous ES modules. Lightweight, sub-second responses.

---

## 🛠️ MCP Tools

| Tool | Description |
| :--- | :--- |
| `flow_status` | Checks background browser connection, current page, and login status. |
| `flow_launch_browser` | Switches execution modes (`headed: true` for 1-time login, or `headed: false` for background headless). |
| `flow_open_tab` | Navigates or focuses `https://flow.google.com`. |
| `flow_inspect_canvas` | Returns structured, lightweight JSON of prompt inputs, action buttons, and canvas nodes. |
| `flow_execute_prompt` | Injects prompts into Google Flow's generation bar and submits them seamlessly. |
| `flow_click` | Precision click handler using CSS selectors, text matches, or aria-labels. |
| `flow_screenshot` | Captures background high-res screenshots and saves to disk. |
| `flow_eval_js` | Runs custom JavaScript in the active Flow page context. |

---

## 🚀 Quickstart

### 1. Installation
```bash
git clone https://github.com/csmc387-cloud/google-slow-mcp.git
cd google-slow-mcp
npm install
```

### 2. One-Time Google Authentication
To authenticate your Google account once into the persistent session profile:
```bash
npm run login
```
Sign in to Google Flow in the opened window, then press `Ctrl+C`. Your session is permanently saved to `~/.google-flow-mcp/profile`.

### 3. Verify Background Status
```bash
npm run status
```
Outputs:
```json
{
  "status": "connected",
  "mode": "headless",
  "url": "https://flow.google.com/about",
  "title": "Google Flow - AI Creative Studio for Video, Images & Custom Tools",
  "isLoggedIn": true,
  "hint": "Google Flow ready for background generation."
}
```

---

## ⚙️ MCP Configuration

Add this server to your Antigravity, Claude Desktop, or Cursor MCP configuration:

### Antigravity / Claude Desktop (`mcp_config.json`):
```json
{
  "mcpServers": {
    "google-flow": {
      "command": "node",
      "args": [
        "/absolute/path/to/google-slow-mcp/index.js"
      ]
    }
  }
}
```

---

## 📂 Project Architecture

```
google-slow-mcp/
├── index.js             # Root executable entry point
├── package.json         # Scripts, metadata, dependencies
├── README.md            # Documentation & setup guide
├── LICENSE              # MIT License
└── src/
    ├── browser.js       # Background browser lifecycle & persistent profile manager
    ├── flow.js          # Google Flow semantic DOM actions & prompt injection
    └── index.js         # Model Context Protocol stdio server & tool dispatchers
```

---

## 📄 License
MIT © [csmc387-cloud](https://github.com/csmc387-cloud)
