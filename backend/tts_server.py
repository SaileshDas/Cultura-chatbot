# Edge TTS Server for Cultura Chatbot
# Uses Microsoft Edge TTS as the text-to-speech engine

from flask import Flask, request, jsonify
from flask_cors import CORS
import edge_tts
import asyncio
import base64
import os
import tempfile

# --- Configuration ---
app = Flask(__name__)
CORS(app)

# Edge TTS configuration
# Default voice: Indian English Male (South Indian accent - authentic Karnataka feel)
DEFAULT_VOICE = os.environ.get('EDGE_TTS_VOICE', 'en-IN-PrabhatNeural')

def sanitize_text_for_speech(text):
    """Remove markdown and special characters that cause bad pronunciation."""
    import re
    # Remove markdown formatting
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # **bold**
    text = re.sub(r'\*([^*]+)\*', r'\1', text)  # *italic*
    text = re.sub(r'__([^_]+)__', r'\1', text)  # __bold__
    text = re.sub(r'_([^_]+)_', r'\1', text)  # _italic_
    text = re.sub(r'`([^`]+)`', r'\1', text)  # `code`
    # Remove list markers
    text = re.sub(r'^[\*\-\+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\d+\.\s+', '', text, flags=re.MULTILINE)
    # Remove headers
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    # Clean extra whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

# Alternative voices you can use:
# - 'en-IN-PrabhatNeural' (Male, Indian English) - Default, authentic Karnataka feel
# - 'en-IN-NeerjaNeural' (Female, Indian English)
# - 'en-US-AriaNeural' (Female, US English)
# - 'en-GB-SoniaNeural' (Female, British English)

async def generate_audio_with_edge_tts(text, voice=None, rate="+0%"):
    """
    Generate audio using Edge TTS.
    Returns base64-encoded audio data or None on failure.
    """
    try:
        if not voice:
            voice = DEFAULT_VOICE
        
        # Create a temporary file for output
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            # Create Edge TTS communicator
            communicate = edge_tts.Communicate(text, voice, rate=rate)
            
            # Save audio to file
            await communicate.save(output_path)
            
            # Read the generated audio file
            with open(output_path, 'rb') as f:
                audio_data = f.read()
            
            # Encode to base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            return audio_base64
            
        finally:
            # Clean up temporary file
            if os.path.exists(output_path):
                os.unlink(output_path)
                
    except Exception as e:
        print(f"Error generating audio with Edge TTS: {e}")
        return None

@app.route('/api/generate-tts', methods=['POST'])
def generate_tts():
    """
    Handles TTS requests using Edge TTS.
    Returns audio in base64 format or indicates fallback needed.
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Missing 'text' field in request body"}), 400

        text_prompt = data['text']
        voice_id = data.get('voice_id', DEFAULT_VOICE)

        # Sanitize text to remove markdown and special characters
        clean_text = sanitize_text_for_speech(text_prompt)

        # Calculate dynamic rate based on text length
        # Short responses (< 50 chars): Normal speed (+0%)
        # Long responses (> 400 chars): Max speed (+25%)
        # Linear interpolation in between
        length = len(clean_text)
        if length < 50:
            rate_val = 0
        elif length > 400:
            rate_val = 25
        else:
            # Linear scaling: 0 at 50, 25 at 400
            # Slope = 25 / 350 approx 0.071
            rate_val = int((length - 50) * (25 / 350))
        
        rate_str = f"+{rate_val}%"
        
        print(f"Received TTS request for voice '{voice_id}': '{clean_text[:50]}...' (Len: {length}, Rate: {rate_str})")
        
        # Generate audio with Edge TTS (run async function in sync context)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            audio_base64 = loop.run_until_complete(
                generate_audio_with_edge_tts(clean_text, voice_id, rate=rate_str)
            )
        finally:
            loop.close()
        
        if audio_base64:
            # Success - return Edge TTS-generated audio
            return jsonify({
                "status": "success",
                "audio_base64": audio_base64,
                "mime_type": "audio/mp3",
                "engine": "edge-tts",
                "voice": voice_id,
                "rate": rate_str
            }), 200
        else:
            # Edge TTS failed - indicate fallback needed
            return jsonify({
                "status": "fallback",
                "message": "Edge TTS not available. Use browser TTS.",
                "engine": "browser"
            }), 200

    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "engine": "edge-tts",
        "default_voice": DEFAULT_VOICE,
        "available": True
    }), 200

@app.route('/api/voices', methods=['GET'])
def list_voices():
    """List available Edge TTS voices"""
    # Common voices for reference
    voices = [
        {"id": "en-IN-NeerjaNeural", "name": "Neerja", "language": "Indian English", "gender": "Female"},
        {"id": "en-IN-PrabhatNeural", "name": "Prabhat", "language": "Indian English", "gender": "Male"},
        {"id": "en-US-AriaNeural", "name": "Aria", "language": "US English", "gender": "Female"},
        {"id": "en-US-GuyNeural", "name": "Guy", "language": "US English", "gender": "Male"},
        {"id": "en-GB-SoniaNeural", "name": "Sonia", "language": "British English", "gender": "Female"},
        {"id": "en-GB-RyanNeural", "name": "Ryan", "language": "British English", "gender": "Male"},
    ]
    return jsonify({"voices": voices}), 200

if __name__ == '__main__':
    print("Starting Edge TTS Server on http://127.0.0.1:5000")
    print(f"Using default voice: {DEFAULT_VOICE}")
    print("Edge TTS provides high-quality Microsoft voices without model downloads.")
    app.run(debug=True, port=5000)

# NOTE TO USER:
# Edge TTS uses Microsoft's online text-to-speech service.
# No installation or model downloads required!
#
# To change the voice, set the EDGE_TTS_VOICE environment variable:
# export EDGE_TTS_VOICE=en-IN-PrabhatNeural  (for male Indian English voice)
#
# To run: pip install -r requirements.txt
# Then: python tts_server.py