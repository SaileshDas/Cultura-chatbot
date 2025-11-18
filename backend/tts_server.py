# Piper TTS Server for Cultura Chatbot
# Uses Piper TTS as the primary text-to-speech engine

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import subprocess
import os
import tempfile
import json

# --- Configuration ---
app = Flask(__name__)
CORS(app)

# Piper TTS configuration
# Default voice model path (user can override via environment variable)
PIPER_VOICE_PATH = os.environ.get('PIPER_VOICE_PATH', None)
PIPER_BINARY = os.environ.get('PIPER_BINARY', 'piper')

def generate_audio_with_piper(text, voice_path=None):
    """
    Generate audio using Piper TTS.
    Falls back to a mock response if Piper is not available.
    """
    try:
        # If no voice path is specified, try to use a default or fallback
        if not voice_path:
            voice_path = PIPER_VOICE_PATH
        
        # If Piper is not configured, return None to trigger fallback
        if not voice_path or not os.path.exists(voice_path):
            print("Warning: Piper voice model not found. Falling back to browser TTS.")
            return None
        
        # Create a temporary file for output
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            # Run Piper TTS
            # Piper command: echo "text" | piper --model voice.onnx --output_file output.wav
            process = subprocess.Popen(
                [PIPER_BINARY, '--model', voice_path, '--output_file', output_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(input=text, timeout=30)
            
            if process.returncode != 0:
                print(f"Piper TTS error: {stderr}")
                return None
            
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
                
    except subprocess.TimeoutExpired:
        print("Piper TTS timeout")
        return None
    except FileNotFoundError:
        print("Piper binary not found. Please install Piper TTS.")
        return None
    except Exception as e:
        print(f"Error generating audio with Piper: {e}")
        return None

@app.route('/api/generate-tts', methods=['POST'])
def generate_tts():
    """
    Handles TTS requests using Piper TTS.
    Returns audio in base64 format or indicates fallback needed.
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Missing 'text' field in request body"}), 400

        text_prompt = data['text']
        voice_id = data.get('voice_id', 'default')

        print(f"Received TTS request for voice '{voice_id}': '{text_prompt[:50]}...'")
        
        # Try to generate audio with Piper
        audio_base64 = generate_audio_with_piper(text_prompt, PIPER_VOICE_PATH)
        
        if audio_base64:
            # Success - return Piper-generated audio
            return jsonify({
                "status": "success",
                "audio_base64": audio_base64,
                "mime_type": "audio/wav",
                "engine": "piper"
            }), 200
        else:
            # Piper not available - indicate fallback needed
            return jsonify({
                "status": "fallback",
                "message": "Piper TTS not available. Use browser TTS.",
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
        "piper_configured": PIPER_VOICE_PATH is not None and os.path.exists(PIPER_VOICE_PATH) if PIPER_VOICE_PATH else False
    }), 200

if __name__ == '__main__':
    print("Starting Piper TTS Server on http://127.0.0.1:5000")
    print("Note: If Piper is not configured, the server will indicate fallback to browser TTS.")
    app.run(debug=True, port=5000)

# NOTE TO USER: 
# To use Piper TTS:
# 1. Install Piper TTS: https://github.com/rhasspy/piper
# 2. Download a voice model (e.g., from https://huggingface.co/rhasspy/piper-voices)
# 3. Set environment variable: export PIPER_VOICE_PATH=/path/to/voice.onnx
# 4. Or set PIPER_BINARY if piper is not in PATH
# 
# To run: pip install Flask Flask-CORS
# Then: python backend/tts_server.py