import React, { useState, Suspense, useRef, useCallback, useMemo } from 'react'; 
import { Canvas } from '@react-three/fiber'; 
import { OrbitControls } from '@react-three/drei';
import CulturaModel from './components/CulturaModel';
import EnvironmentFallback from './components/EnvironmentFallback';
import './App.css';


function App() {
	// --- STATE MANAGEMENT ---
	const [inputMessage, setInputMessage] = useState('');
	const [isTalking, setIsTalking] = useState(false); 
	const [chatHistory, setChatHistory] = useState([]);
	const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
	const [showPromptDropdown, setShowPromptDropdown] = useState(false);
	const chatHistoryEndRef = useRef(null);
	const inputRef = useRef(null);
	const dropdownRef = useRef(null);
	// -------------------------

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

	const sessionHint = useMemo(() => sessionId.slice(-6).toUpperCase(), [sessionId]);
	const totalTurns = chatHistory.length;
	const aiTurns = chatHistory.filter(msg => msg.role === 'ai').length;

	// Auto-scroll to bottom of chat
	const scrollToBottom = () => {
		chatHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	React.useEffect(() => {
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

					audio.onplay = () => setIsTalking(true);
					audio.onended = () => {
						setIsTalking(false);
						URL.revokeObjectURL(audioUrl);
					};
					audio.onerror = (e) => {
						console.error('Audio playback error:', e);
						setIsTalking(false);
						URL.revokeObjectURL(audioUrl);
						// Fallback to browser TTS on audio playback error
						console.warn('Piper audio playback failed, falling back to browser TTS');
						speakWithBrowserTTS(text);
					};

					audio.play().catch((error) => {
						console.error('Audio play error:', error);
						setIsTalking(false);
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
	
	// --- SUBMIT FUNCTION: Sends message to Backend and triggers TTS ---
	const handleSubmit = async (e) => {
		e.preventDefault(); 

		if (!inputMessage.trim() || isTalking) return;
		setIsTalking(true); 
		const userMessage = inputMessage;
		setInputMessage(''); 

		// Add user message to chat history immediately
		setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);

		console.log(`Sending message to backend: ${userMessage}`);

		try {
			// 1. Get the chatbot's text response (assumed to be a simple Node.js server for this example)
			
			// NOTE: This fetch to localhost:3001 will only work if you have a separate backend running.
			const response = await fetch('http://localhost:3001/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					message: userMessage,
					sessionId: sessionId
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
					<span className="nav-pill">Beta • build 0.3</span>
					<span className="nav-pill subtle">Session {sessionHint}</span>
				</div>
			</nav>

			<div className="content-grid">
				<section className="immersive-panel">
					<header className="section-header">
						<p className="eyebrow">Immersive culture intelligence</p>
						<div className={`status-chip ${isTalking ? 'active' : ''}`}>
							<span className="pulse-dot"></span>
							{isTalking ? 'Narrating live' : 'Standing by'}
						</div>
					</header>

					<div className="hero-grid">
						<div className="hero-copy">
							<h1>Step into a living archive of Karnataka.</h1>
							<p>
								Wander through dynasties, craftsmanship, festivals, and hidden trails with a responsive 3D guide
								that gestures, narrates, and curates each answer in real time.
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
								<p>Session anchor</p>
								<strong>{sessionHint}</strong>
							</div>
						</div>
					</div>

					<div className="model-panel">
						<div className="model-meta">
							<div>
								<p className="section-label">Cultura holostage</p>
								<h2>Kinetic host</h2>
								<p className="subtitle">
									Refined lighting, cinematic camera, and breathing motion loops keep the presence alive.
								</p>
							</div>
							<div className="model-actions">
								<span>Orbit to explore</span>
								<div className="orb-pulse" aria-hidden="true"></div>
							</div>
						</div>
						<div className="model-stage-frame">
							<div className="model-gradient-edge" aria-hidden="true"></div>
							<Canvas 
								shadows 
								camera={{ position: [0, 1, 5], fov: 40 }}
								dpr={[1, 2]}
								gl={{ antialias: true, alpha: true }}
							>
								<color attach="background" args={['#04030b']} />
								<ambientLight intensity={0.8} />
								<directionalLight 
									position={[6, 12, 6]} 
									intensity={1.25} 
									castShadow
									shadow-mapSize-width={2048}
									shadow-mapSize-height={2048}
									shadow-camera-far={40}
									shadow-camera-left={-12}
									shadow-camera-right={12}
									shadow-camera-top={12}
									shadow-camera-bottom={-12}
								/>
								<pointLight position={[-6, 4, 6]} intensity={0.55} color="#ffb56b" />
								<pointLight position={[6, -2, -6]} intensity={0.35} color="#6c63ff" />
								<mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
									<planeGeometry args={[32, 32]} />
									<meshStandardMaterial 
										color="#070716" 
										metalness={0.3}
										roughness={0.8}
									/>
								</mesh>

								<Suspense fallback={<EnvironmentFallback />}> 
									<CulturaModel /> 
								</Suspense>
								
								<OrbitControls 
									enableZoom={true} 
									enablePan={false} 
									target={[0, 0.5, 0]}
									minDistance={2}
									maxDistance={8}
									enableDamping={true}
									dampingFactor={0.08}
									autoRotate={true}
									autoRotateSpeed={1.8}
								/>
								
							</Canvas>
							<div className="model-overlay-info">
								<span>Real-time narrator</span>
								<span>{isTalking ? 'Voice live' : 'Voice idle'}</span>
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
								<path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
									<p>Ask about art, dynasties, craftsmanship, cuisine, festivals, or hidden routes across Karnataka.</p>
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
									placeholder={isTalking ? "Cultura is speaking..." : "Type your next curiosity"}
									value={inputMessage} 
									onChange={(e) => setInputMessage(e.target.value)}
									disabled={isTalking}
								/>
								<button
									type="submit"
									className="send-button"
									disabled={isTalking || !inputMessage.trim()}
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
											<path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
											<path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
									)}
								</button>
							</form>
							<p className="input-hint">Press Enter to send • Cultura narrates each reply aloud</p>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}

export default App;
