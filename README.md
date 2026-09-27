# AstraGod

**Your Intelligent AI Companion.**

A modern AI chatbot with conversational memory, secure AI API integration, Markdown/code rendering, chat history, dark mode, and responsive design.

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-active-success)

---

## Overview

AstraGod is a full-stack conversational AI assistant built with a vanilla JavaScript frontend and a Node.js/Express backend. It's designed to feel like a real AI product — multiple conversations, persistent history, Markdown-rich responses with syntax-highlighted code, and a premium dark/light interface — rather than a minimal chatbot demo.

The AI provider is fully decoupled behind a backend service layer, so the underlying model (OpenAI, Anthropic, or any OpenAI-compatible endpoint) can be swapped by changing environment variables only — no frontend or route code changes required.

## Features

- 💬 **Multi-conversation chat** with automatic title generation from the first message
- 🗂️ **Sidebar** with new chat, search, rename, delete, and collapse/drawer behavior
- 💾 **Local persistence** of all conversations via `localStorage` — no account or database required
- 📝 **Full Markdown rendering** — headings, lists, tables, blockquotes, links, inline code
- 🧑‍💻 **Syntax-highlighted code blocks** with a one-click copy button and language label
- ⏹️ **Stop generating** and **regenerate response** controls
- 📋 **Copy message** to clipboard
- 🌗 **Dark / Light / System theme**, remembered across sessions
- ⚙️ **Settings panel** — appearance, Enter-to-send, timestamps, animations, temperature, response length
- 📤 **Export / 📥 Import** chat history as JSON, with validation on import
- 📱 **Fully responsive** — sidebar becomes a slide-out drawer on mobile
- ♿ **Accessible** — semantic HTML, ARIA labels, keyboard navigation, visible focus states
- 🔒 **Secure by design** — API keys never touch the browser, input sanitization, rate limiting, CORS configuration
- 🛡️ **Graceful error handling** for network failures, timeouts, rate limits, and invalid AI responses

## Demo

> Run the project locally (see [Running Locally](#running-locally)) — AstraGod is a self-hosted app and does not ship with a public demo instance.

## Screenshots

Add your own screenshots to the `screenshots/` folder and reference them here, e.g.:

```md
![AstraGod dark mode](screenshots/dark-mode.png)
![AstraGod light mode](screenshots/light-mode.png)
```

## Tech Stack

**Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), [marked.js](https://marked.js.org/) for Markdown, [highlight.js](https://highlightjs.org/) for syntax highlighting

**Backend:** Node.js, Express.js, `node-fetch`, `express-rate-limit`, `cors`, `dotenv`

**AI Layer:** Provider-independent service supporting OpenAI, Anthropic, and any OpenAI-compatible chat-completions API

## Architecture

```
Browser (frontend/)
   │  fetch('/api/chat')
   ▼
Express server (backend/server.js)
   │  routes/chat.js  → validates request
   ▼
services/aiService.js
   │  builds provider-specific request, calls AI_API_URL with AI_API_KEY
   ▼
AI Provider (OpenAI / Anthropic / OpenAI-compatible)
```

The frontend never sees `AI_API_KEY`. All provider communication happens server-side, keeping credentials secure and the provider swappable.

## Project Structure

```
AstraGod/
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── style.css
│   │   ├── responsive.css
│   │   └── themes.css
│   ├── js/
│   │   ├── app.js          # wiring & event listeners
│   │   ├── chat.js         # conversation state & message flow
│   │   ├── api.js          # backend API client
│   │   ├── storage.js      # localStorage persistence
│   │   ├── ui.js           # toasts, dialogs, sidebar rendering
│   │   ├── settings.js     # settings modal logic
│   │   └── markdown.js     # markdown render + sanitize + code UI
│   └── assets/
│       └── favicon.svg
│
├── backend/
│   ├── server.js
│   ├── routes/
│   │   └── chat.js
│   ├── services/
│   │   └── aiService.js
│   └── middleware/
│       ├── validate.js
│       └── errorHandler.js
│
├── screenshots/
├── docs/
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── LICENSE
```

## Installation

```bash
git clone <repository-url>
cd AstraGod
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
AI_API_KEY=your_api_key_here
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4o-mini
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=30
```

| Variable | Description |
|---|---|
| `AI_API_KEY` | Secret API key for your AI provider. Never exposed to the frontend. |
| `AI_API_URL` | Full endpoint URL of the provider's chat-completions API. |
| `AI_MODEL` | Model identifier to request (e.g. `gpt-4o-mini`, `claude-sonnet-4-6`). |
| `PORT` | Port the Express server listens on. |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins. |
| `RATE_LIMIT_MAX` | Max requests per IP per minute on `/api/*`. |

## Configuration

AstraGod auto-detects the provider "shape" from `AI_API_URL`:

- URLs containing `anthropic.com` → Anthropic Messages API format
- URLs containing `openai.com`, or any other OpenAI-compatible endpoint (self-hosted, OpenRouter, Groq, etc.) → OpenAI chat-completions format

To add a new provider shape, extend `detectProvider`, `buildRequestBody`, `buildHeaders`, and `extractReplyText` in `backend/services/aiService.js`.

## Running Locally

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

For development with auto-restart:

```bash
npm run dev
```

## Usage

1. Click **New Chat** or start typing to begin a conversation.
2. Use the suggestion cards on the welcome screen for quick starting points.
3. Press **Enter** to send, **Shift + Enter** for a new line (configurable in Settings).
4. Manage conversations from the sidebar: rename, delete, search, or clear all.
5. Export your history as JSON from the sidebar or Settings → Data, and import it back anytime.
6. Adjust theme, AI temperature, and response length in **Settings**.

## Security

- API keys and secrets live only in `.env` on the server — never in frontend code or version control (`.gitignore` excludes `.env`)
- All chat requests are validated server-side (`middleware/validate.js`) before reaching the AI provider
- Rendered Markdown is sanitized client-side to strip scripts, inline event handlers, and `javascript:` URLs before insertion into the DOM
- CORS origins are explicitly configurable via `ALLOWED_ORIGINS`
- Basic per-IP rate limiting is applied to all `/api/*` routes
- Errors are handled centrally so the server never crashes or leaks internal details to the client

## Performance

- No heavy frontend frameworks — vanilla JS keeps the bundle minimal and fast on integrated graphics/low-end laptops
- CSS animations are intentionally subtle and can be disabled entirely in Settings
- Conversation history is capped at the last 40 messages per request to keep payloads small
- `localStorage` reads/writes are batched around user actions rather than on every keystroke

## Future Improvements

- [ ] Voice input
- [ ] Voice output
- [ ] AI image generation
- [ ] Multiple AI providers selectable from the UI
- [ ] File uploads
- [ ] PDF analysis
- [ ] Web search
- [ ] User authentication
- [ ] Cloud conversation sync
- [ ] PWA support
- [ ] Mobile application

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or submit a pull request.

## License

Distributed under the [MIT License](LICENSE).

## Author

**Sahil** — B.Tech CSE Student, Maharishi Markandeshwar Engineering College (MMEC)
