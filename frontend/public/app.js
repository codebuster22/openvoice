/**
 * OpenVoice Frontend - WebSocket Client with Audio Streaming
 *
 * Handles:
 * - Configuration UI and validation
 * - WebSocket connection and messaging
 * - Microphone capture (MediaRecorder API)
 * - Audio playback (Web Audio API)
 * - Transcript display
 * - State management
 */

// DOM Elements
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const transcript = document.getElementById('transcript');
const errorMessage = document.getElementById('errorMessage');

// Configuration inputs
const deepgramApiKeyInput = document.getElementById('deepgramApiKey');
const openaiApiKeyInput = document.getElementById('openaiApiKey');
const elevenLabsApiKeyInput = document.getElementById('elevenLabsApiKey');
const modelSelect = document.getElementById('modelSelect');
const voiceSelect = document.getElementById('voiceSelect');
const systemPromptInput = document.getElementById('systemPrompt');

// State
let ws = null;
let mediaRecorder = null;
let audioContext = null;
let audioQueue = [];
let isPlaying = false;

// WebSocket URL
const WS_URL = 'ws://localhost:3000/conversation';

/**
 * Start conversation
 */
startButton.addEventListener('click', async () => {
  try {
    // Get configuration
    const config = {
      deepgramApiKey: deepgramApiKeyInput.value.trim(),
      openaiApiKey: openaiApiKeyInput.value.trim(),
      elevenLabsApiKey: elevenLabsApiKeyInput.value.trim(),
      model: modelSelect.value,
      voice: voiceSelect.value,
      systemPrompt: systemPromptInput.value.trim() || 'You are a helpful AI assistant.',
    };

    // Validate
    const errors = validateConfig(config);
    if (errors.length > 0) {
      showError(errors.join(', '));
      return;
    }

    hideError();

    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Initialize MediaRecorder
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    // Connect WebSocket
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');

      // Send START message
      ws.send(JSON.stringify({
        type: 'START',
        config,
      }));

      // Update UI
      startButton.disabled = true;
      stopButton.disabled = false;
      clearTranscript();
    };

    ws.onmessage = (event) => {
      handleWebSocketMessage(event);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      showError('WebSocket connection failed');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      updateStatus('idle');
      stopButton.disabled = true;
      startButton.disabled = false;
    };

    // Handle audio data from MediaRecorder
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
        // Send audio chunk to server
        ws.send(event.data);
      }
    };

    // Start recording (100ms chunks for low latency)
    mediaRecorder.start(100);

  } catch (error) {
    console.error('Start error:', error);
    showError(error.message);
  }
});

/**
 * Stop conversation
 */
stopButton.addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'STOP' }));
  }

  stopRecording();
  ws?.close();
  ws = null;

  startButton.disabled = false;
  stopButton.disabled = true;
  updateStatus('idle');
});

/**
 * Handle WebSocket messages
 */
function handleWebSocketMessage(event) {
  // Check if binary (audio) or JSON (control)
  if (event.data instanceof Blob) {
    // Binary audio data
    playAudioChunk(event.data);
  } else {
    // JSON message
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'STATUS':
        updateStatus(message.state);
        break;

      case 'TRANSCRIPT':
        addTranscriptMessage(message.role, message.text, message.timestamp);
        break;

      case 'ERROR':
        showError(`${message.code}: ${message.message}`);
        updateStatus('error');
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }
}

/**
 * Play audio chunk using Web Audio API
 */
async function playAudioChunk(blob) {
  // Initialize audio context on first use (user gesture requirement)
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Convert blob to array buffer
  const arrayBuffer = await blob.arrayBuffer();

  // Decode audio data
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Queue for playback
    audioQueue.push(audioBuffer);

    // Start playback if not already playing
    if (!isPlaying) {
      playNextInQueue();
    }
  } catch (error) {
    console.error('Audio decode error:', error);
  }
}

/**
 * Play next audio buffer in queue
 */
function playNextInQueue() {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const audioBuffer = audioQueue.shift();

  // Create buffer source
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  // Play next chunk when this one finishes
  source.onended = () => {
    playNextInQueue();
  };

  source.start();
}

/**
 * Update status indicator
 */
function updateStatus(state) {
  statusIndicator.className = `status-indicator ${state}`;
  statusText.textContent = state.charAt(0).toUpperCase() + state.slice(1);
}

/**
 * Add message to transcript
 */
function addTranscriptMessage(role, text, timestamp) {
  // Remove placeholder if present
  const placeholder = transcript.querySelector('.placeholder');
  if (placeholder) {
    placeholder.remove();
  }

  // Create message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const time = new Date(timestamp).toLocaleTimeString();

  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-role">${role === 'user' ? 'You' : 'AI'}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-content">${escapeHtml(text)}</div>
  `;

  transcript.appendChild(messageDiv);

  // Auto-scroll to bottom
  transcript.scrollTop = transcript.scrollHeight;
}

/**
 * Clear transcript
 */
function clearTranscript() {
  transcript.innerHTML = '<p class="placeholder">Listening...</p>';
}

/**
 * Show error message
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('visible');
}

/**
 * Hide error message
 */
function hideError() {
  errorMessage.textContent = '';
  errorMessage.classList.remove('visible');
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  const errors = [];

  if (!config.deepgramApiKey) {
    errors.push('Deepgram API key is required');
  }
  if (!config.openaiApiKey) {
    errors.push('OpenAI API key is required');
  }
  if (!config.elevenLabsApiKey) {
    errors.push('ElevenLabs API key is required');
  }
  if (!config.model) {
    errors.push('Model selection is required');
  }
  if (!config.voice) {
    errors.push('Voice selection is required');
  }
  if (!config.systemPrompt) {
    errors.push('System prompt is required');
  }

  return errors;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Stop recording
 */
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();

    // Stop all tracks
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  mediaRecorder = null;
}

// Load saved API keys from sessionStorage (convenience feature)
window.addEventListener('DOMContentLoaded', () => {
  const savedDeepgram = sessionStorage.getItem('deepgramApiKey');
  const savedOpenAI = sessionStorage.getItem('openaiApiKey');
  const savedElevenLabs = sessionStorage.getItem('elevenLabsApiKey');

  if (savedDeepgram) deepgramApiKeyInput.value = savedDeepgram;
  if (savedOpenAI) openaiApiKeyInput.value = savedOpenAI;
  if (savedElevenLabs) elevenLabsApiKeyInput.value = savedElevenLabs;
});

// Save API keys to sessionStorage on change (cleared when tab closes)
deepgramApiKeyInput.addEventListener('change', (e) => {
  sessionStorage.setItem('deepgramApiKey', e.target.value);
});
openaiApiKeyInput.addEventListener('change', (e) => {
  sessionStorage.setItem('openaiApiKey', e.target.value);
});
elevenLabsApiKeyInput.addEventListener('change', (e) => {
  sessionStorage.setItem('elevenLabsApiKey', e.target.value);
});
