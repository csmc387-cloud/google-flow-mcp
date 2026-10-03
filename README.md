# 🎬 Google Flow MCP Template

> **Universal, High-Performance Background MCP Server & Browser Bridge**  
> Seamless, silent browser automation for **Google Flow (`flow.google.com`)** (Veo 3.1 & Imagen) and modern web applications.  
> Runs 100% headlessly in the background without popups or manual port wrangling. Ready to use as a **GitHub Template**.

[![Use this template](https://img.shields.io/badge/GitHub-Use_this_template-2ea44f?style=for-the-badge&logo=github)](https://github.com/csmc387-cloud/google-flow-mcp/generate)
[![MCP](https://img.shields.io/badge/MCP-1.1.0-blue.svg)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests: Passing](https://img.shields.io/badge/Tests-7%2F7_Passed-brightgreen.svg)]()

---

## 🔒 Privacy, Security & 100% Local Isolation

This template is designed from the ground up for **complete individual privacy and security**:

* 👤 **Your Own Google Account:** You authenticate exclusively with your own Google account into your own personal Google Flow creative workspace. No accounts, projects, or generations are ever shared.
* 💻 **Your Own Local Browser:** The MCP server launches the Chromium browser installed directly on your machine (Google Chrome, Brave, Arc, Edge, or Chromium).
* 🏠 **100% Local Execution (Stdio):** The server runs strictly as a local subprocess on your machine using standard input/output (`stdio`). It does NOT expose any external network ports or web servers to the internet.
* 🛡️ **Isolated Session Storage:** Your login cookies and auth tokens are saved only on your local filesystem (`~/.google-flow-mcp/profile`). Session directories are strictly ignored by `.gitignore` and can never be committed or uploaded.
* 🚫 **Zero Telemetry:** No analytics, no third-party APIs, and no telemetry. All web communication occurs directly between your local browser and Google's official servers (`flow.google.com`).

---

## ⚡ Why This Template Exists

Google Flow and other AI creative studios provide cutting-edge video and image models, but lack official REST APIs. Standard automation tools usually:
1. Pop up disruptive browser windows across your screen.
2. Require tedious manual Chrome terminal flags (`--remote-debugging-port=9222`) before every launch.
3. Are hardcoded to one operating system or one browser.

**Google Flow MCP Template** is a universal, ready-to-fork solution:
* 🥷 **Silent Background Execution:** Runs modern Chromium in headless mode (`--headless=new`). Zero windows popping up on your screen.
* 🌐 **Cross-Platform & Multi-Browser:** Automatically detects **Google Chrome, Chromium, Arc, Brave, and Edge** on **macOS, Linux, and Windows**, with optional `BROWSER_PATH` override.
* 🔄 **Seamless Auto-Connection:** Automatically discovers running debugging sessions or self-heals by spawning a quiet headless instance. No manual port setup needed.
* 🔐 **Persistent Authentication:** Saves your Google login cookies & tokens to your local home directory. Authenticate once, and subsequent generations run automatically in the background.
* 🧪 **Built-in Universal Test Suite:** Verify browser discovery, headless lifecycle, DOM inspection, and screenshot capture in 5 seconds with `npm test`.
* 🎯 **Custom Target URL:** Defaults to Google Flow, but can bridge **any web application** simply by setting `FLOW_URL` or `TARGET_URL`.

---

## 🛠️ MCP Tools

| Tool | Description |
| :--- | :--- |
| `flow_status` | Checks local background browser connection, current page, and login status. |
| `flow_launch_browser` | Switches execution modes (`headed: true` for 1-time login, or `headed: false` for background headless). |
| `flow_open_tab` | Navigates or focuses `https://flow.google.com` (or your custom target URL). |
| `flow_inspect_canvas` | Returns structured, lightweight JSON of prompt inputs, action buttons, and canvas nodes. |
| `flow_execute_prompt` | Injects prompts into Google Flow's generation bar and submits them seamlessly. |
| `flow_click` | Precision click handler using CSS selectors, text matches, or aria-labels. |
| `flow_screenshot` | Captures background high-res screenshots and saves to your local disk. |
| `flow_eval_js` | Runs custom JavaScript in the active page context on your local browser. |

---

## 🚀 Quickstart for Anyone

### 1. Create Your Own Repo from this Template
Click the green [**Use this template**](https://github.com/csmc387-cloud/google-flow-mcp/generate) button on GitHub, then clone your repository:
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
npm install
```

### 2. Log in to YOUR Google Flow Account (One-Time Setup)
Run the guided local authentication wizard:
```bash
npm run setup
```
* This opens a browser window on your computer.
* Sign in to **your** personal Google Account on `flow.google.com`.
* The wizard automatically detects when you are logged in, saves your session locally to `~/.google-flow-mcp/profile`, and closes the window.

### 3. Test Your Local Browser Connection
Run the universal test suite to verify your local browser discovery and background connectivity:
```bash
npm test
```
Outputs:
```text
🧪 Starting Google Flow MCP Universal Connection Test

  [1] Testing: Browser Executable Discovery... ✔ PASSED
  [2] Testing: Headless Background Lifecycle... ✔ PASSED
  [3] Testing: Target Page Navigation & Auth State... ✔ PASSED
  [4] Testing: Workspace Inspection & Node Parsing... ✔ PASSED
  [5] Testing: Page Context JavaScript Evaluation... ✔ PASSED
  [6] Testing: Silent Background Screenshot Capture... ✔ PASSED
  [7] Testing: Graceful Teardown & Resource Cleanup... ✔ PASSED

🎉 ALL TESTS PASSED (7/7)
```

### 4. Verify Background Status Anytime
```bash
npm run status
```

---

## ⚙️ MCP Host Configuration

Add this server to your local Antigravity, Claude Desktop, Cursor, or Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "google-flow": {
      "command": "node",
      "args": [
        "/absolute/path/to/your/cloned/google-flow-mcp/index.js"
      ]
    }
  }
}
```

---

## 🔧 Environment Variables

Copy `.env.example` to configure custom behavior:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `BROWSER_PATH` | Explicit path to a browser binary | Auto-detected |
| `FLOW_DEBUG_PORT` | Remote debugging port | `9222` |
| `FLOW_URL` | Target web application URL | `https://flow.google.com` |
| `FLOW_PROFILE_DIR` | Session and cookie persistence directory | `~/.google-flow-mcp/profile` |

---

## 📂 Project Architecture

```
google-flow-mcp/
├── index.js             # Root executable entry point
├── package.json         # Scripts ("start", "setup", "status", "test"), deps
├── README.md            # Universal template documentation
├── LICENSE              # MIT License
├── .gitignore           # Ignores profiles, screenshots, logs, node_modules
├── .env.example         # Example configuration options
├── test/
│   └── test-connection.js # Automated 7-step connection test suite
└── src/
    ├── browser.js       # Cross-platform browser discovery & headless lifecycle
    ├── flow.js          # Google Flow semantic DOM actions & prompt injection
    └── index.js         # Model Context Protocol stdio server & tool dispatchers
```

---

## 📄 License
MIT © [csmc387-cloud](https://github.com/csmc387-cloud)
