# Cultura (Karnataka Heritage Guide)

Local dev-ready React + Vite app with a secure server-side proxy for Gemini.

Quick start

1. Copy the example env and add your Gemini API key:

   - Copy `.env.example` to `.env` and set GEMINI_API_KEY
   - Optional: add `HUGGINGFACE_API_KEY` if you want to use Hugging Face Inference API as a fallback (no billing required for light use). You can also set `HF_MODEL` to choose a model (default: google/flan-t5-small).

2. Place your sprite image at `public/sprite.png` (sprite sheet with 5 frames horizontally is expected).

3. Install dependencies and start dev:

```powershell
npm install
npm run dev
```

This runs both the Express proxy server (on port 3000 by default) and Vite dev server. The frontend will call `/api/generate` to proxy LLM requests.

Notes
- The Express server is in `server/index.js` and serves static files from `public/` (including `sprite.png`).
- The frontend component uses Tailwind; configuration files are included (`tailwind.config.cjs`, `postcss.config.cjs`).
- If you don't want to use Gemini right away, the app falls back to built-in responses.
   - If Gemini fails (billing/permissions), the server will automatically attempt a Hugging Face inference call if `HUGGINGFACE_API_KEY` is set.

Security
- Keep your `.env` out of source control. Rotate keys if they were previously committed.