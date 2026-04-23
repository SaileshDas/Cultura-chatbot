const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai'); // <-- Import the SDK
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3001;
const jwtSecret = process.env.JWT_SECRET || 'dev-change-me';

// --- Gemini Setup ---
const rawApiKeys = process.env.GEMINI_API_KEYS || '';
const apiKeys = rawApiKeys
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);

let geminiClients = [];

if (apiKeys.length === 0) {
    console.warn('No GEMINI_API_KEYS found. Running in offline dev mode with a stubbed Gemini client.');
    // Provide a lightweight stub so the backend can run for local development
    geminiClients = [{
        models: {
            generateContent: async (request) => {
                return { text: 'Offline dev mode: Gemini not configured. This is a placeholder response.' };
            }
        }
    }];
} else {
    if (apiKeys.length < 4) {
        console.warn('[Gemini] Fewer than 4 API keys provided; failover coverage is limited.');
    }

    geminiClients = apiKeys.map((apiKey) => new GoogleGenAI({ apiKey }));
}
    // Retry/backoff and fallback configuration (override via environment)
    const GEMINI_ATTEMPTS_PER_KEY = Number(process.env.GEMINI_ATTEMPTS_PER_KEY || 3);
    const GEMINI_RETRY_BASE_MS = Number(process.env.GEMINI_RETRY_BASE_MS || 500);
    const GEMINI_GLOBAL_RETRIES = Number(process.env.GEMINI_GLOBAL_RETRIES || 2);
    const GEMINI_GLOBAL_BACKOFF_MS = Number(process.env.GEMINI_GLOBAL_BACKOFF_MS || 1000);
    const GEMINI_ALLOW_FALLBACK = process.env.GEMINI_ALLOW_FALLBACK === 'true';
    const GEMINI_FALLBACK_TEXT = process.env.GEMINI_FALLBACK_TEXT || 'The AI model is temporarily unavailable. Please try again later.';

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function getStatusFromError(error) {
        if (!error) return null;
        if (typeof error.status === 'number') return error.status;
        if (error.error && typeof error.error.code === 'number') return error.error.code;
        if (error.response && typeof error.response.status === 'number') return error.response.status;
        if (error.response && error.response.data && error.response.data.error && typeof error.response.data.error.code === 'number') return error.response.data.error.code;
        return null;
    }

    function extractRetryAfterMs(error) {
        if (!error) return null;

        // Prefer HTTP headers
        try {
            const headers = error.response && error.response.headers;
            const header = headers && (headers['retry-after'] || headers['Retry-After'] || headers['retry_after']);
            if (header) {
                const s = String(header).trim();
                if (/^\d+$/.test(s)) {
                    return parseInt(s, 10) * 1000; // seconds -> ms
                }
                const date = Date.parse(s);
                if (!isNaN(date)) {
                    const ms = date - Date.now();
                    return ms > 0 ? ms : 0;
                }
            }
        } catch (e) {
            // ignore header parsing errors
        }

        // Check JSON fields commonly used by APIs
        if (error.error) {
            if (typeof error.error.retryAfter === 'number') return error.error.retryAfter * 1000;
            if (typeof error.error.retry_after === 'number') return error.error.retry_after * 1000;
            if (typeof error.error.retryAfterSeconds === 'number') return error.error.retryAfterSeconds * 1000;
        }

        return null;
    }

    async function generateContentWithFailover(request) {
        let lastError = null;

        for (let globalAttempt = 0; globalAttempt < GEMINI_GLOBAL_RETRIES; globalAttempt++) {
            if (globalAttempt > 0) {
                const globalBackoff = GEMINI_GLOBAL_BACKOFF_MS * Math.pow(2, globalAttempt - 1) + Math.floor(Math.random() * 500);
                console.warn(`[Gemini] Global retry cycle ${globalAttempt}/${GEMINI_GLOBAL_RETRIES} - waiting ${globalBackoff}ms before next cycle.`);
                await sleep(globalBackoff);
            }

            for (let keyIndex = 0; keyIndex < geminiClients.length; keyIndex++) {
                const client = geminiClients[keyIndex];

                for (let attempt = 1; attempt <= GEMINI_ATTEMPTS_PER_KEY; attempt++) {
                    try {
                        if (keyIndex > 0 && attempt === 1 && globalAttempt === 0) {
                            console.warn(`[Gemini] Retrying with backup key index ${keyIndex + 1}.`);
                        } else if (globalAttempt > 0 && keyIndex === 0 && attempt === 1) {
                            console.warn(`[Gemini] Starting backup cycle with key index ${keyIndex + 1} (global attempt ${globalAttempt}).`);
                        }

                        if (attempt > 1) {
                            const backoff = GEMINI_RETRY_BASE_MS * Math.pow(2, attempt - 2);
                            const jitter = Math.floor(Math.random() * 300);
                            const delay = backoff + jitter;
                            console.warn(`[Gemini] Waiting ${delay}ms before retrying key ${keyIndex + 1} (attempt ${attempt}/${GEMINI_ATTEMPTS_PER_KEY})`);
                            await sleep(delay);
                        }

                        const response = await client.models.generateContent(request);
                        return response;
                    } catch (error) {
                        lastError = error;
                        const status = getStatusFromError(error);
                        const message = error && (error.message || JSON.stringify(error.error || error)) || String(error);
                        console.error(`[Gemini] Request failed for key index ${keyIndex + 1} (global ${globalAttempt}, attempt ${attempt}): ${message}`);

                        // Honor Retry-After header if provided by the server
                        const retryAfterMs = extractRetryAfterMs(error);
                        if (retryAfterMs) {
                            console.warn(`[Gemini] Server requested Retry-After: ${retryAfterMs}ms. Waiting before next attempt.`);
                            await sleep(retryAfterMs + Math.floor(Math.random() * 300));
                        }

                        // If the key is invalid/unauthorized, skip to next key immediately
                        if ([401, 403].includes(status)) {
                            console.error(`[Gemini] Non-retryable error for key ${keyIndex + 1} (status ${status}). Skipping this key.`);
                            break;
                        }

                        // If we've exhausted attempts for this key, move to the next key
                        if (attempt === GEMINI_ATTEMPTS_PER_KEY) {
                            console.warn(`[Gemini] Exhausted attempts for key index ${keyIndex + 1}. Moving to next key.`);
                        }
                    }
                }
            }
        }

        // After global retries, either return a graceful fallback or throw the last error
        if (GEMINI_ALLOW_FALLBACK) {
            console.warn('[Gemini] All keys failed; returning graceful fallback response per configuration.');
            return { text: GEMINI_FALLBACK_TEXT };
        }

        throw lastError || new Error('All Gemini API keys failed after retries.');
    }

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

function createChat(userId, title, mode = 'cultural') {
    const chats = getUserChats(userId);
    const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const chat = {
        id,
        title: title || (mode === 'planner' ? 'Trip Planning' : 'New chat'),
        mode: mode, // 'cultural' or 'planner'
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
    };
    chats.unshift(chat);
    return chat;
}

// Import prompt templates
const { culturalPrompt, getPlannerPrompt } = require('./prompts');

// Helper function to sanitize text for TTS (remove markdown and special characters)
function sanitizeForTTS(text) {
    return text
        // Remove markdown tables entirely (or just read the content?)
        // For now, let's remove the table structure lines but keep the content if possible, 
        // OR better: skip reading the table rows effectively to avoid reading "pipe separator pipe".
        // Strategy: Remove lines starting with | or containing | separators excessively.
        .replace(/^\|.*\|$/gm, '')          // Remove table rows
        .replace(/^\s*[-:]+\s*[-:|]+\s*[-:]+\s*$/gm, '') // Remove table divider rows

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
        // Remove checkboxes
        .replace(/\[\s?\]/g, '')            // [ ] -> 
        .replace(/\[x\]/g, '')              // [x] -> 
        // Remove code blocks and inline code
        .replace(/```[\s\S]*?```/g, '')     // ```code``` -> (removed)
        .replace(/`([^`]+)`/g, '$1')        // `code` -> code
        // Remove markdown images entirely
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // ![alt](url) -> (removed)
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
        mode: c.mode || 'cultural', // Include mode field
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    }));
    res.json({ chats });
});

app.post('/api/chats', authMiddleware, (req, res) => {
    const { title, mode } = req.body || {};
    const chat = createChat(req.user.id, title, mode);
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
                parts: [{
                    text: userMessage
                }]
            }
        ];

        // Get user profile for planner mode
        const userProfile = getUserById(req.user.id)?.profile || {};

        // Select system instruction based on chat mode
        const chatMode = chat.mode || 'cultural';
        const systemInstruction = chatMode === 'planner'
            ? getPlannerPrompt(userProfile)
            : culturalPrompt;

        console.log(`Chat mode: ${chatMode}`);

        // --- Gemini API Call ---
        const response = await generateContentWithFailover({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            },
        });

        let textResponse = response.text.trim();

        // Process [IMAGE: Topic] tag and fetch image from Wikipedia
        const imageMatch = textResponse.match(/\[IMAGE:\s*(.+?)\]/);
        if (imageMatch) {
            const imageTopic = imageMatch[1].trim();
            try {
                const wikiRes = await axios.get(`https://en.wikipedia.org/w/api.php`, {
                    params: {
                        action: 'query',
                        generator: 'search',
                        gsrsearch: imageTopic,
                        prop: 'pageimages',
                        pithumbsize: 800,
                        format: 'json'
                    },
                    headers: {
                        'User-Agent': 'CulturaChatbot/1.0 (test@example.com)'
                    }
                });
                
                const pages = wikiRes.data?.query?.pages;
                let imageUrl = '';
                if (pages) {
                    const pageWithImage = Object.values(pages).find(p => p.thumbnail && p.thumbnail.source);
                    if (pageWithImage) {
                        imageUrl = pageWithImage.thumbnail.source;
                    }
                }
                
                if (imageUrl) {
                    textResponse = textResponse.replace(imageMatch[0], `\n\n![${imageTopic}](${imageUrl})`);
                } else {
                    textResponse = textResponse.replace(imageMatch[0], ''); // Remove tag if no image
                }
            } catch (err) {
                console.error('Wikipedia API Error:', err.message);
                textResponse = textResponse.replace(imageMatch[0], '');
            }
            textResponse = textResponse.trim();
        }

        // Derive a simple title from the first user message if chat is still using default title
        if (chat.title === 'New chat' || chat.title === 'New Trip Plan' || !chat.title) {
            const snippet = userMessage.length > 60 ? `${userMessage.slice(0, 57)}...` : userMessage;
            chat.title = snippet || (chatMode === 'planner' ? 'Trip Plan' : 'New chat');
        }

        // Store user message and response in chat
        // NOTE: We store the ORIGINAL user message without the RAG context to keep history clean
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
            ttsText: sanitizeForTTS(textResponse),
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

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Cultura Backend listening at http://localhost:${port}`);
    });
}

module.exports = app;