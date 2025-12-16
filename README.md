# Cultura Chatbot - AI Cultural Guide for Karnataka

An interactive voice-enabled chatbot that shares Karnataka's rich cultural heritage using Google Gemini AI and Microsoft Edge TTS for natural Indian English speech synthesis.

## Features

- 🎯 **Culturally-grounded AI**: Powered by Google Gemini with custom prompts for Karnataka heritage
- 🗣️ **Voice-first experience**: Microsoft Edge TTS with authentic South Indian English voice
- 👤 **User accounts**: Persistent chat history and personalized profiles
- 💬 **Multi-chat support**: Create and manage multiple conversation threads
- ⚡ **Modern stack**: React (Vite), Node.js (Express), Edge TTS

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

# Create Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install Python dependencies (Flask, Edge TTS)
pip install -r requirements.txt

# Create .env file with your API key
# Copy .env.example to .env and add your Gemini API key
```

**Create `backend/.env` file:**
```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_secret_key_for_sessions
```

### 3. Frontend Setup

```powershell
cd ..\frontend
npm install
```

### 4. Running the Application

You need **3 terminals** running simultaneously:

**Terminal 1 - Backend Server:**
```powershell
cd backend
npm run dev
```
Backend runs on `http://localhost:3001`

**Terminal 2 - TTS Server:**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python tts_server.py
```
TTS server runs on `http://localhost:5000`

**Terminal 3 - Frontend:**
```powershell
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

### 5. Access the Application

Open your browser to **http://localhost:5173** and create an account to start chatting!

## Project Structure

```
Cultura-chatbot/
├── backend/
│   ├── server.js           # Express server with Gemini integration
│   ├── tts_server.py       # Edge TTS Flask server
│   ├── requirements.txt    # Python dependencies
│   ├── package.json        # Node dependencies
│   └── .env               # Environment variables (create this)
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   └── App.css        # Styling
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
└── README.md
```

## Voice Configuration

The default voice is **`en-IN-PrabhatNeural`** (South Indian male English) for an authentic Karnataka feel.

To change the voice, set the `EDGE_TTS_VOICE` environment variable:

```powershell
# In PowerShell (temporary)
$env:EDGE_TTS_VOICE="en-IN-NeerjaNeural"
python tts_server.py
```

**Available Indian English voices:**
- `en-IN-PrabhatNeural` (Male, South Indian) - Default
- `en-IN-NeerjaNeural` (Female, Indian)

## Key Features Explained

### 1. Smart Text-to-Speech
- Automatically removes markdown formatting (*, **, #, etc.)
- Sanitizes text for natural pronunciation
- Uses Microsoft Edge TTS (no model downloads needed!)

### 2. Conversation Management
- Create multiple chat threads
- Persistent chat history per user
- Auto-generated chat titles from first message

### 3. React Optimization
- Fixed useEffect dependency loops for optimal performance
- Prevents unnecessary API calls
- Smooth user experience

## Development Notes

### Security
- **Never commit `.env` files** - They're in `.gitignore`
- Rotate API keys immediately if exposed
- Use environment variables for all secrets

### API Rate Limits
- The system includes automatic retry logic for API overload
- Gemini API has rate limits - be mindful during testing

### Troubleshooting

**"Model is overloaded" error:**
- This was fixed! The issue was React useEffect loops, not Google's servers
- If it persists, wait a few seconds and try again

**TTS server not working:**
```powershell
# Make sure virtual environment is activated
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python tts_server.py
```

**Frontend can't connect to backend:**
- Check that backend is running on port 3001
- Check that TTS server is running on port 5000
- Verify `.env` file has `GEMINI_API_KEY`

## Contributing

1. Follow ESLint rules in `frontend/eslint.config.js`
2. Test changes thoroughly before committing
3. Update this README if you add new features

## Tech Stack

- **Frontend**: React, Vite
- **Backend**: Node.js, Express, Google Gemini SDK
- **TTS**: Python, Flask, Edge TTS
- **Auth**: JWT tokens, bcrypt

## License

MIT

## Acknowledgments

- Google Gemini for AI capabilities
- Microsoft Edge TTS for natural Indian voices
- The rich cultural heritage of Karnataka 🙏