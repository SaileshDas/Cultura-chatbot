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

// System instruction defines the chatbot's personality and knowledge domain
const systemInstruction = `You are Cultura, an expert, enthusiastic, and friendly cultural historian from Karnataka, India. 
Your primary goal is to educate the user about the history, heritage, arts, cuisine, and geography of Karnataka. 
Your tone should be warm and knowledgeable. Keep your responses concise and focused on the user's question.`;

// ---------------------

app.use(cors());
app.use(express.json()); // Middleware to parse JSON body requests

app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    try {
        // --- Gemini API Call ---
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMessage,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        
        const textResponse = response.text.trim();

        // Send the real response back to the frontend
        res.json({ 
            response: textResponse,
            // Placeholder values for future audio/lip-sync integration
            audioUrl: '', 
            visemes: [] 
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to communicate with the AI model.' });
    }
});

app.listen(port, () => {
    console.log(`Cultura Backend listening at http://localhost:${port}`);
});