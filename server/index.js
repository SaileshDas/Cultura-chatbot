import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const GEMINI_KEY = process.env.GEMINI_API_KEY
const HF_KEY = process.env.HUGGINGFACE_API_KEY
// Using a conversational model is better for general chat
const HF_MODEL = process.env.HF_MODEL || 'microsoft/DialoGPT-medium' 

if (!GEMINI_KEY) {
  console.warn('GEMINI_API_KEY is not set. Local Knowledge will be the primary source.')
}
if (HF_KEY) {
  console.log('Hugging Face key present; HF_MODEL =', HF_MODEL)
} else {
  console.log('Hugging Face key not found. Using local fallbacks if Gemini fails.')
}

// ----------------------------------------------------------------------
// 🏛️ LOCAL KNOWLEDGE BASE (Fail-proof Logic)
// ----------------------------------------------------------------------

// Utility function for consistent query matching
function normalizeQuery(query) {
    // Removes non-alphanumeric characters (except spaces) and converts to lowercase
    return query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

// Comprehensive Heritage Knowledge Base (Include all your sites here!)
// NOTE: I am adding the 'keywords' array to Hampi and Mysore as examples. 
// You must do this for all 20+ sites you have!
const heritageKnowledge = {
  // UNESCO World Heritage Sites
  hampi: {
    name: "Hampi", nameKn: "ಹಂಪಿ",
    description: "Once the magnificent capital of the Vijayanagara Empire, Hampi was one of the richest cities in the world during the 15th-16th centuries. Spread across 26 square kilometers, this UNESCO World Heritage site houses over 1,600 surviving remains including temples, palaces, and market streets. Ask about the Stone Chariot!",
    era: '14th-16th century', location: 'Vijayanagara', category: 'unesco',
    // NEW: Keywords for fuzzy matching
    keywords: ["vijayanagara", "chariot", "virupaksha", "vittala", "ruins", "capital", "stone", "boulder", "monkey"], 
  },
  mysorepalace: {
    name: "Mysore Palace", nameKn: "ಮೈಸೂರು ಅರಮನೆ",
    description: "The official residence of the Wadiyar dynasty and the seat of the Kingdom of Mysore. Built in Indo-Saracenic style, it is one of India's most visited monuments. The palace is most famous for its stunning illumination on Sunday evenings and during the Dasara festival.",
    era: '1912', location: 'Mysore', category: 'palace',
    // NEW: Keywords for fuzzy matching
    keywords: ["wadiyar", "dasara", "illumination", "royal", "wodeyar", "amaba vilas", "palace"], 
  },
  // Add all your other sites here...
  // ...
}

// Enhanced function to handle fuzzy matching
function getSmartResponse(query) {
    const normalizedQuery = normalizeQuery(query);
    const keys = Object.keys(heritageKnowledge);

    // --- Core Matching Logic ---

    for (const key of keys) {
        const item = heritageKnowledge[key];
        
        // 1. Direct key match (e.g., query is 'hampi')
        if (key === normalizedQuery) {
            return {
                source: 'local_key_match',
                data: item,
                responseText: `Ah, **${item.name}**! ${item.description}`
            };
        }

        // 2. Fuzzy/Keyword Match
        const searchableText = [
            item.name.toLowerCase(), 
            item.nameKn?.toLowerCase(), 
            item.location.toLowerCase(), 
            item.era.toLowerCase(), 
            item.category.toLowerCase(), 
            ...(item.keywords || [])
        ].filter(Boolean).join(' ');

        if (normalizedQuery.split(' ').some(word => searchableText.includes(word)) || 
            item.keywords?.some(kw => normalizedQuery.includes(kw) || kw.includes(normalizedQuery))) {
            
            return {
                source: 'local_keyword_match',
                data: item,
                responseText: `I see you are interested in **${item.name}**! ${item.description}` 
            };
        }
    }
    
    // --- Generic/List Queries ---

    if (normalizedQuery.includes('list') || normalizedQuery.includes('all sites') || normalizedQuery.includes('monuments')) {
        const siteNames = keys.map(key => heritageKnowledge[key].name).join(', ');
        return {
            source: 'local_list_response',
            data: { name: 'Heritage List' },
            responseText: `Cultura currently covers key sites including: **${siteNames}**. Which one would you like to explore in detail?`
        };
    }

    return null; // Return null if no smart response is found
}


// Final Safety Net - Always returns something friendly
function getPersonalizedFallback(query) {
  const responses = [
    "That's a wonderful question about Karnataka's heritage! I love sharing stories about our magnificent monuments. With over 20 sites, each has unique tales of kings, artists, and centuries of history. Which specific heritage site would you like to explore?",
    "I'm passionate about Karnataka's cultural treasures! From ancient Chalukyan caves to grand Vijayanagara palaces, every monument tells a story. Would you like to hear about Hampi's lost empire, Mysore's royal legacy, or perhaps our architectural marvels?",
    "As your heritage guide, I'm excited to share Karnataka's rich history with you! Our monuments showcase 1,500 years of art and culture. Try asking about a specific place like 'Hampi' or 'Mysore Palace'.",
    "Karnataka's heritage is truly magnificent! I can tell you about ancient empires, architectural wonders, legends, and the best times to visit. What would you like to discover?"
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

// ----------------------------------------------------------------------
// 🚀 API ROUTES
// ----------------------------------------------------------------------

// Status endpoint for debugging (does not return secrets)
app.get('/api/status', (req, res) => {
  res.json({ 
    gemini: Boolean(GEMINI_KEY), 
    huggingface: Boolean(HF_KEY), 
    hf_model: HF_MODEL,
    local_knowledge: Object.keys(heritageKnowledge).length > 0 
  })
})

app.post('/api/generate', async (req, res) => {
  // Use 'query' here as it aligns with the frontend's intent (even if it was 'prompt' before)
  const { query, history } = req.body 
  
  if (!query || typeof query !== 'string' || query.length > 4000) {
    return res.status(400).json({ error: 'Invalid query' })
  }

  // -----------------------------------------
  // PRIORITY 1: LOCAL SMART KNOWLEDGE BASE
  // -----------------------------------------
  const smartResponseObject = getSmartResponse(query);
  if (smartResponseObject) {
    // Found a match in our fail-proof local data
    return res.json({ 
      message: smartResponseObject.responseText, 
      source: smartResponseObject.source,
      smartData: smartResponseObject.data
    });
  }

  let finalResponseText = null;
  let sourceType = null;

  // -----------------------------------------
  // PRIORITY 2: GEMINI LLM PROXY
  // -----------------------------------------
  if (GEMINI_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`
      const body = { contents: [{ parts: [{ text: query }] }] } // Simple prompt structure

      const r = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } })
      
      const d = r.data
      const gemText = d?.candidates?.[0]?.content?.parts?.[0]?.text
      
      if (gemText) {
        finalResponseText = gemText;
        sourceType = 'gemini';
      } else {
        console.warn('Gemini response successful but text extraction failed. Falling back.', d);
      }
    } catch (err) {
      const axiosResp = err?.response
      console.error('Gemini Proxy error status:', axiosResp?.status || 500);
      console.error('Gemini Proxy error message:', err.message);
      // Fall through to next priority
    }
  }

  // -----------------------------------------
  // PRIORITY 3: HUGGING FACE PROXY
  // -----------------------------------------
  if (!finalResponseText && HF_KEY) {
    const modelsToTry = [HF_MODEL, 'gpt2', 'distilgpt2'].filter(Boolean)
    let lastErr = null
    
    for (const model of modelsToTry) {
      try {
        console.log('Attempting Hugging Face fallback with model', model)
        const hfUrl = `https://api-inference.huggingface.co/models/${model}`
        // Include history for better conversational context with HF models
        const hfQuery = history ? history.map(msg => `${msg.sender}: ${msg.message}`).join('\n') + `\nUser: ${query}` : query;

        const hfResp = await axios.post(hfUrl, { inputs: hfQuery, options: { wait_for_model: true } }, { headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' } })
        
        const hfData = hfResp.data
        let extractedText = null;

        if (hfData?.generated_text) extractedText = hfData.generated_text;
        else if (Array.isArray(hfData) && hfData[0]?.generated_text) extractedText = hfData[0].generated_text;
        else if (typeof hfData === 'string') extractedText = hfData;

        if (extractedText) {
            finalResponseText = extractedText;
            sourceType = 'hugging_face';
            break; // Success, break out of model loop
        }
      } catch (hfErr) {
        console.error(`Hugging Face model ${model} error:`, hfErr?.response?.status, hfErr?.response?.data || hfErr.message)
        lastErr = hfErr
        // try next model
      }
    }
    
    if (sourceType !== 'hugging_face' && lastErr) {
        // Log the final failure, but do not send an error response yet
        console.error('All Hugging Face models failed. Entering final local fallback.')
    }
  }

  // -----------------------------------------
  // PRIORITY 4: LOCAL PERSONALIZED FALLBACK
  // -----------------------------------------
  if (!finalResponseText) {
      finalResponseText = getPersonalizedFallback(query);
      sourceType = 'local_fallback';
  }
  
  // Final successful response
  res.json({ 
    message: finalResponseText, 
    source: sourceType,
    smartData: null
  });

})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})