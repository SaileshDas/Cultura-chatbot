// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai'); // <-- Import the SDK
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3001;
const jwtSecret = process.env.JWT_SECRET || 'dev-change-me';

// --- Gemini Setup ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// --- In-memory Users & Chats (for local development) ---
// In production, replace this with a real database.
const users = new Map(); // key: username, value: { id, username, passwordHash, profile }
const chatsByUser = new Map(); // key: userId, value: [{ id, title, messages: [{ role, text, createdAt }] }]

function getUserById(id) {
    for (const user of users.values()) {
        if (user.id === id) return user;
    }
    return null;
}

function getUserChats(userId) {
    if (!chatsByUser.has(userId)) {
        chatsByUser.set(userId, []);
    }
    return chatsByUser.get(userId);
}

function findChat(userId, chatId) {
    const chats = getUserChats(userId);
    return chats.find((c) => c.id === chatId);
}

function createChat(userId, title) {
    const chats = getUserChats(userId);
    const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const chat = {
        id,
        title: title || 'New chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
    };
    chats.unshift(chat);
    return chat;
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
- IMPORTANT: Never use markdown formatting, asterisks, or special symbols in your responses. Speak in plain text only since responses are read aloud by text-to-speech.

Remember: You're not a tourist guide—you're a Kannadiga sharing your heritage.`;

// Helper function to sanitize text for TTS (remove markdown and special characters)
function sanitizeForTTS(text) {
    return text
        // Remove markdown bold/italic
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** -> bold
        .replace(/\*([^*]+)\*/g, '$1')      // *italic* -> italic
        .replace(/__([^_]+)__/g, '$1')      // __bold__ -> bold
        .replace(/_([^_]+)_/g, '$1')        // _italic_ -> italic
        // Remove markdown headers
        .replace(/^#{1,6}\s+/gm, '')        // # Header -> Header
        // Remove markdown lists
        .replace(/^[\*\-\+]\s+/gm, '')      // * item -> item
        .replace(/^\d+\.\s+/gm, '')         // 1. item -> item
        // Remove code blocks and inline code
        .replace(/```[\s\S]*?```/g, '')     // ```code``` -> (removed)
        .replace(/`([^`]+)`/g, '$1')        // `code` -> code
        // Remove links but keep text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) -> text
        // Remove other common markdown
        .replace(/>/g, '')                  // Remove blockquote markers
        .replace(/~/g, '')                  // Remove strikethrough
        // Clean up extra whitespace
        .replace(/\n{3,}/g, '\n\n')         // Multiple newlines -> double newline
        .trim();
}

// ---------------------

app.use(cors());
app.use(express.json()); // Middleware to parse JSON body requests

// --- Auth Middleware ---
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Authorization token missing.' });
    }

    try {
        const payload = jwt.verify(token, jwtSecret);
        const user = getUserById(payload.id);
        if (!user) {
            return res.status(401).json({ error: 'Account no longer exists.' });
        }
        req.user = { id: user.id, username: user.username };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const normalizedUsername = String(username).toLowerCase();

    if (users.has(normalizedUsername)) {
        return res.status(409).json({ error: 'An account with this username already exists.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const user = {
            id,
            username: normalizedUsername,
            passwordHash,
            profile: {
                fullName: '',
                homeCity: '',
                homeCountry: '',
                homeAirport: '',
                preferredLanguages: [],
                travelInterests: '',
                travelStyle: '',
                budgetLevel: '',
                accessibilityNeeds: '',
                favouriteRegions: '',
                notes: '',
            },
        };
        users.set(normalizedUsername, user);

        const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: '7d' });
        return res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Failed to create account.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const normalizedUsername = String(username).toLowerCase();
    const user = users.get(normalizedUsername);

    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    return res.json({ user: { id: req.user.id, username: req.user.username } });
});

// --- Profile Routes ---
app.get('/api/profile', authMiddleware, (req, res) => {
    const user = getUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ username: user.username, profile: user.profile || {} });
});

app.put('/api/profile', authMiddleware, (req, res) => {
    const user = getUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    const incoming = req.body && req.body.profile ? req.body.profile : {};
    user.profile = {
        ...(user.profile || {}),
        ...incoming,
    };
    res.json({ username: user.username, profile: user.profile });
});

// Delete account and all associated chats
app.delete('/api/account', authMiddleware, (req, res) => {
    const user = getUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    users.delete(user.username);
    chatsByUser.delete(user.id);
    res.json({ message: 'Account and all chats deleted.' });
});

// --- Chat Management Routes (per-user) ---
app.get('/api/chats', authMiddleware, (req, res) => {
    const chats = getUserChats(req.user.id).map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    }));
    res.json({ chats });
});

app.post('/api/chats', authMiddleware, (req, res) => {
    const { title } = req.body || {};
    const chat = createChat(req.user.id, title);
    res.status(201).json({ chat });
});

app.get('/api/chats/:chatId', authMiddleware, (req, res) => {
    const { chatId } = req.params;
    const chat = findChat(req.user.id, chatId);
    if (!chat) {
        return res.status(404).json({ error: 'Chat not found.' });
    }
    res.json({ chat });
});

app.delete('/api/chats/:chatId', authMiddleware, (req, res) => {
    const { chatId } = req.params;
    const chats = getUserChats(req.user.id);
    const index = chats.findIndex((c) => c.id === chatId);
    if (index === -1) {
        return res.status(404).json({ error: 'Chat not found.' });
    }
    chats.splice(index, 1);
    res.json({ message: 'Chat deleted.' });
});

// Update chat metadata (e.g. title)
app.patch('/api/chats/:chatId', authMiddleware, (req, res) => {
    const { chatId } = req.params;
    const { title } = req.body || {};
    const chat = findChat(req.user.id, chatId);
    if (!chat) {
        return res.status(404).json({ error: 'Chat not found.' });
    }
    if (typeof title === 'string' && title.trim()) {
        chat.title = title.trim().slice(0, 80);
        chat.updatedAt = new Date().toISOString();
    }
    res.json({ chat });
});

// --- Chat Completion Route ---
app.post('/api/chat', authMiddleware, async (req, res) => {
    const userMessage = req.body.message;
    const chatId = req.body.chatId;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message content is required.' });
    }
    if (!chatId) {
        return res.status(400).json({ error: 'chatId is required.' });
    }

    try {
        const chat = findChat(req.user.id, chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found.' });
        }

        // Build contents array with full conversation history
        const contents = [
            ...chat.messages.map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
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

        // Derive a simple title from the first user message if chat is still using default title
        if (chat.title === 'New chat' || !chat.title) {
            const snippet = userMessage.length > 60 ? `${userMessage.slice(0, 57)}...` : userMessage;
            chat.title = snippet || 'New chat';
        }

        // Store user message and response in chat
        chat.messages.push(
            { role: 'user', text: userMessage, createdAt: new Date().toISOString() },
            { role: 'ai', text: textResponse, createdAt: new Date().toISOString() }
        );
        chat.updatedAt = new Date().toISOString();

        // Keep history to last 20 exchanges (40 messages) to avoid token overflow
        if (chat.messages.length > 40) {
            chat.messages.splice(0, chat.messages.length - 40);
        }

        // Send the response back to the frontend
        res.json({
            response: textResponse,
            chatId: chat.id,
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