# Cultura Chatbot - AI Cultural Guide for Karnataka

An interactive voice-enabled chatbot that shares Karnataka's rich cultural heritage using Google Gemini AI and Microsoft Edge TTS for natural Indian English speech synthesis. It now features a dedicated **Travel Planner Mode** for personalized itineraries.

## Features

- 🎯 **Dual Modes**: 
  - **Cultural Guide**: Expert on history, art, and custom traditions.
  - **Travel Planner**: Creates structured, personalized day-by-day itineraries.
- 🧠 **RAG (Retrieval Augmented Generation)**: Grounded responses using a custom knowledge base for accurate facts.
- 🗣️ **Smart Voice**: 
  - Authentic South Indian English accent (Edge TTS).
  - **Dynamic Speed**: Automatically adjusts speaking rate for long responses (up to +25% faster) for a snappy experience.
  - **Sanitized Output**: Reads natural language only, skipping markdown formatting like tables and special characters.
- � **Interactive UI**:
  - **Rich Markdown**: Renders tables for itineraries and formatted text.
  - **Checklists**: Interactive checkboxes for travel tasks directly in the chat.
- 👤 **User Accounts**: Persistent chat history and detailed traveler profiles.

## Prerequisites

- **Node.js** v18+ and npm
- **Python** 3.10+
- **Git**
- **Google Gemini API key** ([Get one here](https://makersuite.google.com/app/apikey))

## Quick Start

### 1. Clone the Repository

```powershell
git clone <your-repo-url>
cd Cultura-chatbot
```

### 2. Backend Setup

```powershell
cd backend

# Install Node.js dependencies
npm install

# Create .env file
# Copy .env.example to .env and add your GEMINI_API_KEY
```

**Create `backend/.env` file:**
```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_secret_key_for_sessions
```

### 3. TTS Server Setup (Python)

This project uses a lightweight Python server for high-quality text-to-speech.

```powershell
cd backend

# Create virtual environment (Recommended)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install flask flask-cors edge-tts
# OR
pip install -r requirements.txt
```

### 4. Frontend Setup

```powershell
cd ../frontend
npm install
```

### 5. Running the Application

You need **3 terminals** running simultaneously to fully experience the app:

**Terminal 1 - Backend Server:**
```powershell
cd backend
node server.js
```
Runs on `http://localhost:3001`

**Terminal 2 - TTS Server:**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python tts_server.py
```
Runs on `http://localhost:5000`

**Terminal 3 - Frontend:**
```powershell
cd frontend
npm run dev
```
Runs on `http://localhost:5173`

### 6. Access the Application

Open **http://localhost:5173** in your browser.

## How to Use

### Travel Planner Mode
1.  Log in and go to your **Profile**.
2.  Set your preferences (e.g., "Temples", "Low Budget").
3.  Go to Chat, select **Travel Planner**.
4.  Ask: "Plan a 2-day trip to Hampi".
5.  View the **Table** itinerary and tick off items in the **Checklist**!

### Testing RAG (Secret Feature)
- Ask: "What is the secret code of the lost temple?"
- Answer: The bot retrieves this secret from the local knowledge base (`backend/data/travel_data.json`).

## Project Structure

```
Cultura-chatbot/
├── backend/
│   ├── server.js           # Express server + Gemini + RAG Logic
│   ├── rag.js              # Retrieval Augmented Generation System
│   ├── prompts.js          # System prompts for Planner/Cultural modes
│   ├── tts_server.py       # Python Edge TTS Server
│   ├── data/               # Knowledge base
│   │   └── travel_data.json
│   ├── requirements.txt    # Python dependencies
│   └── package.json        # Node dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # React UI (with Markdown rendering)
│   │   └── App.css         # Styling (Glassmorphism + Animations)
│   └── package.json        # Frontend dependencies (react-markdown, etc.)
└── README.md
```

## Troubleshooting

- **TTS Error (ModuleNotFoundError)**: Ensure you activated the venv and ran `pip install flask flask-cors edge-tts`.
- **Blank Page**: Ensure the Backend server (port 3001) is running before the Frontend.
- **RAG not working**: Check the console logs of `server.js` for `[RAG] Embeddings generated`.

## License

MIT