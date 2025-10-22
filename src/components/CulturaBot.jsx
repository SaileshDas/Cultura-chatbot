import React, { useState, useEffect, useRef } from 'react'
import { Send, Map, Book, Languages, Sparkles } from 'lucide-react'
import axios from 'axios'
import MapComponent from './MapComponent'
const monumentsData = {
  hampi: { name: 'Hampi', nameKn: 'ಹಂಪಿ', location: 'Vijayanagara district', era: '14th-16th century', coordinates: { x: 45, y: 35 } },
  mysorePalace: { name: 'Mysore Palace', nameKn: 'ಮೈಸೂರು ಅರಮನೆ', location: 'Mysore', era: '1912', coordinates: { x: 35, y: 70 } },
  golGumbaz: { name: 'Gol Gumbaz', nameKn: 'ಗೋಲ ಗುಮ್ಮಟ', location: 'Bijapur', era: '1656', coordinates: { x: 30, y: 40 } },
  badami: { name: 'Badami Caves', nameKn: 'ಬಾದಾಮಿ ಗುಹೆಗಳು', location: 'Bagalkot', era: '6th century', coordinates: { x: 35, y: 38 } },
  belur: { name: 'Belur Temple', nameKn: 'ಬೇಲೂರು ದೇವಸ್ಥಾನ', location: 'Hassan', era: '1117 CE', coordinates: { x: 32, y: 58 } },
  pattadakal: { name: 'Pattadakal', nameKn: 'ಪಟ್ಟದಕಲ್ಲು', location: 'Bagalkot', era: '7th-8th century', coordinates: { x: 33, y: 37 } }
}

const characterExpressions = { idle: 0, thinking: 1, excited: 2, greeting: 3, storytelling: 4 }

const CharacterDisplay = ({ expression }) => {
  const position = characterExpressions[expression] || 0
  const [frames, setFrames] = React.useState(5)
  const [current, setCurrent] = React.useState(position)
  const [bgSize, setBgSize] = React.useState('500% 100%')
  const [bgPos, setBgPos] = React.useState(`${position * 25}% 0`)

  React.useEffect(() => {
    // update current when expression changes
    const pos = characterExpressions[expression] || 0
    setCurrent(pos)
  }, [expression])

  React.useEffect(() => {
    // Try config override first
    let cancelled = false
    fetch('/sprite.json').then(r => {
      if (!r.ok) return null
      return r.json().catch(() => null)
    }).then(cfg => {
      if (cancelled) return
      if (cfg && cfg.frames && Number(cfg.frames) > 0) {
        const detected = Number(cfg.frames)
        setFrames(detected)
        setBgSize(`${detected * 100}% 100%`)
        setBgPos(`${(current * 100) / (detected - 1)}% 0`)
        return
      }

      // preload sprite and detect frames if possible
      const img = new Image()
      img.onload = () => {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (w > h && h > 0) {
          const detected = Math.round(w / h) || 5
          setFrames(detected)
          setBgSize(`${detected * 100}% 100%`)
          setBgPos(`${(current * 100) / (detected - 1)}% 0`)
        } else {
          // fallback to 5 horizontal frames
          setFrames(5)
          setBgSize('500% 100%')
          setBgPos(`${current * 25}% 0`)
        }
      }
      img.onerror = () => {
        // do nothing; keep defaults
        setFrames(5)
        setBgSize('500% 100%')
        setBgPos(`${current * 25}% 0`)
      }
      img.src = '/sprite.png'
    }).catch(() => {
      // fallback to normal detection if sprite.json unavailable
      const img = new Image()
      img.onload = () => {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (w > h && h > 0) {
          const detected = Math.round(w / h) || 5
          setFrames(detected)
          setBgSize(`${detected * 100}% 100%`)
          setBgPos(`${(current * 100) / (detected - 1)}% 0`)
        } else {
          setFrames(5)
          setBgSize('500% 100%')
          setBgPos(`${current * 25}% 0`)
        }
      }
      img.onerror = () => {
        setFrames(5)
        setBgSize('500% 100%')
        setBgPos(`${current * 25}% 0`)
      }
      img.src = '/sprite.png'
    })
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    // update bg position when current or frames change
    if (frames > 1) {
      const posPct = (current * 100) / (frames - 1)
      setBgPos(`${posPct}% 0`)
    } else {
      setBgPos('0% 0')
    }
  }, [current, frames])

  return (
    <div className="w-full h-full relative">
      <div
        className="absolute inset-0 bg-no-repeat bg-left bg-center"
        style={{
          backgroundImage: `url('/sprite.png')`,
          backgroundSize: bgSize,
          backgroundPosition: bgPos
        }}
      />
      {/* Debug controls to step frames (visible only during development) */}
      <div className="absolute left-2 bottom-2 flex gap-2">
        <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} className="px-2 py-1 bg-white/70 rounded">◀</button>
        <div className="px-2 py-1 bg-white/70 rounded">{current + 1}/{frames}</div>
        <button onClick={() => setCurrent((c) => Math.min(frames - 1, c + 1))} className="px-2 py-1 bg-white/70 rounded">▶</button>
      </div>
    </div>
  )
}

export default function CulturaBot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [expression, setExpression] = useState('greeting')
  const [language, setLanguage] = useState('en')
  const [showMap, setShowMap] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const greeting = language === 'en'
      ? "Namaskara! I'm Cultura, your personal guide to Karnataka's magnificent heritage."
      : 'ನಮಸ್ಕಾರ! ನಾನು ಕಲ್ಚುರಾ, ಕರ್ನಾಟಕದ ಭವ್ಯವಾದ ಪರಂಪರೆಯ ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾರ್ಗದರ್ಶಿ.'
    addMessage(greeting, 'bot')
    setTimeout(() => addMessage(language === 'en' ? "Ask me anything about our heritage sites..." : 'ನಮ್ಮ ಪರಂಪರೆಯ ತಾಣಗಳ ಬಗ್ಗೆ ಕೇಳಿ...', 'bot'), 1200)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (text, sender) => setMessages(prev => [...prev, { text, sender, timestamp: Date.now() }])

  const changeExpression = (expr, duration = 3000) => {
    setExpression(expr)
    setTimeout(() => setExpression('idle'), duration)
  }

  // Local fallback responder only (no external API calls)
  const getFallbackResponse = (query) => {
    const q = query.toLowerCase()
    if (q.includes('hampi')) return "Hampi is very close to my heart! It was once the capital of the Vijayanagara Empire."
    if (q.includes('mysore') || q.includes('palace')) return 'Ah, Mysore Palace! A stunning example of Indo-Saracenic architecture.'
    if (q.includes('gol gumbaz') || q.includes('bijapur')) return 'Gol Gumbaz has a magnificent dome and a whispering gallery.'
    if (q.includes('tour')) return "Start the tour by clicking 'Tour' — I'll guide you through each monument step by step."
    if (q.includes('map')) return "Open the map to see monuments locations — click a marker to learn more."
    if (q.includes('list') || q.includes('all') || q.includes('monuments')) return 'Hampi, Mysore Palace, Gol Gumbaz, Badami, Belur, Pattadakal.'
    return "I specialize in Karnataka's heritage sites. Ask about Hampi, Mysore Palace, Gol Gumbaz, Badami, Belur, or Pattadakal."
  }

  const callLLM = async (userQuery) => {
    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userQuery })
      })
      const text = await r.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch (parseErr) {
        // Not JSON; treat text as raw response
        if (!r.ok) return { error: text || `Status ${r.status}` }
        return { text: text }
      }

      if (!r.ok) {
        return { error: data || `Status ${r.status}` }
      }

      // Try several common shapes; adapt as needed for your model's response
      if (typeof data === 'string') return { text: data }
      if (data?.text) return { text: data.text }
      if (data?.from === 'gemini' && data?.text) return { text: data.text }
      if (data?.from === 'huggingface' && data?.text) return { text: data.text }
      if (data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text) return { text: data.candidates[0].content[0].parts[0].text }
      if (data?.output?.[0]?.content) return { text: JSON.stringify(data.output[0].content) }
      if (data?.instances?.[0]?.content) return { text: data.instances[0].content }
      // Unknown shape: return entire payload as text
      return { text: JSON.stringify(data) }
    } catch (err) {
      console.warn('LLM call failed:', err)
      return { error: err.message }
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const userMessage = input.trim()
    addMessage(userMessage, 'user')
    setInput('')
    setIsLoading(true)
    changeExpression('thinking', 1200)

  setTimeout(async () => {
      const q = userMessage.toLowerCase()
      if (q.includes('map') || q.includes('show map') || q.includes('location')) {
        setShowMap(true)
        changeExpression('excited', 2000)
        addMessage(language === 'en' ? "Here's our heritage map!" : 'ಇಲ್ಲಿ ನಕ್ಷೆ ಇದೆ!', 'bot')
        setIsLoading(false)
        return
      }

      // Try server LLM proxy first
      const llmResult = await callLLM(userMessage)
      let responseText = null
      if (llmResult) {
        if (llmResult.error) {
          // show error returned from proxy and fall back
          const errText = typeof llmResult.error === 'string' ? llmResult.error : (llmResult.error ? JSON.stringify(llmResult.error) : String(llmResult.error))
          addMessage(`LLM proxy error: ${errText}`, 'bot')
          responseText = getFallbackResponse(q)
        } else {
          responseText = llmResult.text || getFallbackResponse(q)
        }
      } else {
        responseText = getFallbackResponse(q)
      }

      if (responseText.includes('!') || responseText.includes('love') || responseText.includes('magnificent')) changeExpression('excited', 2000)
      else if (responseText.includes('story') || responseText.includes('legend') || responseText.includes('centuries')) changeExpression('storytelling', 3000)
      addMessage(responseText, 'bot')
      setIsLoading(false)
    }, 700)
  }

  const handleMapClick = (monumentKey) => {
    setShowMap(false)
    const monument = monumentsData[monumentKey]
    changeExpression('excited')
    const question = language === 'en' ? `Tell me about ${monument.name}` : `${monument.nameKn} ಬಗ್ಗೆ ಹೇಳಿ`
    setInput(question)
    setTimeout(() => handleSend(), 400)
  }

  const startVirtualTour = () => {
    changeExpression('storytelling', 4000)
    const tourMsg = language === 'en'
      ? "Welcome to my virtual heritage tour! We'll start with Hampi — once one of the richest cities in the world. Ask 'next' to continue."
      : 'ನನ್ನ ವರ್ಚುವಲ್ ಪ್ರವಾಸಕ್ಕೆ ಸುಸ್ವಾಗತ!'
    addMessage(tourMsg, 'bot')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <header className="bg-gradient-to-r from-amber-700 via-orange-600 to-red-700 text-white p-4 shadow-lg border-b-4 border-yellow-500">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-orange-700" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold">Cultura</h1>
              <p className="text-sm opacity-95">{language === 'en' ? 'Your Karnataka Heritage Guide' : 'ನಿಮ್ಮ ಕರ್ನಾಟಕ ಮಾರ್ಗದರ್ಶಿ'}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2">
              <Languages className="w-4 h-4" />
              <span className="font-medium">{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
            </button>

            <button onClick={() => setShowMap(!showMap)} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2">
              <Map className="w-4 h-4" />
              <span className="font-medium">{language === 'en' ? 'Map' : 'ನಕ್ಷೆ'}</span>
            </button>

            <button onClick={startVirtualTour} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2">
              <Book className="w-4 h-4" />
              <span className="font-medium">{language === 'en' ? 'Tour' : 'ಪ್ರವಾಸ'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full flex gap-6 p-6">
        <aside className="w-72 flex-shrink-0">
          <div className="bg-white rounded-3xl shadow-2xl p-6 border-4 border-orange-200 sticky top-4">
            <div className="aspect-[3/4] mb-4 rounded-2xl overflow-hidden shadow-lg border-2 border-amber-300">
              <CharacterDisplay expression={expression} />
            </div>
            <div className="text-center">
              <div className="inline-block px-4 py-2 bg-orange-100 rounded-full border-2 border-orange-300 mb-2">
                <p className="text-sm font-semibold text-orange-800 capitalize">{expression}</p>
              </div>
              <p className="text-xs text-gray-600 mt-2 italic">"Speaking from the heart of Karnataka"</p>
            </div>
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-orange-200">
          {showMap ? (
            <div className="flex-1 relative p-8 bg-gradient-to-br from-amber-50 to-orange-50">
              <button onClick={() => setShowMap(false)} className="absolute top-4 right-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl">✕ {language === 'en' ? 'Close' : 'ಮುಚ್ಚಿ'}</button>
              <h2 className="text-3xl font-bold text-orange-800 mb-6">{language === 'en' ? 'Karnataka Heritage Map' : 'ಕರ್ನಾಟಕ ಪರಂಪರೆಯ ನಕ್ಷೆ'}</h2>
              <div className="relative w-full h-96 bg-gradient-to-br from-yellow-100 via-orange-100 to-red-100 rounded-2xl border-4 border-orange-600 shadow-inner">
                {Object.entries(monumentsData).map(([key, monument]) => (
                  <button key={key} onClick={() => handleMapClick(key)} className="absolute w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 hover:scale-110 rounded-full shadow-xl transform transition-all duration-300 flex items-center justify-center text-2xl border-4 border-white" style={{ left: `${monument.coordinates.x}%`, top: `${monument.coordinates.y}%` }} title={language === 'en' ? monument.name : monument.nameKn}>🏛️</button>
                ))}
                <div className="absolute bottom-4 left-4 bg-white p-4 rounded-xl shadow-lg border-2 border-orange-300">
                  <p className="text-sm font-bold text-orange-800">{language === 'en' ? '🎯 Click monuments to explore with me!' : '🎯 ನನ್ನೊಂದಿಗೆ ಅನ್ವೇಷಿಸಲು ಸ್ಮಾರಕಗಳನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ!'}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-amber-50/30 to-transparent">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl px-5 py-4 rounded-2xl shadow-lg ${msg.sender === 'user' ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white border-2 border-orange-600' : 'bg-gradient-to-br from-amber-50 to-orange-50 text-gray-800 border-2 border-orange-200'}`}>
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 px-5 py-4 rounded-2xl shadow-lg">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t-4 border-orange-200 p-5 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex gap-3">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={language === 'en' ? 'Ask me about Karnataka heritage...' : 'ಕರ್ನಾಟಕ ಪರಂಪರೆಯ ಬಗ್ಗೆ ಕೇಳಿ...'} disabled={isLoading} className="flex-1 px-5 py-4 rounded-2xl focus:outline-none text-lg bg-white" />
                  <button onClick={handleSend} disabled={isLoading} className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl hover:from-orange-700 hover:to-red-700 transition shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"><Send className="w-5 h-5" /><span className="hidden sm:inline">{language === 'en' ? 'Send' : 'ಕಳುಹಿಸು'}</span></button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
