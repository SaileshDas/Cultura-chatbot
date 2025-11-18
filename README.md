Cultura Chatbot - Setup & Run

This repository contains a small client-server project: a React frontend (Vite) and a Node.js backend (Express) with a small Python mock TTS server.

These instructions assume you are on Windows and using PowerShell.

Prerequisites
- Node.js (v18+ recommended) and npm
- Python 3.10+ (for the mock TTS server)
- Git

Root repo layout

cultura-chatbot/
  ├─ backend/        # Node backend and Python TTS mock
  └─ frontend/       # Vite + React frontend

1) Clone & branch

Run these commands to clone and switch to the `alternative` branch:

git clone https://github.com/<your-user>/saile.git
cd "c:\Users\saile\Documents\AI projects\cultura-chatbot"
git checkout alternative

2) Backend setup

cd backend
# Install Node deps
npm install

# (Optional) Install dev dependency for live reload
npm install --save-dev nodemon

# Create and activate a Python virtual environment for the TTS mock
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Provide secrets via environment variables (do NOT commit them):
# Create backend/.env with required keys (example):
# GEMINI_API_KEY=YOUR_GEMINI_KEY
# ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY

# Run backend (dev)
npm run dev    # runs nodemon server.js

3) Python TTS mock

In a separate terminal, from the `backend` folder after activating the venv:

python tts_server.py
# The mock TTS server will run at http://127.0.0.1:5000

4) Frontend setup

cd ..\frontend
npm install
npm run dev
# The Vite dev server will start (default port 5173) and proxies `/api` to the backend at :3001

5) Development notes & security

- Remove any API keys accidentally committed. Rotate keys immediately if they were exposed.
- Use a `.env` file for dev and add it to `.gitignore` (this repo already includes `.gitignore`).
- For production, use a secrets manager (AWS Secrets Manager / Google Secret Manager / Azure Key Vault).
- The frontend dev server proxies `/api` to the backend to avoid CORS during development.

6) Useful commands

- Run backend only: `npm start` (in `backend`)
- Run backend with live reload: `npm run dev` (requires `nodemon`)
- Run frontend: `npm run dev` (in `frontend`)

7) Contributing

- Follow ESLint rules in `frontend/eslint.config.js`.
- Add tests and CI as needed.

If you want, I can also:
- Remove the committed `.env` from git history and provide steps to rotate the exposed key (destructive operation).
- Add a root-level `dev` script to run both frontend and backend concurrently.