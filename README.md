# Cultura Chatbot - AI Cultural Guide & Travel Buddy for Karnataka

An interactive, voice-enabled AI companion designed to share the rich cultural heritage and hidden gems of Karnataka. Powered by Google Gemini, grounded in custom knowledge through RAG, and featuring high-quality Microsoft Edge TTS with authentic South Indian English speech.

---

## 🌟 Key Features

### 🎯 Intelligence & Dual Modes
- **Cultural Guide**: Expert on Karnataka's history, folklore, art, and custom traditions.
- **Travel Planner**: Creates structured, personalized day-by-day itineraries based on your budget, interests, and style.
- **RAG (Retrieval Augmented Generation)**: Responses are grounded in a local knowledge base (`backend/data/travel_data.json`) for pinpoint accuracy.

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
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

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
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_secret_key_for_sessions
```

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

## 💡 Usage Tips

- **Traveler Profile**: Set your budget and interests in the **Profile** section before using the Travel Planner for better recommendations.
- **Voice Input**: Click the 🎤 icon. If it's your first time, Whisper will download its model (~500MB). If the backend is off, it will automatically fallback to your browser's built-in speech recognition.
- **RAG Check**: Ask "What is the secret code of the lost temple?" to see the RAG system retrieve data from the local JSON files.

---

## 📂 Project Structure

- `backend/server.js`: Main API and Gemini RAG integration.
- `backend/tts_server.py`: Python server handling Edge TTS and Whisper STT.
- `backend/rag.js`: Lightweight vector-similarity engine.
- `frontend/src/App.jsx`: State-of-the-art React interface.

---

## 📜 License
MIT - Created for AI Cultural Exploration.
