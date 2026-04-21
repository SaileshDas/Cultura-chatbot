# Cultura Chatbot - AI Cultural Guide & Travel Buddy for Karnataka

An interactive, voice-enabled AI companion designed to share the rich cultural heritage and hidden gems of Karnataka. Powered by Google Gemini and featuring high-quality Microsoft Edge TTS with authentic South Indian English speech.

---

## 🌟 Key Features

### 🎯 Intelligence & Dual Modes
- **Cultural Guide**: Expert on Karnataka's history, folklore, art, and custom traditions.
- **Travel Planner**: Creates structured, personalized day-by-day itineraries based on your budget, interests, and style.
- **Gemini-First Responses**: All answers are generated directly by Gemini for a clean, low-latency experience.

### 🎤 Interactive Voice & UI
- **Voice Input (STT)**: 
  - **Whisper AI**: Highly accurate speech-to-text supporting multiple languages (including Kannada).
  - **Web Speech Fallback**: Instant browser-based recognition if the backend server is unavailable.
- **Smart Narration (TTS)**: 
  - Authentic South Indian English accent (`en-IN-PrabhatNeural`).
  - **Dynamic Speed**: Automatically adjusts speaking rate for long responses (up to +25% faster) for a better conversational flow.
  - **Sanitized Audio**: Reads contextually, automatically skipping markdown clutter and table markup.
- **Modern UI**:
  - **Tabular Itineraries**: View your travel plans in clean, readable Markdown tables.
  - **Interactive Checklists**: Tick off travel tasks directly in your chat bubbles.
  - **Glassmorphism Design**: A premium, responsive localized interface.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+
- **Python 3.11 or 3.12** (Crucial for Whisper STT compatibility)
- **Google Gemini API Keys** (Primary + 3 backups) ([Get one here](https://makersuite.google.com/app/apikey))

### 2. Setup

#### Clone & Install
```powershell
git clone <your-repo-url>
cd Cultura-chatbot

# Install Frontend
cd frontend
npm install

# Install Backend
cd ../backend
npm install
```

#### Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEYS=key_primary,key_backup_1,key_backup_2,key_backup_3
JWT_SECRET=your_secret_key_for_sessions
```

Optional frontend environment variables (create `frontend/.env` if needed):
```env
VITE_API_BASE=
VITE_TTS_BASE=http://localhost:5000
```

- `VITE_API_BASE` can stay empty for same-origin deployments (like Vercel).
- `VITE_TTS_BASE` should point to your Python voice server if hosted separately.

#### TTS & STT Server (Python)
We recommend using a virtual environment with Python 3.12:
```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install flask flask-cors edge-tts faster-whisper
```

---

## 🛠️ Running the Application

To fully experience Cultura, you need three servers running:

1. **Backend Server** (Node.js):
   ```powershell
   cd backend
   node server.js
   ```
2. **AI Voice Server** (Python):
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   python tts_server.py
   ```
3. **Frontend App** (Vite):
   ```powershell
   cd frontend
   npm run dev
   ```

Open **http://localhost:5173** to start your journey!

---

## 📦 Production Notes

- **Backend**: Set `GEMINI_API_KEYS` and `JWT_SECRET`, then run `npm start` from `backend/`.
- **Frontend**: Build with `npm run build` from `frontend/` and serve the `frontend/dist` folder with your static host.

### Vercel Deployment

- **API**: Uses a serverless function at `/api`. Configure `GEMINI_API_KEYS` and `JWT_SECRET` in Vercel Environment Variables.
- **Frontend**: Served from `frontend/dist` with automatic `/api` routing from [vercel.json](vercel.json).
- **Voice Server**: The Python TTS/Whisper server is not hosted on Vercel. Host it separately and set `VITE_TTS_BASE`, or rely on browser speech fallback.
- **Data Storage**: User accounts and chat history are in-memory. For production persistence, connect a database.

#### Quick Deploy (Vercel)

1. Install the Vercel CLI (optional):

```
npm i -g vercel
```

2. Log in and deploy from the project root:

```
vercel login
vercel --prod
```

3. In the Vercel project settings, add the following Environment Variables (Production):

- `GEMINI_API_KEYS` — comma-separated Gemini API keys
- `JWT_SECRET` — a strong secret for signing tokens
- `VITE_TTS_BASE` — (optional) URL of your hosted TTS/STT server

Note: Keep secrets out of the repository. Use the Vercel dashboard to add secret values.

## 💡 Usage Tips

- **Traveler Profile**: Set your budget and interests in the **Profile** section before using the Travel Planner for better recommendations.
- **Voice Input**: Click the 🎤 icon. If it's your first time, Whisper will download its model (~500MB). If the backend is off, it will automatically fallback to your browser's built-in speech recognition.
- **Gemini Key Failover**: If a key fails, the backend automatically retries with the next backup key.

---

## 📂 Project Structure

- `backend/server.js`: Main API and Gemini integration.
- `backend/tts_server.py`: Python server handling Edge TTS and Whisper STT.
- `frontend/src/App.jsx`: State-of-the-art React interface.

---

## 📜 License
MIT - Created for AI Cultural Exploration.
