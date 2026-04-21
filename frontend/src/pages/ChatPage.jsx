import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import '../App.css';

const suggestedPrompts = [
  "Tell me a legendary folk tale from Karnataka.",
  "What's the story behind the Nandi Bull statue?",
  "Explain the Yakshagana theatrical tradition.",
  "What legends surround the Chamundeshwari temple?",
  "What are the must-visit heritage sites in Hampi?",
  "How did the Vijayanagara empire influence art here?",
  "Describe the unique architecture of Belur temples.",
  "What makes Halebidu a masterpiece of Hoysala art?",
  "Tell me about the Tipu Sultan's palaces.",
  "Describe the flavours of a classic Udupi meal.",
  "What makes Coorg coffee special?",
  "Explain the significance of dosa in Karnataka cuisine.",
  "What are the traditional spices used in Coorgi cooking?",
  "Describe a traditional Kannadiga breakfast.",
  "What is the significance of Mysore silk?",
  "Tell me about traditional Sandalwood carving.",
  "Explain the Bidriware metalwork tradition.",
  "What makes Chitradurga stone carvings unique?",
  "What's the cultural importance of Ugadi festival?",
  "Explain the traditions of Dasara in Karnataka.",
  "Tell me about the Veerashaiva philosophy.",
  "What role do marigolds play in Karnataka festivals?",
  "What makes the Western Ghats of Karnataka special?",
  "Tell me about the coffee plantations of Coorg.",
  "Describe the biodiversity of Kodagu district.",
  "What's unique about Karnataka's beaches?",
  "Tell me about the life of Tipu Sultan.",
  "Who was Krishnaraja Wadiyar and his contributions?",
  "Explain the legacy of poet Purandara Dasa.",
  "What did Saint Basaveshwara preach?",
  "What's the richness of the Kannada language?",
  "Tell me about famous Kannada literature.",
  "Explain the Bhakti movement in Karnataka.",
  "What role did Kannada poets play in culture?",
];

export default function ChatPage() {
  const { authToken, currentUser, API_BASE, TTS_BASE, authHeaders, saveAuth, clearAuth } = useAuth();
  const navigate = useNavigate();

  // ── View state ──────────────────────────────────────────────────────────────
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [view, setView] = useState('chat'); // 'chat' | 'profile'

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [inputMessage, setInputMessage] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMode, setChatMode] = useState('cultural');
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);

  // ── Profile state ───────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Recording state ─────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');

  // ── Refs ────────────────────────────────────────────────────────────────────
  const chatHistoryEndRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const currentAudioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalTurns = chatHistory.length;
  const aiTurns = chatHistory.filter((m) => m.role === 'ai').length;

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    chatHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // ── Close prompt dropdown on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowPromptDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const speakWithBrowserTTS = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.includes('en-IN') &&
          (v.name.includes('Female') || v.name.includes('Feminine') || v.name.includes('Google') || !v.name.includes('Male'))
      );
      const femaleFallback = voices.find(
        (v) =>
          !v.name.includes('Male') &&
          (v.name.includes('Female') || v.name.includes('Feminine') || v.name.includes('Google'))
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      else if (femaleFallback) utterance.voice = femaleFallback;
      utterance.pitch = 1.1;
      utterance.rate = 1.1;
      utterance.onstart = () => setIsTalking(true);
      utterance.onend = () => setIsTalking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsTalking(false);
    }
  }, []);

  const speak = useCallback(
    async (text) => {
      if (!TTS_BASE) { speakWithBrowserTTS(text); return; }
      try {
        const ttsResponse = await fetch(`${TTS_BASE}/api/generate-tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!ttsResponse.ok) throw new Error('Piper TTS server error');
        const ttsData = await ttsResponse.json();
        if (ttsData.status === 'success' && ttsData.audio_base64) {
          try {
            const binaryString = atob(ttsData.audio_base64);
            const audioArray = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) audioArray[i] = binaryString.charCodeAt(i);
            const audioBlob = new Blob([audioArray], { type: ttsData.mime_type || 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.onplay = () => { currentAudioRef.current = audio; setIsTalking(true); };
            audio.onended = () => { setIsTalking(false); currentAudioRef.current = null; URL.revokeObjectURL(audioUrl); };
            audio.onerror = () => { setIsTalking(false); currentAudioRef.current = null; URL.revokeObjectURL(audioUrl); speakWithBrowserTTS(text); };
            audio.play().catch(() => { setIsTalking(false); currentAudioRef.current = null; URL.revokeObjectURL(audioUrl); speakWithBrowserTTS(text); });
          } catch { speakWithBrowserTTS(text); }
        } else {
          speakWithBrowserTTS(text);
        }
      } catch { speakWithBrowserTTS(text); }
    },
    [TTS_BASE, speakWithBrowserTTS]
  );

  const handleStopSpeaking = () => {
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch { /* ignore */ }
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); currentAudioRef.current.currentTime = 0; } catch { /* ignore */ }
      currentAudioRef.current = null;
    }
    setIsTalking(false);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ STT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const fallbackToWebSpeech = () =>
    new Promise((resolve) => {
      setRecordingStatus('Using browser speech recognition...');
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { alert('Speech recognition not supported.'); setRecordingStatus(''); resolve(''); return; }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (e) => { setRecordingStatus(''); resolve(e.results[0][0].transcript); };
      recognition.onerror = (e) => { setRecordingStatus(''); alert(`Speech recognition error: ${e.error}`); resolve(''); };
      recognition.onend = () => setRecordingStatus('');
      recognition.start();
    });

  const transcribeAudio = async (audioBlob) => {
    try {
      if (!TTS_BASE) return await fallbackToWebSpeech();
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      setRecordingStatus('Transcribing with Whisper...');
      const response = await fetch(`${TTS_BASE}/api/transcribe`, { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.text) return data.text;
      }
      return await fallbackToWebSpeech();
    } catch { return await fallbackToWebSpeech(); }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { alert('Your browser does not support audio recording.'); return; }
    try {
      setRecordingStatus('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        setRecordingStatus('Processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const transcribed = await transcribeAudio(audioBlob);
        if (transcribed) { setInputMessage(transcribed); setRecordingStatus(''); }
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus('Recording… (click again to stop)');
    } catch { setRecordingStatus(''); alert('Failed to access microphone. Please check permissions.'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const handleMicClick = () => (isRecording ? stopRecording() : startRecording());

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ AUTH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authUsername.trim() || !authPassword.trim()) { setAuthError('Username and password are required.'); return; }
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername.trim(), password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Authentication failed.'); return; }
      saveAuth(data.token, data.user);
      setAuthPassword('');
      setAuthUsername('');
      setAuthError('');
      setTimeout(() => fetchChats(), 0);
    } catch { setAuthError('Unable to reach authentication server.'); }
  };

  const handleLogout = () => {
    clearAuth();
    setChatHistory([]);
    setProfile(null);
    setView('chat');
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ DATA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const fetchProfile = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load profile');
      setProfile(data.profile || {});
      setProfileError('');
    } catch (err) { console.error(err); setProfileError('Unable to load profile.'); }
  }, [API_BASE, authToken]);

  const fetchChats = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/chats`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) throw new Error('Failed to load chats');
      const data = await res.json();
      setChats(data.chats || []);
      setActiveChatId((current) => (!current && data.chats?.length > 0 ? data.chats[0].id : current));
    } catch (err) { console.error(err); }
  }, [API_BASE, authToken]);

  useEffect(() => { if (authToken) fetchChats(); }, [authToken, fetchChats]);

  const loadChatMessages = useCallback(
    async (chatId) => {
      if (!authToken || !chatId) return;
      try {
        const res = await fetch(`${API_BASE}/api/chats/${chatId}`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (!res.ok) throw new Error('Failed to load chat');
        const data = await res.json();
        setChatHistory(data.chat?.messages || []);
      } catch (err) { console.error(err); }
    },
    [API_BASE, authToken]
  );

  useEffect(() => { if (activeChatId) loadChatMessages(activeChatId); }, [activeChatId]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ CHAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTalking || !authToken || !activeChatId) return;
    setIsTalking(true);
    const userMessage = inputMessage;
    setInputMessage('');
    setChatHistory((prev) => [...prev, { role: 'user', text: userMessage }]);
    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: userMessage, chatId: activeChatId }),
      });
      if (!response.ok) {
        setChatHistory((prev) => [...prev, { role: 'ai', text: 'Error: Could not reach the Cultura Backend server.' }]);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const chatbotResponseText = data.response || 'I could not find a text response.';
      const ttsText = data.ttsText || chatbotResponseText;
      setChatHistory((prev) => [...prev, { role: 'ai', text: chatbotResponseText }]);
      fetchChats();
      speak(ttsText);
    } catch (error) { console.error('Error in chat process:', error); setIsTalking(false); }
  };

  const handleSuggestion = (prompt) => {
    if (isTalking) return;
    setInputMessage(prompt);
    inputRef.current?.focus();
  };

  const inspirePrompt = () => handleSuggestion(suggestedPrompts[Math.floor(Math.random() * suggestedPrompts.length)]);

  const focusInputField = () => inputRef.current?.focus();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <div className="chat-page-shell app-shell">
      {/* Animated GIF background — <img> ensures the GIF actually plays */}
      <img
        src="/models/Cultura-Background(1).gif"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: 0.06,
          filter: 'blur(6px) saturate(0.6)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Existing aurora/noise layers */}
      <div className="bg-lattice" aria-hidden="true" />
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="aurora aurora-two" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />

      {/* ─── Chat Page Navbar ─── */}
      <nav className="top-nav chat-page-nav">
        <div className="logo-cluster">
          <div className="logo-mark">C</div>
          <div className="logo-copy">
            <span>Cultura AI Studio</span>
            <p>Future-forward heritage intelligence</p>
          </div>
        </div>

        <div className="nav-meta">
          {/* Back to Home */}
          <Link
            to="/"
            className="nav-pill ghost flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 no-underline"
            style={{ display: 'inline-flex', textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Home
          </Link>

          <span className="nav-pill">Beta · build 0.7</span>

          {currentUser ? (
            <>
              <button
                type="button"
                className="nav-pill subtle"
                onClick={() => { setView('profile'); if (!profile) fetchProfile(); }}
              >
                {currentUser.username}
              </button>
              <button type="button" className="nav-pill ghost" onClick={() => setView('chat')}>Chat</button>
              <button type="button" className="nav-pill ghost" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <span className="nav-pill subtle">Guest</span>
          )}
        </div>
      </nav>

      {/* ═══════════════════ AUTH VIEW ═══════════════════ */}
      {!currentUser && (
        <div className="content-grid" style={{ animation: 'pageEnter 0.45s ease both' }}>
          <section className="immersive-panel">
            <header className="section-header">
              <p className="eyebrow">Welcome to Cultura</p>
            </header>
            <div className="hero-grid no-3d">
              <div className="hero-copy">
                <h1>Sign in to your Cultura studio.</h1>
                <p>
                  Create an account to save your sessions, build a traveler profile, and unlock richer,
                  voice-first journeys through Karnataka&apos;s heritage.
                </p>
              </div>
            </div>
            <div className="auth-card">
              <div className="auth-toggle">
                <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Log in</button>
                <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button>
              </div>
              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <input type="text" placeholder="Username" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} autoComplete="username" />
                <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} />
                <button type="submit" className="primary-cta">
                  {authMode === 'login' ? 'Enter studio' : 'Create my Cultura account'}
                </button>
                {authError && <div className="auth-error">{authError}</div>}
              </form>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════ CHAT VIEW ═══════════════════ */}
      {currentUser && view === 'chat' && (
        <div className="content-grid" style={{ animation: 'pageEnter 0.45s ease both' }}>
          <section className="immersive-panel">
            <header className="section-header">
              <p className="eyebrow">Immersive culture intelligence</p>
              <div className={`status-chip ${isTalking ? 'active' : ''}`}>
                <span className="pulse-dot" />
                {isTalking ? 'Narrating live' : 'Standing by'}
              </div>
            </header>
            <div className="hero-grid no-3d">
              <div className="hero-copy">
                <h1>Step into a living archive of Karnataka.</h1>
                <p>
                  Wander through dynasties, craftsmanship, festivals, and hidden trails with a culturally grounded
                  AI guide that narrates each answer in real time.
                </p>
                <div className="hero-actions">
                  <button type="button" className="primary-cta" onClick={focusInputField}>Start asking</button>
                  <button type="button" className="ghost-cta" onClick={inspirePrompt}>Surprise me</button>
                </div>
              </div>
              <div className="hero-tiles">
                <div className="tile"><p>Stories exchanged</p><strong>{totalTurns}</strong></div>
                <div className="tile"><p>Insights narrated</p><strong>{aiTurns}</strong></div>
                <div className="tile highlight"><p>Signed in</p><strong>{currentUser ? 'Yes' : 'No'}</strong></div>
              </div>
            </div>
          </section>

          <section className="chat-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Conversational studio</p>
                <h3>Ask Cultura anything</h3>
                <p className="subtitle">Try guided prompts or freestyle curiosities. Cultura replies with layered insights and narration.</p>
              </div>
              <div className="header-badges">
                <span className="badge">Voice {isTalking ? 'live' : 'standby'}</span>
                <span className="badge subtle">{chatHistory.length ? 'Session in progress' : 'Fresh session'}</span>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="mode-selector" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <button type="button" className={`mode-button ${chatMode === 'cultural' ? 'active' : ''}`} onClick={() => setChatMode('cultural')}>🏛️ Cultural Guide</button>
              <button type="button" className={`mode-button ${chatMode === 'planner' ? 'active' : ''}`} onClick={() => setChatMode('planner')}>✈️ Travel Planner</button>
            </div>

            {/* Chat Toolbar */}
            <div className="chat-toolbar">
              <div>
                {chats.length === 0 ? (
                  <span className="badge subtle">No chats yet</span>
                ) : (
                  <select
                    className="chat-history-select"
                    value={activeChatId || ''}
                    onChange={(e) => setActiveChatId(e.target.value || null)}
                  >
                    {chats.map((chat) => (
                      <option key={chat.id} value={chat.id}>{chat.title || 'Untitled chat'}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="chat-toolbar-actions">
                <button
                  type="button"
                  className="nav-pill"
                  onClick={async () => {
                    if (!authToken) return;
                    try {
                      const res = await fetch(`${API_BASE}/api/chats`, {
                        method: 'POST',
                        headers: authHeaders,
                        body: JSON.stringify({ title: chatMode === 'planner' ? 'New Trip Plan' : 'New chat', mode: chatMode }),
                      });
                      const data = await res.json();
                      if (res.ok && data.chat) { setChats((prev) => [data.chat, ...prev]); setActiveChatId(data.chat.id); setChatHistory([]); }
                    } catch (err) { console.error('Failed to create chat', err); }
                  }}
                >
                  New chat
                </button>
                <button
                  type="button"
                  className="nav-pill ghost"
                  disabled={!activeChatId}
                  onClick={async () => {
                    if (!authToken || !activeChatId) return;
                    if (!window.confirm('Delete this chat permanently?')) return;
                    try {
                      const res = await fetch(`${API_BASE}/api/chats/${activeChatId}`, { method: 'DELETE', headers: authHeaders });
                      if (res.ok) {
                        setChats((prev) => prev.filter((c) => c.id !== activeChatId));
                        setActiveChatId((prev) => { const rem = chats.filter((c) => c.id !== prev); return rem[0]?.id || null; });
                        setChatHistory([]);
                      }
                    } catch (err) { console.error('Failed to delete chat', err); }
                  }}
                >
                  Delete chat
                </button>

              </div>
            </div>

            {/* Prompt Dropdown */}
            <div className="prompt-dropdown-container" ref={dropdownRef}>
              <button
                className="prompt-dropdown-toggle"
                onClick={() => setShowPromptDropdown(!showPromptDropdown)}
                disabled={isTalking}
              >
                <span>💡 Surprise me with a prompt</span>
                <svg className={`dropdown-arrow ${showPromptDropdown ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {showPromptDropdown && (
                <div className="prompt-dropdown-menu">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      type="button"
                      key={prompt}
                      className="prompt-dropdown-item"
                      onClick={() => { handleSuggestion(prompt); setShowPromptDropdown(false); }}
                      disabled={isTalking}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Card */}
            <div className="chat-card">
              <div className="chat-history">
                {chatHistory.length === 0 ? (
                  <div className="chat-history-empty">
                    <strong>Welcome to Cultura</strong>
                    <p>
                      {currentUser
                        ? 'Create a chat and ask about art, dynasties, craftsmanship, cuisine, festivals, or hidden routes across Karnataka.'
                        : 'Log in or create an account to start storing your chats locally.'}
                    </p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div key={idx} className={`message-bubble ${msg.role}`}>
                      <div className="message-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            input: ({ node, ...props }) => (
                              <input type="checkbox" defaultChecked={props.checked} style={{ margin: '0 0.5em 0.2em 0', verticalAlign: 'middle' }} />
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))
                )}
                {isTalking && (
                  <div className="message-bubble ai">
                    <div className="message-content">
                      <div className="typing-indicator">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatHistoryEndRef} />
              </div>

              {/* Input Area */}
              <div className="chat-input-area">
                <form onSubmit={handleSubmit} className="chat-form">
                  <input
                    ref={inputRef}
                    type="text"
                    className="chat-input"
                    placeholder={
                      !currentUser
                        ? 'Log in to start chatting'
                        : !activeChatId
                        ? 'Create a new chat to begin'
                        : isTalking
                        ? 'Cultura is speaking...'
                        : 'Type your next curiosity'
                    }
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isTalking || !currentUser || !activeChatId}
                  />
                  <button
                    type="button"
                    className={`mic-button ${isRecording ? 'recording' : ''}`}
                    onClick={handleMicClick}
                    disabled={isTalking || !currentUser || !activeChatId}
                    aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
                  >
                    {isRecording ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M19 10V12C19 15.866 15.866 19 12 19M5 10V12C5 15.866 8.13401 19 12 19M12 19V23M8 23H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                  {/* Stop voice — inline, only visible while narrating */}
                  {isTalking && (
                    <button
                      type="button"
                      onClick={handleStopSpeaking}
                      aria-label="Stop voice"
                      title="Stop narration"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0 1.1rem',
                        height: '60px',
                        borderRadius: 18,
                        border: '1px solid rgba(255,68,68,0.55)',
                        background: 'rgba(255,68,68,0.12)',
                        color: '#ff6b6b',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        flexShrink: 0,
                        animation: 'stopPulse 2s ease-in-out infinite',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="5" y="5" width="14" height="14" rx="2" />
                      </svg>
                      Stop
                    </button>
                  )}

                  <button
                    type="submit"
                    className="send-button"
                    disabled={isTalking || !inputMessage.trim() || !currentUser || !activeChatId}
                    aria-label="Send message"
                  >
                    {isTalking ? (
                      <div className="loading-dots">
                        <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
                      </div>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </form>
                {recordingStatus && <p className="recording-status">{recordingStatus}</p>}
                <p className="input-hint">Press Enter to send • Cultura narrates each reply aloud</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════ PROFILE VIEW ═══════════════════ */}
      {currentUser && view === 'profile' && (
        <div className="content-grid" style={{ animation: 'pageEnter 0.45s ease both' }}>
          <section className="immersive-panel">
            <header className="section-header">
              <p className="eyebrow">Traveler profile</p>
            </header>
            <div className="profile-panel">
              <h3>Tell Cultura how you like to travel.</h3>
              <p className="subtitle">These preferences help future destination guides stay aligned with your pace, interests, and comfort.</p>
              <div className="profile-grid">
                {[
                  { id: 'fullName', label: 'Full name', type: 'input', value: profile?.fullName || '', key: 'fullName' },
                  { id: 'homeCity', label: 'Home city', type: 'input', value: profile?.homeCity || '', key: 'homeCity' },
                  { id: 'homeCountry', label: 'Home country', type: 'input', value: profile?.homeCountry || '', key: 'homeCountry' },
                ].map(({ id, label, value, key }) => (
                  <div key={id} className="profile-field">
                    <label htmlFor={id}>{label}</label>
                    <input id={id} type="text" value={value} onChange={(e) => setProfile({ ...(profile || {}), [key]: e.target.value })} />
                  </div>
                ))}
                <div className="profile-field">
                  <label htmlFor="languages">Preferred languages</label>
                  <input
                    id="languages"
                    type="text"
                    placeholder="e.g. English, Kannada"
                    value={Array.isArray(profile?.preferredLanguages) ? profile.preferredLanguages.join(', ') : profile?.preferredLanguages || ''}
                    onChange={(e) => setProfile({ ...(profile || {}), preferredLanguages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  />
                </div>
                <div className="profile-field">
                  <label htmlFor="interests">Travel interests</label>
                  <textarea id="interests" placeholder="Heritage walks, food trails, temples, trekking…" value={profile?.travelInterests || ''} onChange={(e) => setProfile({ ...(profile || {}), travelInterests: e.target.value })} />
                </div>
                <div className="profile-field">
                  <label htmlFor="style">Travel style</label>
                  <select id="style" value={profile?.travelStyle || ''} onChange={(e) => setProfile({ ...(profile || {}), travelStyle: e.target.value })}>
                    <option value="">Select</option>
                    <option value="slow">Slow &amp; immersive</option>
                    <option value="packed">Packed itinerary</option>
                    <option value="family">Family-friendly</option>
                    <option value="solo">Solo explorer</option>
                  </select>
                </div>
                <div className="profile-field">
                  <label htmlFor="budget">Budget level</label>
                  <select id="budget" value={profile?.budgetLevel || ''} onChange={(e) => setProfile({ ...(profile || {}), budgetLevel: e.target.value })}>
                    <option value="">Select</option>
                    <option value="budget">Budget</option>
                    <option value="mid-range">Mid-range</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="profile-field">
                  <label htmlFor="access">Accessibility needs</label>
                  <textarea id="access" placeholder="Mobility, dietary or sensory preferences." value={profile?.accessibilityNeeds || ''} onChange={(e) => setProfile({ ...(profile || {}), accessibilityNeeds: e.target.value })} />
                </div>
              </div>
              <div className="profile-footer">
                <div>{profileError && <div className="auth-error">{profileError}</div>}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="nav-pill ghost"
                    disabled={profileSaving}
                    onClick={async () => {
                      if (!authToken || !profile) return;
                      setProfileSaving(true);
                      setProfileError('');
                      try {
                        const res = await fetch(`${API_BASE}/api/profile`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ profile }) });
                        const data = await res.json();
                        if (!res.ok) setProfileError(data.error || 'Failed to save profile.');
                        else setProfile(data.profile || profile);
                      } catch { setProfileError('Failed to save profile.'); }
                      finally { setProfileSaving(false); }
                    }}
                  >
                    {profileSaving ? 'Saving…' : 'Save profile'}
                  </button>
                  <button
                    type="button"
                    className="nav-pill profile-danger"
                    onClick={async () => {
                      if (!authToken) return;
                      if (!window.confirm('Delete your Cultura account and all chats permanently?')) return;
                      try { await fetch(`${API_BASE}/api/account`, { method: 'DELETE', headers: authHeaders }); } catch { /* ignore */ }
                      finally { handleLogout(); }
                    }}
                  >
                    Delete account
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
