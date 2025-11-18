import React, { useState, Suspense, useRef, useCallback } from 'react'; 
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
	const chatHistoryEndRef = useRef(null);
	// -------------------------

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
	// -------------------------

	return (
		<div className="app-container">
			
			{/* ------------------- 3D CANVAS (R3F) ------------------- */}
			<Canvas 
				shadows 
				camera={{ position: [0, 1, 2], fov: 50 }} 
				style={{ background: 'transparent' }}
			>
				<ambientLight intensity={0.6} />
				<directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
				<spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} castShadow intensity={0.6} />
				<EnvironmentFallback />

				<Suspense fallback={
					<mesh position={[0, 0, 0]}>
						<boxGeometry args={[0.5, 0.5, 0.5]} />
						<meshStandardMaterial color="#6366f1" />
					</mesh>
				}> 
					<CulturaModel /> 
				</Suspense>
				
				<OrbitControls 
					enableZoom={true} 
					enablePan={true} 
					target={[0, 0, 0]}
					minDistance={2}
					maxDistance={8}
					enableDamping={true}
					dampingFactor={0.05}
				/>
				
			</Canvas>

			{/* ------------------- 2D UI Overlay (Chat Output & Input) ------------------- */}
			<div className="chat-ui-overlay">
				{/* Response Display Area */}
				<div className="response-display">
					{responseText ? (
						<div style={{ animation: 'fadeIn 0.5s ease-out' }}>
							{responseText}
						</div>
					) : (
						<div style={{ 
							color: 'var(--text-secondary)', 
							fontStyle: 'italic',
							display: 'flex',
							alignItems: 'center',
							gap: '8px'
						}}>
							<span>Ask Cultura about Karnataka's heritage...</span>
							<div className="typing-indicator">
								<div className="typing-dot"></div>
								<div className="typing-dot"></div>
								<div className="typing-dot"></div>
							</div>
						</div>
					)}
				</div>

				<form onSubmit={handleSubmit} className="chat-form">
					<input 
						type="text" 
						className="chat-input"
						placeholder={isTalking ? "Cultura is speaking..." : "Type your question here..."}
						value={inputMessage} 
						onChange={(e) => setInputMessage(e.target.value)}
						disabled={isTalking}
					/>
					<button
						type="submit"
						className="send-button"
						disabled={isTalking || !inputMessage.trim()}
					>
						{isTalking ? (
							<div className="loading-dots">
								<div className="loading-dot"></div>
								<div className="loading-dot"></div>
								<div className="loading-dot"></div>
							</div>
						) : (
							<>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
									<path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
									<path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
								Send
							</>
						)}
					</button>
				</form>
			</div>
		</div>
	);
}

export default App;
