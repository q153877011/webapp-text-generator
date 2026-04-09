# Text Generator Web App Template

A versatile Next.js web app that connects to any [Dify](https://dify.ai) application — **Completion, Workflow, Chat, or Agent** — and renders the appropriate UI automatically.

## Setup

### 1. Configure environment variables

Copy `.env.example` to `.env.local` and fill in two values:

```bash
cp .env.example .env.local
```

```env
# Your Dify app's API key
NEXT_PUBLIC_APP_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxx

# Dify API base URL (use https://api.dify.ai for Dify Cloud)
NEXT_PUBLIC_API_URL=https://api.dify.ai
```

That's it — no other configuration is needed. The app auto-detects the app type, locale, and capabilities at runtime from the Dify API.

### 2. Install dependencies

```bash
npm install
# or
yarn
# or
pnpm install
```

### 3. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Features

- **Auto app-type detection** — Calls `/v1/parameters` and `/v1/meta` on startup to detect whether your Dify app is Completion, Workflow, Chat, or Agent, then renders the matching UI automatically.
- **Theme system** — Four built-in themes (Warm, Dark, Cool, Minimal) switchable via the floating button in the bottom-right corner.
- **i18n** — English and Chinese (Simplified) are supported. Locale is auto-switched from your Dify app's `default_language` setting.
- **Multimodal** — Speech-to-text, text-to-speech, and file attachment support (when enabled in your Dify app settings).

## Deployment

The easiest way to deploy is [Vercel](https://vercel.com/new):

> ⚠️ If you are using [Vercel Hobby](https://vercel.com/pricing), responses may be truncated due to Vercel's function size limits.

Set `NEXT_PUBLIC_APP_KEY` and `NEXT_PUBLIC_API_URL` in your Vercel project's environment variable settings.
