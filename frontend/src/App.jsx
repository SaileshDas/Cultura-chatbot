import React, { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';


function App() {
	// --- AUTH & CHAT STATE ---
	const [inputMessage, setInputMessage] = useState('');
	const [isTalking, setIsTalking] = useState(false);
	const [chatHistory, setChatHistory] = useState([]);
	const [authToken, setAuthToken] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
	const [authUsername, setAuthUsername] = useState('');
	const [authPassword, setAuthPassword] = useState('');
	const [authError, setAuthError] = useState('');
	const [chats, setChats] = useState([]);
	const [activeChatId, setActiveChatId] = useState(null);
	const [view, setView] = useState('auth'); // 'auth' | 'chat' | 'profile'
	const [showProfile, setShowProfile] = useState(false);
	const [profile, setProfile] = useState(null);
	const [profileError, setProfileError] = useState('');
	const [profileSaving, setProfileSaving] = useState(false);
	const [showPromptDropdown, setShowPromptDropdown] = useState(false);
	const chatHistoryEndRef = useRef(null);
	const inputRef = useRef(null);
	const dropdownRef = useRef(null);
	const currentAudioRef = useRef(null);
	// -------------------------

	// --- CLIENT HELPERS ---
	const API_BASE = 'http://localhost:3001';

	const suggestedPrompts = [
		// Legends & Stories
		"Tell me a legendary folk tale from Karnataka.",
		"What's the story behind the Nandi Bull statue?",
		"Explain the Yakshagana theatrical tradition.",
		"What legends surround the Chamundeshwari temple?",

		// Heritage & Architecture
		"What are the must-visit heritage sites in Hampi?",
		"How did the Vijayanagara empire influence art here?",
		"Describe the unique architecture of Belur temples.",
		"What makes Halebidu a masterpiece of Hoysala art?",
		"Tell me about the Tipu Sultan's palaces.",

		// Cuisine & Food
		"Describe the flavours of a classic Udupi meal.",
		"What makes Coorg coffee special?",
		"Explain the significance of dosa in Karnataka cuisine.",
		"What are the traditional spices used in Coorgi cooking?",
		"Describe a traditional Kannadiga breakfast.",

		// Arts & Crafts
		"What is the significance of Mysore silk?",
		"Tell me about traditional Sandalwood carving.",
		"Explain the Bidriware metalwork tradition.",
		"What makes Chitradurga stone carvings unique?",

		// Festivals & Celebrations
		"What's the cultural importance of Ugadi festival?",
		"Explain the traditions of Dasara in Karnataka.",
		"Tell me about the Veerashaiva philosophy.",
		"What role do marigolds play in Karnataka festivals?",

		// Nature & Geography
		"What makes the Western Ghats of Karnataka special?",
		"Tell me about the coffee plantations of Coorg.",
		"Describe the biodiversity of Kodagu district.",
		"What's unique about Karnataka's beaches?",

		// Famous Personalities
		"Tell me about the life of Tipu Sultan.",
		"Who was Krishnaraja Wadiyar and his contributions?",
		"Explain the legacy of poet Purandara Dasa.",
		"What did Saint Basaveshwara preach?",

		// Languages & Literature
		"What's the richness of the Kannada language?",
		"Tell me about famous Kannada literature.",
		"Explain the Bhakti movement in Karnataka.",
		"What role did Kannada poets play in culture?"
	];

	const totalTurns = chatHistory.length;
	const aiTurns = chatHistory.filter(msg => msg.role === 'ai').length;

	// Load auth from localStorage on first mount
	useEffect(() => {
		const stored = window.localStorage.getItem('cultura_auth');
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				if (parsed.token && parsed.user) {
					// Backwards compatibility if older data used email instead of username
					const user = parsed.user.username
						? parsed.user
						: { ...parsed.user, username: parsed.user.email };
					setAuthToken(parsed.token);
					setCurrentUser(user);
					setView('chat');
				}
			} catch {
				// ignore bad data
			}
		}
	}, []);

	// Auto-scroll to bottom of chat
	const scrollToBottom = () => {
		chatHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [chatHistory]);

	// --- BROWSER NATIVE TEXT-TO-SPEECH FUNCTION (Fallback) ---
	const speakWithBrowserTTS = useCallback((text) => {
		// Check if the browser supports Speech Synthesis
		if ('speechSynthesis' in window) {
			// Clear any currently speaking utterances before starting a new one
			window.speechSynthesis.cancel();

			const utterance = new SpeechSynthesisUtterance(text);

			utterance.onstart = () => setIsTalking(true);
			utterance.onend = () => setIsTalking(false);

			// --- VOICE SELECTION AND MONOTONY FIX ---
			const voices = window.speechSynthesis.getVoices();

			// 1. Prioritize a Female Indian English Voice
			const preferredVoice = voices.find(
				voice =>
					voice.lang.includes('en-IN') &&
					(voice.name.includes('Female') || voice.name.includes('Feminine') || voice.name.includes('Google') || !voice.name.includes('Male'))
			);

			// 2. Fallback to any generic female voice
			const femaleFallback = voices.find(
				voice =>
					!voice.name.includes('Male') &&
					(voice.name.includes('Female') || voice.name.includes('Feminine') || voice.name.includes('Google'))
			);

			// Set the chosen voice
			if (preferredVoice) {
				utterance.voice = preferredVoice;
			} else if (femaleFallback) {
				utterance.voice = femaleFallback;
			}

			// 3. Adjust Pitch (to sound more lively) and Rate (to sound less monotonous)
			utterance.pitch = 1.1; // Slightly higher pitch
			utterance.rate = 1.1;  // Slightly faster rate

			window.speechSynthesis.speak(utterance);
		} else {
			console.warn("Browser does not support Web Speech API for speaking. Response will only be displayed in the console.");
			setIsTalking(false);
		}
	}, []);

	// --- PIPER TTS FUNCTION (Primary) with Browser TTS Fallback ---
	const speak = useCallback(async (text) => {
		try {
			// Try Piper TTS first
			const ttsResponse = await fetch('http://localhost:5000/api/generate-tts', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ text: text }),
			});

			if (!ttsResponse.ok) {
				throw new Error('Piper TTS server error');
			}

			const ttsData = await ttsResponse.json();

			if (ttsData.status === 'success' && ttsData.audio_base64) {
				// Piper TTS succeeded - play the audio
				try {
					// Decode base64 to binary
					const binaryString = atob(ttsData.audio_base64);
					const audioArray = new Uint8Array(binaryString.length);
					for (let i = 0; i < binaryString.length; i++) {
						audioArray[i] = binaryString.charCodeAt(i);
					}

					const audioBlob = new Blob([audioArray], { type: ttsData.mime_type || 'audio/wav' });
					const audioUrl = URL.createObjectURL(audioBlob);
					const audio = new Audio(audioUrl);

					audio.onplay = () => {
						currentAudioRef.current = audio;
						setIsTalking(true);
					};
					audio.onended = () => {
						setIsTalking(false);
						currentAudioRef.current = null;
						URL.revokeObjectURL(audioUrl);
					};
					audio.onerror = (e) => {
						console.error('Audio playback error:', e);
						setIsTalking(false);
						currentAudioRef.current = null;
						URL.revokeObjectURL(audioUrl);
						// Fallback to browser TTS on audio playback error
						console.warn('Piper audio playback failed, falling back to browser TTS');
						speakWithBrowserTTS(text);
					};

					audio.play().catch((error) => {
						console.error('Audio play error:', error);
						setIsTalking(false);
						currentAudioRef.current = null;
						URL.revokeObjectURL(audioUrl);
						speakWithBrowserTTS(text);
					});
				} catch (decodeError) {
					console.error('Error decoding Piper audio:', decodeError);
					speakWithBrowserTTS(text);
				}
			} else {
				// Piper TTS not available - fallback to browser TTS
				console.log('Piper TTS not available, using browser TTS fallback');
				speakWithBrowserTTS(text);
			}
		} catch (error) {
			// Error connecting to Piper TTS server - fallback to browser TTS
			console.warn('Piper TTS request failed, falling back to browser TTS:', error);
			speakWithBrowserTTS(text);
		}
	}, [speakWithBrowserTTS]);

	// --- AUTH HELPERS ---
	const saveAuth = (token, user) => {
		setAuthToken(token);
		setCurrentUser(user);
		setView('chat');
		window.localStorage.setItem('cultura_auth', JSON.stringify({ token, user }));
	};

	const clearAuth = () => {
		setAuthToken(null);
		setCurrentUser(null);
		setChats([]);
		setActiveChatId(null);
		setView('auth');
		window.localStorage.removeItem('cultura_auth');
	};

	const authHeaders = authToken
		? { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
		: { 'Content-Type': 'application/json' };

	const fetchProfile = useCallback(async () => {
		if (!authToken) return;
		try {
			const res = await fetch(`${API_BASE}/api/profile`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to load profile');
			}
			setProfile(data.profile || {});
			setProfileError('');
		} catch (err) {
			console.error(err);
			setProfileError('Unable to load profile.');
		}
	}, [API_BASE, authToken]);

	const fetchChats = useCallback(async () => {
		if (!authToken) return;
		try {
			const res = await fetch(`${API_BASE}/api/chats`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});
			if (!res.ok) throw new Error('Failed to load chats');
			const data = await res.json();
			setChats(data.chats || []);
			// Only set activeChatId once on initial load, not on every fetch
			setActiveChatId(current => {
				if (!current && data.chats && data.chats.length > 0) {
					return data.chats[0].id;
				}
				return current;
			});
		} catch (err) {
			console.error(err);
		}
	}, [API_BASE, authToken]);

	// Fetch chats only when auth token changes (on login)
	useEffect(() => {
		if (authToken) {
			fetchChats();
		}
	}, [authToken, fetchChats]);

	const loadChatMessages = useCallback(
		async (chatId) => {
			if (!authToken || !chatId) return;
			try {
				const res = await fetch(`${API_BASE}/api/chats/${chatId}`, {
					headers: { Authorization: `Bearer ${authToken}` },
				});
				if (!res.ok) throw new Error('Failed to load chat');
				const data = await res.json();
				setChatHistory(data.chat?.messages || []);
			} catch (err) {
				console.error(err);
			}
		},
		[API_BASE, authToken]
	);

	// Load messages only when activeChatId changes, not on every render
	useEffect(() => {
		if (activeChatId) {
			loadChatMessages(activeChatId);
		}
	}, [activeChatId]);

	const handleAuthSubmit = async (e) => {
		e.preventDefault();
		setAuthError('');
		if (!authUsername.trim() || !authPassword.trim()) {
			setAuthError('Username and password are required.');
			return;
		}
		const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
		try {
			const res = await fetch(`${API_BASE}${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: authUsername.trim(), password: authPassword }),
			});
			const data = await res.json();
			if (!res.ok) {
				setAuthError(data.error || 'Authentication failed.');
				return;
			}
			saveAuth(data.token, data.user);
			setAuthPassword('');
			setAuthUsername('');
			setAuthError('');
			// load initial chats
			setTimeout(() => {
				fetchChats();
			}, 0);
		} catch (err) {
			console.error(err);
			setAuthError('Unable to reach authentication server.');
		}
	};

	const handleLogout = () => {
		clearAuth();
		setChatHistory([]);
		setProfile(null);
		setShowProfile(false);
	};

	const handleStopSpeaking = () => {
		try {
			if ('speechSynthesis' in window) {
				window.speechSynthesis.cancel();
			}
		} catch {
			// ignore
		}
		if (currentAudioRef.current) {
			try {
				currentAudioRef.current.pause();
				currentAudioRef.current.currentTime = 0;
			} catch {
				// ignore
			}
			currentAudioRef.current = null;
		}
		setIsTalking(false);
	};

	// --- CHAT SUBMIT FUNCTION: Sends message to Backend and triggers TTS ---
	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!inputMessage.trim() || isTalking || !authToken || !activeChatId) return;
		setIsTalking(true);
		const userMessage = inputMessage;
		setInputMessage('');

		// Add user message to chat history immediately
		setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);

		console.log(`Sending message to backend: ${userMessage}`);

		try {
			// 1. Get the chatbot's text response
			const response = await fetch(`${API_BASE}/api/chat`, {
				method: 'POST',
				headers: authHeaders,
				body: JSON.stringify({
					message: userMessage,
					chatId: activeChatId,
				}),
			});

			if (!response.ok) {
				const errorMsg = 'Error: Could not reach the Cultura Backend server. Is it running on port 3001?';
				setChatHistory(prev => [...prev, { role: 'ai', text: errorMsg }]);
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			const chatbotResponseText = data.response || "I could not find a text response.";

			// Add AI response to chat history
			setChatHistory(prev => [...prev, { role: 'ai', text: chatbotResponseText }]);
			// Refresh chat list metadata (e.g., updated timestamps)
			fetchChats();

			console.log('Chatbot Text Response:', chatbotResponseText);

			// 2. Use the NATIVE BROWSER TTS function to speak the response
			speak(chatbotResponseText);

		} catch (error) {
			console.error('Error in chat process:', error);
			// Stop talking/loading state on error
			setIsTalking(false);
		}
	};

	const handleSuggestion = (prompt) => {
		if (isTalking) return;
		setInputMessage(prompt);
		inputRef.current?.focus();
	};

	const inspirePrompt = () => {
		const randomPrompt = suggestedPrompts[Math.floor(Math.random() * suggestedPrompts.length)];
		handleSuggestion(randomPrompt);
	};

	const focusInputField = () => inputRef.current?.focus();
	// -------------------------

	return (
		<div className="app-shell">
			<div className="bg-lattice" aria-hidden="true"></div>
			<div className="aurora aurora-one" aria-hidden="true"></div>
			<div className="aurora aurora-two" aria-hidden="true"></div>
			<div className="noise" aria-hidden="true"></div>

			<nav className="top-nav">
				<div className="logo-cluster">
					<div className="logo-mark">C</div>
					<div className="logo-copy">
						<span>Cultura AI Studio</span>
						<p>Future-forward heritage intelligence</p>
					</div>
				</div>
				<div className="nav-meta">
					<span className="nav-pill">Beta • build 0.7</span>
					{currentUser ? (
						<>
							<button
								type="button"
								className="nav-pill subtle"
								onClick={() => {
									setView('profile');
									setShowProfile(true);
									if (!profile) {
										fetchProfile();
									}
								}}
							>
								{currentUser.username}
							</button>
							<button
								type="button"
								className="nav-pill ghost"
								onClick={() => setView('chat')}
							>
								Chat
							</button>
							<button type="button" className="nav-pill ghost" onClick={handleLogout}>
								Log out
							</button>
						</>
					) : (
						<span className="nav-pill subtle">Guest</span>
					)}
				</div>
			</nav>

			{(!currentUser || view === 'auth') && (
				<div className="content-grid">
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
								<button
									type="button"
									className={authMode === 'login' ? 'active' : ''}
									onClick={() => setAuthMode('login')}
								>
									Log in
								</button>
								<button
									type="button"
									className={authMode === 'register' ? 'active' : ''}
									onClick={() => setAuthMode('register')}
								>
									Create account
								</button>
							</div>
							<form className="auth-form" onSubmit={handleAuthSubmit}>
								<input
									type="text"
									placeholder="Username"
									value={authUsername}
									onChange={(e) => setAuthUsername(e.target.value)}
									autoComplete="username"
								/>
								<input
									type="password"
									placeholder="Password"
									value={authPassword}
									onChange={(e) => setAuthPassword(e.target.value)}
									autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
								/>
								<button type="submit" className="primary-cta">
									{authMode === 'login' ? 'Enter studio' : 'Create my Cultura account'}
								</button>
								{authError && <div className="auth-error">{authError}</div>}
							</form>
						</div>
					</section>
				</div>
			)}

			{currentUser && view === 'chat' && (
				<div className="content-grid">
					<section className="immersive-panel">
						<header className="section-header">
							<p className="eyebrow">Immersive culture intelligence</p>
							<div className={`status-chip ${isTalking ? 'active' : ''}`}>
								<span className="pulse-dot"></span>
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
									<button type="button" className="primary-cta" onClick={focusInputField}>
										Start asking
									</button>
									<button type="button" className="ghost-cta" onClick={inspirePrompt}>
										Surprise me
									</button>
								</div>
							</div>
							<div className="hero-tiles">
								<div className="tile">
									<p>Stories exchanged</p>
									<strong>{totalTurns}</strong>
								</div>
								<div className="tile">
									<p>Insights narrated</p>
									<strong>{aiTurns}</strong>
								</div>
								<div className="tile highlight">
									<p>Signed in</p>
									<strong>{currentUser ? 'Yes' : 'No'}</strong>
								</div>
							</div>
						</div>
					</section>

					<section className="chat-panel">
						<div className="panel-header">
							<div>
								<p className="eyebrow">Conversational studio</p>
								<h3>Ask Cultura anything</h3>
								<p className="subtitle">
									Try guided prompts or freestyle curiosities. Cultura replies with layered insights and narration.
								</p>
							</div>
							<div className="header-badges">
								<span className="badge">Voice {isTalking ? 'live' : 'standby'}</span>
								<span className="badge subtle">{chatHistory.length ? 'Session in progress' : 'Fresh session'}</span>
							</div>
						</div>

						{currentUser && (
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
												<option key={chat.id} value={chat.id}>
													{chat.title || 'Untitled chat'}
												</option>
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
													body: JSON.stringify({ title: 'New chat' }),
												});
												const data = await res.json();
												if (res.ok && data.chat) {
													setChats((prev) => [data.chat, ...prev]);
													setActiveChatId(data.chat.id);
													setChatHistory([]);
												}
											} catch (err) {
												console.error('Failed to create chat', err);
											}
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
											const confirmDelete = window.confirm('Delete this chat permanently?');
											if (!confirmDelete) return;
											try {
												const res = await fetch(`${API_BASE}/api/chats/${activeChatId}`, {
													method: 'DELETE',
													headers: authHeaders,
												});
												if (res.ok) {
													setChats((prev) => prev.filter((c) => c.id !== activeChatId));
													setActiveChatId((prev) => {
														const remaining = chats.filter((c) => c.id !== prev);
														return remaining[0]?.id || null;
													});
													setChatHistory([]);
												}
											} catch (err) {
												console.error('Failed to delete chat', err);
											}
										}}
									>
										Delete chat
									</button>
									<button
										type="button"
										className="nav-pill ghost"
										onClick={handleStopSpeaking}
										disabled={!isTalking}
									>
										Stop voice
									</button>
								</div>
							</div>
						)}

						<div className="prompt-dropdown-container" ref={dropdownRef}>
							<button
								className="prompt-dropdown-toggle"
								onClick={() => setShowPromptDropdown(!showPromptDropdown)}
								disabled={isTalking}
							>
								<span>💡 Surprise me with a prompt</span>
								<svg
									className={`dropdown-arrow ${showPromptDropdown ? 'open' : ''}`}
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
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
											onClick={() => {
												handleSuggestion(prompt);
												setShowPromptDropdown(false);
											}}
											disabled={isTalking}
										>
											{prompt}
										</button>
									))}
								</div>
							)}
						</div>

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
												{msg.text}
											</div>
										</div>
									))
								)}
								{isTalking && (
									<div className="message-bubble ai">
										<div className="message-content">
											<div className="typing-indicator">
												<div className="typing-dot"></div>
												<div className="typing-dot"></div>
												<div className="typing-dot"></div>
											</div>
										</div>
									</div>
								)}
								<div ref={chatHistoryEndRef} />
							</div>

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
										disabled={
											isTalking || !currentUser || !activeChatId
										}
									/>
									<button
										type="submit"
										className="send-button"
										disabled={
											isTalking || !inputMessage.trim() || !currentUser || !activeChatId
										}
										aria-label="Send message"
									>
										{isTalking ? (
											<div className="loading-dots">
												<div className="loading-dot"></div>
												<div className="loading-dot"></div>
												<div className="loading-dot"></div>
											</div>
										) : (
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
												<path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										)}
									</button>
								</form>
								<p className="input-hint">Press Enter to send • Cultura narrates each reply aloud</p>
							</div>
						</div>
					</section>
				</div>
			)}

			{currentUser && view === 'profile' && (
				<div className="content-grid">
					<section className="immersive-panel">
						<header className="section-header">
							<p className="eyebrow">Traveler profile</p>
						</header>
						<div className="profile-panel">
							<h3>Tell Cultura how you like to travel.</h3>
							<p className="subtitle">
								These preferences help future destination guides stay aligned with your pace, interests, and comfort.
							</p>
							<div className="profile-grid">
								<div className="profile-field">
									<label htmlFor="fullName">Full name</label>
									<input
										id="fullName"
										type="text"
										value={profile?.fullName || ''}
										onChange={(e) => setProfile({ ...(profile || {}), fullName: e.target.value })}
									/>
								</div>
								<div className="profile-field">
									<label htmlFor="homeCity">Home city</label>
									<input
										id="homeCity"
										type="text"
										value={profile?.homeCity || ''}
										onChange={(e) => setProfile({ ...(profile || {}), homeCity: e.target.value })}
									/>
								</div>
								<div className="profile-field">
									<label htmlFor="homeCountry">Home country</label>
									<input
										id="homeCountry"
										type="text"
										value={profile?.homeCountry || ''}
										onChange={(e) => setProfile({ ...(profile || {}), homeCountry: e.target.value })}
									/>
								</div>
								<div className="profile-field">
									<label htmlFor="languages">Preferred languages</label>
									<input
										id="languages"
										type="text"
										placeholder="e.g. English, Kannada"
										value={
											Array.isArray(profile?.preferredLanguages)
												? profile.preferredLanguages.join(', ')
												: profile?.preferredLanguages || ''
										}
										onChange={(e) =>
											setProfile({
												...(profile || {}),
												preferredLanguages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
											})
										}
									/>
								</div>
								<div className="profile-field">
									<label htmlFor="interests">Travel interests</label>
									<textarea
										id="interests"
										placeholder="Heritage walks, food trails, temples, trekking…"
										value={profile?.travelInterests || ''}
										onChange={(e) => setProfile({ ...(profile || {}), travelInterests: e.target.value })}
									/>
								</div>
								<div className="profile-field">
									<label htmlFor="style">Travel style</label>
									<select
										id="style"
										value={profile?.travelStyle || ''}
										onChange={(e) => setProfile({ ...(profile || {}), travelStyle: e.target.value })}
									>
										<option value="">Select</option>
										<option value="slow">Slow & immersive</option>
										<option value="packed">Packed itinerary</option>
										<option value="family">Family-friendly</option>
										<option value="solo">Solo explorer</option>
									</select>
								</div>
								<div className="profile-field">
									<label htmlFor="budget">Budget level</label>
									<select
										id="budget"
										value={profile?.budgetLevel || ''}
										onChange={(e) => setProfile({ ...(profile || {}), budgetLevel: e.target.value })}
									>
										<option value="">Select</option>
										<option value="budget">Budget</option>
										<option value="mid-range">Mid-range</option>
										<option value="premium">Premium</option>
									</select>
								</div>
								<div className="profile-field">
									<label htmlFor="access">Accessibility needs</label>
									<textarea
										id="access"
										placeholder="Mobility, dietary or sensory preferences to keep in mind."
										value={profile?.accessibilityNeeds || ''}
										onChange={(e) => setProfile({ ...(profile || {}), accessibilityNeeds: e.target.value })}
									/>
								</div>
							</div>
							<div className="profile-footer">
								<div>
									{profileError && <div className="auth-error">{profileError}</div>}
								</div>
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
												const res = await fetch(`${API_BASE}/api/profile`, {
													method: 'PUT',
													headers: authHeaders,
													body: JSON.stringify({ profile }),
												});
												const data = await res.json();
												if (!res.ok) {
													setProfileError(data.error || 'Failed to save profile.');
												} else {
													setProfile(data.profile || profile);
												}
											} catch (err) {
												console.error(err);
												setProfileError('Failed to save profile.');
											} finally {
												setProfileSaving(false);
											}
										}}
									>
										{profileSaving ? 'Saving…' : 'Save profile'}
									</button>
									<button
										type="button"
										className="nav-pill profile-danger"
										onClick={async () => {
											if (!authToken) return;
											const confirmDelete = window.confirm(
												'Delete your Cultura account and all chats permanently?'
											);
											if (!confirmDelete) return;
											try {
												await fetch(`${API_BASE}/api/account`, {
													method: 'DELETE',
													headers: authHeaders,
												});
											} catch {
												// ignore network errors on delete
											} finally {
												handleLogout();
											}
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

export default App;
