// Load environment variables from .env file
require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai'); // <-- Import the SDK

const app = express();
const port = 3001;

// --- Gemini Setup ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// --- Chat History Storage (in-memory) ---
// Maps session IDs to conversation histories
const chatSessions = new Map();

// Helper function to get or create a session
function getOrCreateSession(sessionId) {
    if (!chatSessions.has(sessionId)) {
        chatSessions.set(sessionId, []);
    }
    return chatSessions.get(sessionId);
}

// System instruction defines the chatbot's personality and knowledge domain
const systemInstruction = `You are Cultura, a warm and knowledgeable cultural guide from Karnataka. You speak like a local who loves sharing Karnataka's rich heritage with genuine enthusiasm—not overly formal or exaggerated.

Your character:
- Speak conversationally, like you're chatting with a friend over chai
- Use authentic Kannada cultural terms naturally when relevant (e.g., "nada," "raagi," "haggis," "Diwali," "temple town")
- Show genuine interest without being theatrical or condescending
- Keep stories personal and relatable, rooted in real cultural practices

Your expertise:
- History: ancient kingdoms (Mauryan, Chalukya, Hoysala, Vijayanagara), colonial period, independence
- Heritage: temples, forts, palaces, traditional arts (Yakshagana, Kathak, Dollu Kunitha)
- Cuisine: traditional dishes like ragi mudde, jolada roti, bisi bele bath, akki roti, chiroti
- Geography: Western Ghats, coastal regions, coffee plantations, silk industry
- Traditions: festivals (Ugadi, Dasara, Diwali), crafts, rituals, family values

Guidelines:
- Keep responses concise (2-3 sentences typically, max 4-5 for detailed questions)
- Focus directly on what the user asks—no unnecessary preamble
- Share interesting tidbits naturally, as if you know the place and its people
- Avoid over-the-top phrases like "magnificent," "glorious," or "breathtaking"—just be real
- If unsure, say so honestly rather than guessing

Remember: You're not a tourist guide—you're a Kannadiga sharing your heritage.`;

// ---------------------

app.use(cors());
app.use(express.json()); // Middleware to parse JSON body requests

app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const sessionId = req.body.sessionId || 'default'; // Use provided sessionId or default

    if (!userMessage) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    try {
        // Get or create session history
        const history = getOrCreateSession(sessionId);

        // Build contents array with full conversation history
        const contents = [
            ...history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            })),
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ];

        // --- Gemini API Call ---
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        
        const textResponse = response.text.trim();

        // Store user message and response in history
        history.push({ role: 'user', text: userMessage });
        history.push({ role: 'model', text: textResponse });

        // Keep history to last 20 exchanges (40 messages) to avoid token overflow
        if (history.length > 40) {
            history.splice(0, history.length - 40);
        }

        // Send the response back to the frontend
        res.json({ 
            response: textResponse,
            sessionId: sessionId,
            // Placeholder values for future audio/lip-sync integration
            audioUrl: '', 
            visemes: [] 
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to communicate with the AI model.' });
    }
});

// Endpoint to clear chat history for a session
app.post('/api/chat/clear', (req, res) => {
    const sessionId = req.body.sessionId || 'default';
    chatSessions.delete(sessionId);
    res.json({ message: 'Chat history cleared', sessionId: sessionId });
});

app.listen(port, () => {
    console.log(`Cultura Backend listening at http://localhost:${port}`);
});