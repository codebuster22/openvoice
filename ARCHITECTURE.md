# OpenVoice Technical Architecture

> "Good architecture makes the system easy to understand, easy to develop, easy to maintain, and easy to deploy. The goal is to minimize lifetime cost and maximize programmer productivity."
> — Robert C. Martin

This document provides deep technical detail on OpenVoice's architecture, design patterns, and implementation strategies.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow](#data-flow)
3. [Core Components](#core-components)
4. [Provider Abstraction Layer](#provider-abstraction-layer)
5. [WebRTC Infrastructure](#webrtc-infrastructure)
6. [Latency Optimization](#latency-optimization)
7. [Error Handling & Recovery](#error-handling--recovery)
8. [Scalability Strategy](#scalability-strategy)
9. [Security Considerations](#security-considerations)
10. [Monitoring & Observability](#monitoring--observability)

---

## System Architecture

### Layered Architecture Pattern

OpenVoice follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  - REST API endpoints (Express)                              │
│  - WebSocket handlers (Socket.io)                            │
│  - Request validation & authentication                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      Application Layer                       │
│  - AssistantService (CRUD operations)                        │
│  - CallService (lifecycle management)                        │
│  - SessionManager (active call coordination)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                       Domain Layer                           │
│  - ConversationPipeline (orchestration)                      │
│  - TurnDetector (speech pause detection)                     │
│  - InterruptionHandler (cancel-on-speak)                     │
│  - TranscriptBuffer (conversation history)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Infrastructure Layer                      │
│  - STT/LLM/TTS Provider Adapters                             │
│  - WebRTC transport (mediasoup)                              │
│  - Storage (AssistantRepository, CallRepository)             │
│  - External API clients                                      │
└─────────────────────────────────────────────────────────────┘
```

**Why this pattern?**
- **Testability:** Each layer can be tested in isolation with mocks
- **Flexibility:** Swap infrastructure (e.g., change STT provider) without touching domain logic
- **Maintainability:** Clear boundaries make it easy to locate and fix issues

---

## Data Flow

### End-to-End Conversation Flow

Let's trace a single conversation from start to finish:

#### 1. Call Initiation

```
User (Browser)                  API Gateway               SessionManager
     │                               │                          │
     │  POST /v1/calls              │                          │
     │  { assistantId: "asst_123" } │                          │
     ├──────────────────────────────>│                          │
     │                               │  createSession(...)      │
     │                               ├─────────────────────────>│
     │                               │  { callId, wsUrl }       │
     │                               │<─────────────────────────┤
     │  { callId, wsUrl, ... }       │                          │
     │<──────────────────────────────┤                          │
     │                               │                          │
```

#### 2. WebRTC Connection Setup

```
User (Browser)                  SessionManager            mediasoup
     │                               │                          │
     │  WS Connect:                  │                          │
     │  wss://.../calls/{id}/webrtc  │                          │
     ├──────────────────────────────>│                          │
     │                               │  createWebRtcTransport() │
     │                               ├─────────────────────────>│
     │  { transportParams }          │                          │
     │<──────────────────────────────┤<─────────────────────────┤
     │                               │                          │
     │  WebRTC Offer (SDP)           │                          │
     ├──────────────────────────────>│  connect()               │
     │                               ├─────────────────────────>│
     │  WebRTC Answer (SDP)          │                          │
     │<──────────────────────────────┤<─────────────────────────┤
     │                               │                          │
     │  ICE Candidates               │                          │
     │<─────────────────────────────>│<────────────────────────>│
     │                               │                          │
     │  ✅ Audio streaming active    │                          │
```

#### 3. Audio Processing Pipeline

```
┌─────────────┐
│   Browser   │ User speaks: "I need help"
│ (Microphone)│
└──────┬──────┘
       │ Opus-encoded audio packets (WebRTC)
       ▼
┌─────────────┐
│  mediasoup  │ Forward audio stream
│   Router    │
└──────┬──────┘
       │ PCM audio buffer
       ▼
┌─────────────────┐
│ STT Provider    │ Deepgram streaming
│ (Deepgram)      │
└──────┬──────────┘
       │ { text: "I need help", isFinal: false }
       ▼
┌─────────────────┐
│ Transcript      │ Buffer partial transcripts
│ Buffer          │
└──────┬──────────┘
       │ { text: "I need help", isFinal: true }
       ▼
┌─────────────────┐
│ Turn Detector   │ Detect 500ms silence → user finished
└──────┬──────────┘
       │ "I need help" (complete utterance)
       ▼
┌─────────────────┐
│ LLM Provider    │ OpenAI streaming
│ (OpenAI GPT-4)  │
└──────┬──────────┘
       │ "I'd be happy to help you. What do you need assistance with?"
       │ (streamed as tokens)
       ▼
┌─────────────────┐
│ TTS Provider    │ ElevenLabs streaming
│ (ElevenLabs)    │
└──────┬──────────┘
       │ PCM audio chunks
       ▼
┌─────────────────┐
│  mediasoup      │ Forward audio to client
│   Router        │
└──────┬──────────┘
       │ Opus-encoded audio packets
       ▼
┌─────────────────┐
│    Browser      │ Play audio through speakers
│  (Speakers)     │
└─────────────────┘
```

#### 4. Interruption Handling

```
User speaks while AI is talking:

┌─────────────────┐
│ TTS Provider    │ Currently synthesizing: "I'd be happy to..."
│ (ElevenLabs)    │
└────────┬────────┘
         │ Audio chunks streaming
         ▼
┌────────────────────┐
│ Interruption       │ Detect: User audio input while AI speaking
│ Handler            │
└────────┬───────────┘
         │ INTERRUPT signal
         ▼
┌────────────────────┐
│ TTS Provider       │ Cancel current synthesis
│ (ElevenLabs)       │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ STT Provider       │ Process new user input
│ (Deepgram)         │
└────────────────────┘
```

---

## Core Components

### 1. ConversationPipeline

**Responsibility:** Orchestrates the STT → LLM → TTS flow for a single call session.

```typescript
class ConversationPipeline {
  private sttProvider: STTProvider;
  private llmProvider: LLMProvider;
  private ttsProvider: TTSProvider;
  private transcriptBuffer: TranscriptBuffer;
  private turnDetector: TurnDetector;
  private interruptionHandler: InterruptionHandler;
  private state: PipelineState; // idle | listening | thinking | speaking

  async start(): Promise<void> {
    // Initialize providers
    // Start audio input stream
    // Emit firstMessage if configured
  }

  async processAudioChunk(chunk: AudioBuffer): Promise<void> {
    // 1. Feed to STT provider
    // 2. Buffer transcript chunks
    // 3. Detect turn completion
    // 4. Trigger LLM when user finishes
  }

  private async handleUserTurnComplete(transcript: string): Promise<void> {
    // 1. Transition state: listening → thinking
    // 2. Stream LLM completion
    // 3. Transition state: thinking → speaking
    // 4. Stream TTS synthesis
    // 5. Transition state: speaking → listening
  }

  async handleInterruption(): Promise<void> {
    // 1. Cancel current TTS stream
    // 2. Clear audio output buffer
    // 3. Transition state: speaking → listening
  }

  async stop(): Promise<void> {
    // Gracefully shut down all streams
  }
}
```

**Key Design Decisions:**

- **State machine:** Explicit states (`idle`, `listening`, `thinking`, `speaking`) prevent race conditions
- **Streaming throughout:** Never buffer entire responses—stream from STT to LLM to TTS
- **Backpressure handling:** If TTS can't keep up with LLM, buffer LLM tokens (not audio)

---

### 2. TurnDetector

**Responsibility:** Determine when the user has finished speaking (turn completion).

**Challenge:** Speech is not binary. Users pause mid-sentence, say "um," and sometimes stop for emphasis.

**Strategy:**

```typescript
class TurnDetector {
  private silenceThreshold: number = 500; // ms
  private minUtteranceLength: number = 300; // ms
  private lastSpeechTime: number = 0;
  private utteranceStartTime: number = 0;
  private silenceTimer: NodeJS.Timeout | null = null;

  processTranscript(chunk: TranscriptChunk): void {
    if (chunk.text.trim().length > 0) {
      // User is speaking
      this.lastSpeechTime = Date.now();

      if (this.utteranceStartTime === 0) {
        this.utteranceStartTime = Date.now();
      }

      // Reset silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
      }

      // Start new silence timer
      this.silenceTimer = setTimeout(() => {
        this.onTurnComplete();
      }, this.silenceThreshold);
    }
  }

  private onTurnComplete(): void {
    const utteranceDuration = Date.now() - this.utteranceStartTime;

    if (utteranceDuration >= this.minUtteranceLength) {
      // Valid turn—trigger LLM
      this.emit('turn_complete', this.transcriptBuffer.getFullText());
    }

    // Reset state
    this.utteranceStartTime = 0;
  }
}
```

**Tunable Parameters:**
- `silenceThreshold`: How long to wait after speech stops (default: 500ms)
- `minUtteranceLength`: Ignore very short utterances like "um" (default: 300ms)

**Future Enhancement:** Use Voice Activity Detection (VAD) models for more accurate turn detection.

---

### 3. InterruptionHandler

**Responsibility:** Detect when the user speaks while the AI is speaking, and cancel AI speech.

**Strategy:**

```typescript
class InterruptionHandler {
  private aiSpeaking: boolean = false;
  private userSpeaking: boolean = false;

  onAIStartSpeaking(): void {
    this.aiSpeaking = true;
  }

  onAIStopSpeaking(): void {
    this.aiSpeaking = false;
  }

  onUserSpeechDetected(): void {
    if (this.aiSpeaking && !this.userSpeaking) {
      // User interrupted the AI
      this.userSpeaking = true;
      this.emit('interruption_detected');
    }
  }

  onUserSpeechEnded(): void {
    this.userSpeaking = false;
  }
}
```

**Edge Cases:**
- **Barge-in delay:** User must speak for >200ms to trigger interruption (avoid false positives from background noise)
- **Double interruption:** If user interrupts while AI is mid-sentence, buffer user input and process after cancellation completes

---

### 4. TranscriptBuffer

**Responsibility:** Accumulate conversation history and manage partial/final transcripts.

```typescript
class TranscriptBuffer {
  private messages: Message[] = [];
  private currentUserUtterance: string = '';
  private currentAssistantUtterance: string = '';

  appendUserTranscript(chunk: TranscriptChunk): void {
    if (chunk.isFinal) {
      this.currentUserUtterance += chunk.text;
    } else {
      // Update partial transcript for real-time display
      this.emit('partial_transcript', {
        role: 'user',
        text: this.currentUserUtterance + chunk.text,
        isFinal: false
      });
    }
  }

  finalizeUserTurn(): string {
    const utterance = this.currentUserUtterance.trim();
    this.messages.push({
      role: 'user',
      content: utterance,
      timestamp: new Date()
    });
    this.currentUserUtterance = '';
    return utterance;
  }

  getConversationHistory(): Message[] {
    return this.messages;
  }

  getContextForLLM(maxTokens: number = 4000): Message[] {
    // Return recent messages that fit within token limit
    // Implement truncation strategy (keep first message, recent N messages)
  }
}
```

---

## Provider Abstraction Layer

### Design Goals

1. **Pluggable:** Add new STT/LLM/TTS providers without modifying core logic
2. **Consistent interface:** All providers implement the same contract
3. **Streaming-first:** Providers must support streaming APIs
4. **Error isolation:** Provider failures don't crash the system

### Interface Definitions

#### STTProvider

```typescript
interface STTConfig {
  model: string;
  language: string;
  encoding?: 'opus' | 'pcm16';
  sampleRate?: number;
}

interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: Date;
}

interface STTProvider {
  name: string;

  /**
   * Start a streaming transcription session
   * Returns a writable stream for audio input and readable stream for transcripts
   */
  createStream(config: STTConfig): {
    audioInput: WritableStream<AudioBuffer>;
    transcriptOutput: ReadableStream<TranscriptChunk>;
  };

  /**
   * Close the transcription stream gracefully
   */
  closeStream(): Promise<void>;
}
```

#### LLMProvider

```typescript
interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LLMProvider {
  name: string;

  /**
   * Stream a completion given conversation history
   * Returns a readable stream of text chunks
   */
  streamCompletion(
    messages: Message[],
    config: LLMConfig
  ): ReadableStream<string>;

  /**
   * Cancel an in-progress completion
   */
  cancelCompletion(): Promise<void>;
}
```

#### TTSProvider

```typescript
interface TTSConfig {
  voiceId: string;
  stability?: number;
  similarityBoost?: number;
  encoding?: 'opus' | 'pcm16';
  sampleRate?: number;
}

interface AudioChunk {
  data: Buffer;
  format: 'opus' | 'pcm16';
  sampleRate: number;
  timestamp: Date;
}

interface TTSProvider {
  name: string;

  /**
   * Stream audio synthesis from text
   * Returns a readable stream of audio chunks
   */
  streamSynthesis(
    text: string,
    config: TTSConfig
  ): ReadableStream<AudioChunk>;

  /**
   * Cancel in-progress synthesis
   */
  cancelSynthesis(): Promise<void>;
}
```

---

### Provider Implementations

#### Example: DeepgramSTTProvider

```typescript
import { Deepgram } from '@deepgram/sdk';

class DeepgramSTTProvider implements STTProvider {
  name = 'deepgram';
  private client: Deepgram;
  private liveClient: any; // Deepgram live transcription client

  constructor(apiKey: string) {
    this.client = new Deepgram(apiKey);
  }

  createStream(config: STTConfig) {
    this.liveClient = this.client.transcription.live({
      model: config.model || 'nova-2',
      language: config.language || 'en',
      punctuate: true,
      interim_results: true, // Enable partial transcripts
      encoding: config.encoding || 'opus',
      sample_rate: config.sampleRate || 48000
    });

    const audioInput = new WritableStream({
      write: (chunk: AudioBuffer) => {
        this.liveClient.send(chunk);
      }
    });

    const transcriptOutput = new ReadableStream({
      start: (controller) => {
        this.liveClient.addListener('transcriptReceived', (transcript: any) => {
          const chunk: TranscriptChunk = {
            text: transcript.channel.alternatives[0].transcript,
            isFinal: transcript.is_final,
            confidence: transcript.channel.alternatives[0].confidence,
            timestamp: new Date()
          };
          controller.enqueue(chunk);
        });

        this.liveClient.addListener('error', (error: Error) => {
          controller.error(error);
        });

        this.liveClient.addListener('close', () => {
          controller.close();
        });
      }
    });

    return { audioInput, transcriptOutput };
  }

  async closeStream(): Promise<void> {
    if (this.liveClient) {
      this.liveClient.finish();
    }
  }
}
```

#### Provider Registry

```typescript
class ProviderRegistry {
  private sttProviders = new Map<string, STTProvider>();
  private llmProviders = new Map<string, LLMProvider>();
  private ttsProviders = new Map<string, TTSProvider>();

  registerSTT(name: string, provider: STTProvider): void {
    this.sttProviders.set(name, provider);
  }

  getSTT(name: string): STTProvider {
    const provider = this.sttProviders.get(name);
    if (!provider) {
      throw new Error(`STT provider '${name}' not found`);
    }
    return provider;
  }

  // Similar for LLM and TTS
}
```

**Usage in ConversationPipeline:**

```typescript
const registry = new ProviderRegistry();
registry.registerSTT('deepgram', new DeepgramSTTProvider(process.env.DEEPGRAM_API_KEY));
registry.registerLLM('openai', new OpenAILLMProvider(process.env.OPENAI_API_KEY));
registry.registerTTS('elevenlabs', new ElevenLabsTTSProvider(process.env.ELEVENLABS_API_KEY));

const pipeline = new ConversationPipeline({
  stt: registry.getSTT('deepgram'),
  llm: registry.getLLM('openai'),
  tts: registry.getTTS('elevenlabs')
});
```

---

## WebRTC Infrastructure

### Why mediasoup?

**mediasoup** is a Selective Forwarding Unit (SFU) written in C++ with Node.js bindings. It's production-grade (used by platforms like Jitsi, Whereby) and gives us:

1. **Scalability:** Can handle thousands of concurrent streams
2. **Low latency:** Optimized for real-time audio (<50ms transport delay)
3. **Flexibility:** Fine-grained control over audio routing
4. **Node.js integration:** Perfect for our TypeScript backend

### Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │◄───────►│  mediasoup  │◄───────►│ Conversation│
│   (WebRTC)  │         │   Router    │         │  Pipeline   │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │
      │ Opus audio packets     │ PCM audio buffers
      │                        │
      │ ICE candidates         │
      │ SDP offer/answer       │
```

### Setup Flow

```typescript
import * as mediasoup from 'mediasoup';

// 1. Create mediasoup Worker (one per CPU core)
const worker = await mediasoup.createWorker({
  logLevel: 'warn',
  rtcMinPort: 40000,
  rtcMaxPort: 49999
});

// 2. Create Router (handles audio routing)
const router = await worker.createRouter({
  mediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2
    }
  ]
});

// 3. Create WebRTC Transport for each client
const transport = await router.createWebRtcTransport({
  listenIps: [{ ip: '0.0.0.0', announcedIp: 'your.public.ip' }],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true
});

// 4. Send transport params to client
socket.emit('transport_params', {
  id: transport.id,
  iceParameters: transport.iceParameters,
  iceCandidates: transport.iceCandidates,
  dtlsParameters: transport.dtlsParameters
});

// 5. Client sends its DTLS parameters
socket.on('connect_transport', async ({ dtlsParameters }) => {
  await transport.connect({ dtlsParameters });
});

// 6. Create Producer (for client's audio input)
const producer = await transport.produce({
  kind: 'audio',
  rtpParameters: clientRtpParameters
});

// 7. Consume audio from producer → feed to STT
producer.on('audio', (audioBuffer) => {
  conversationPipeline.processAudioChunk(audioBuffer);
});

// 8. Create Consumer (for sending TTS audio to client)
const consumer = await transport.consume({
  producerId: aiProducerId,
  rtpCapabilities: clientRtpCapabilities,
  paused: false
});
```

### Handling Multiple Concurrent Calls

**One Router per call?** No—too expensive.

**One Router for all calls?** Yes—with separate Producers/Consumers per call.

```typescript
class MediasoupManager {
  private worker: mediasoup.types.Worker;
  private router: mediasoup.types.Router;
  private transports = new Map<string, mediasoup.types.WebRtcTransport>();

  async createSession(callId: string): Promise<SessionTransport> {
    const sendTransport = await this.router.createWebRtcTransport({ ... });
    const recvTransport = await this.router.createWebRtcTransport({ ... });

    this.transports.set(`${callId}-send`, sendTransport);
    this.transports.set(`${callId}-recv`, recvTransport);

    return { sendTransport, recvTransport };
  }

  async closeSession(callId: string): Promise<void> {
    const sendTransport = this.transports.get(`${callId}-send`);
    const recvTransport = this.transports.get(`${callId}-recv`);

    sendTransport?.close();
    recvTransport?.close();

    this.transports.delete(`${callId}-send`);
    this.transports.delete(`${callId}-recv`);
  }
}
```

---

## Latency Optimization

### Target: <700ms End-to-End

**Breakdown:**

1. **Audio capture → WebRTC transport:** ~50-100ms
2. **STT (speech-to-text):** ~100-200ms (Deepgram Nova-2)
3. **LLM (text generation):** ~200-400ms (first token, OpenAI GPT-4 Turbo)
4. **TTS (text-to-speech):** ~100-200ms (ElevenLabs streaming)
5. **WebRTC transport → Audio playback:** ~50-100ms

**Total:** ~500-1000ms (varies by provider, network, model)

### Optimization Strategies

#### 1. **Stream Everything**

Never wait for a complete response before starting the next stage.

```
BAD (sequential):
User speaks → STT waits for end → LLM generates full response → TTS synthesizes entire audio → play

GOOD (streaming):
User speaks → STT streams words → LLM streams tokens → TTS streams audio chunks → play as they arrive
```

**Implementation:**

```typescript
// As soon as we get final transcript...
turnDetector.on('turn_complete', async (transcript) => {
  // Start LLM immediately
  const llmStream = llmProvider.streamCompletion(messages, config);

  // As soon as we get first token, start TTS
  let isFirstToken = true;
  for await (const token of llmStream) {
    if (isFirstToken) {
      ttsStream = ttsProvider.streamSynthesis(config);
      isFirstToken = false;
    }
    ttsStream.write(token);
  }
});
```

#### 2. **Use Fastest Providers**

Not all providers are equal:

| Provider | Latency | Quality | Cost |
|----------|---------|---------|------|
| Deepgram Nova-2 | ~100ms | Excellent | $0.0043/min |
| OpenAI Whisper (local) | ~200ms | Excellent | Free (compute) |
| Google STT | ~150ms | Good | $0.006/min |

**Decision: Deepgram for production, Whisper for self-hosted.**

#### 3. **Minimize Network Round-Trips**

- **Co-locate services:** Run STT/LLM/TTS providers in same region as OpenVoice server
- **Keep-alive connections:** Reuse HTTP connections to providers
- **WebSocket for signaling:** Lower overhead than HTTP polling

#### 4. **Optimize LLM for Speed**

```typescript
const llmConfig = {
  model: 'gpt-4-turbo', // Faster than gpt-4
  temperature: 0.7,
  maxTokens: 150, // Limit response length for faster generation
  stream: true // CRITICAL: Enable streaming
};
```

**Alternative:** Use `gpt-3.5-turbo` for even faster responses (~100ms first token) when quality trade-off is acceptable.

#### 5. **Preload TTS Voices**

Some TTS providers cache voice models. Send a "warmup" request when session starts:

```typescript
async warmupTTS(): Promise<void> {
  // Synthesize a short phrase to warm up the TTS engine
  await ttsProvider.streamSynthesis('Hello', config);
}
```

#### 6. **Audio Chunking Strategy**

**Problem:** If TTS chunks are too large, we wait too long before playing. If too small, we have overhead.

**Sweet spot:** 100-200ms audio chunks (4800-9600 samples at 48kHz).

```typescript
class AudioChunker {
  private buffer: Buffer = Buffer.alloc(0);
  private chunkSize: number = 9600; // 200ms at 48kHz

  add(audioData: Buffer): Buffer[] {
    this.buffer = Buffer.concat([this.buffer, audioData]);
    const chunks: Buffer[] = [];

    while (this.buffer.length >= this.chunkSize) {
      chunks.push(this.buffer.slice(0, this.chunkSize));
      this.buffer = this.buffer.slice(this.chunkSize);
    }

    return chunks;
  }
}
```

---

## Error Handling & Recovery

### Failure Modes

1. **Provider API failure** (STT/LLM/TTS service down)
2. **Network timeout** (slow response, connection drop)
3. **Invalid input** (malformed audio, unsupported format)
4. **Rate limiting** (API quota exceeded)
5. **WebRTC connection failure** (ICE failure, DTLS error)

### Strategy: Graceful Degradation

#### 1. Provider Fallback Chain

```typescript
class STTProviderWithFallback implements STTProvider {
  private primary: STTProvider;
  private fallback: STTProvider;

  async createStream(config: STTConfig) {
    try {
      return await this.primary.createStream(config);
    } catch (error) {
      logger.warn('Primary STT provider failed, using fallback', { error });
      return await this.fallback.createStream(config);
    }
  }
}

// Usage
const sttProvider = new STTProviderWithFallback(
  new DeepgramSTTProvider(process.env.DEEPGRAM_API_KEY), // Primary
  new WhisperSTTProvider() // Fallback (local)
);
```

#### 2. Timeout with Retry

```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${operation} timed out`)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// Usage
const response = await withTimeout(
  llmProvider.streamCompletion(messages, config),
  5000, // 5 second timeout
  'LLM completion'
);
```

#### 3. Circuit Breaker Pattern

Prevent cascading failures when a provider is consistently down:

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly threshold = 5; // Open circuit after 5 failures
  private readonly timeout = 60000; // Try again after 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

#### 4. User-Facing Error Messages

When errors occur, send informative events to the client:

```typescript
socket.emit('error', {
  event: 'error',
  code: 'stt_provider_failure',
  message: 'Speech recognition is temporarily unavailable. Please try again.',
  recoverable: true // Client can retry
});
```

---

## Scalability Strategy

### v1 Scope: Single-Server Deployment

For v1, we optimize for:
- **Up to 100 concurrent calls** on a single server
- **Vertical scaling** (bigger server = more calls)

**Typical server specs:**
- 8 CPU cores
- 16 GB RAM
- 100 Mbps network

**Bottleneck:** CPU for audio encoding/decoding.

### Horizontal Scaling (v2+)

#### Load Balancing Strategy

```
                      ┌──────────────┐
                      │ Load Balancer│
                      │  (sticky)    │
                      └──────┬───────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │ OpenVoice   │   │ OpenVoice   │   │ OpenVoice   │
    │ Server 1    │   │ Server 2    │   │ Server 3    │
    └─────────────┘   └─────────────┘   └─────────────┘
```

**Sticky sessions required:** Once a call is routed to a server, all WebRTC traffic must go to that server.

**Implementation:**
- Use IP hash or session ID for sticky routing
- Store call state in Redis for failover

#### Shared State with Redis

```typescript
class RedisSessionStore {
  private redis: Redis;

  async saveSession(callId: string, session: CallSession): Promise<void> {
    await this.redis.setex(
      `session:${callId}`,
      3600, // 1 hour TTL
      JSON.stringify(session)
    );
  }

  async getSession(callId: string): Promise<CallSession | null> {
    const data = await this.redis.get(`session:${callId}`);
    return data ? JSON.parse(data) : null;
  }
}
```

---

## Security Considerations

### 1. API Key Authentication

```typescript
const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.userId = getUserIdFromApiKey(apiKey);
  next();
};

app.use('/v1', authenticateApiKey);
```

### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const callRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 calls per minute per API key
  message: 'Too many calls created, please try again later'
});

app.post('/v1/calls', callRateLimiter, createCallHandler);
```

### 3. Input Validation

```typescript
import Joi from 'joi';

const createAssistantSchema = Joi.object({
  name: Joi.string().max(100).required(),
  systemPrompt: Joi.string().max(5000).required(),
  model: Joi.object({
    provider: Joi.string().valid('openai', 'anthropic').required(),
    model: Joi.string().required()
  }).required()
});

app.post('/v1/assistants', async (req, res) => {
  const { error, value } = createAssistantSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // ... create assistant
});
```

### 4. Prevent Audio Injection Attacks

**Threat:** Malicious audio payloads could exploit STT/TTS providers.

**Mitigation:**
- Validate audio format (Opus, PCM16 only)
- Limit audio duration per turn (max 30 seconds)
- Sanitize transcripts before sending to LLM

```typescript
function sanitizeTranscript(text: string): string {
  // Remove potentially malicious prompt injection attempts
  return text
    .replace(/system:\s*/gi, '') // Remove "system:" prefix
    .replace(/<\|.*?\|>/g, '') // Remove special tokens
    .trim()
    .slice(0, 2000); // Limit length
}
```

### 5. Secure WebRTC

- **DTLS encryption:** All WebRTC audio is encrypted by default
- **ICE validation:** Verify ICE candidates to prevent connection hijacking
- **Turn server authentication:** If using TURN, require auth credentials

---

## Monitoring & Observability

### Metrics to Track

1. **Latency metrics**
   - STT latency (audio → transcript)
   - LLM latency (prompt → first token, full completion)
   - TTS latency (text → first audio chunk)
   - End-to-end latency (user speech → AI speech)

2. **Error rates**
   - Provider failures (STT/LLM/TTS)
   - WebRTC connection failures
   - API errors (4xx, 5xx)

3. **Resource utilization**
   - CPU usage
   - Memory usage
   - Network bandwidth

4. **Business metrics**
   - Active calls
   - Total call duration
   - Transcription accuracy (manual review)

### Implementation with Prometheus

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

// Latency histogram
const latencyHistogram = new Histogram({
  name: 'openvoice_latency_seconds',
  help: 'Latency for each pipeline stage',
  labelNames: ['stage'], // 'stt', 'llm', 'tts'
  buckets: [0.1, 0.2, 0.5, 1, 2, 5]
});

// Error counter
const errorCounter = new Counter({
  name: 'openvoice_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'provider']
});

// Active calls gauge
const activeCallsGauge = new Gauge({
  name: 'openvoice_active_calls',
  help: 'Number of currently active calls'
});

// Usage
latencyHistogram.labels('stt').observe(0.15);
errorCounter.labels('provider_failure', 'deepgram').inc();
activeCallsGauge.inc(); // On call start
activeCallsGauge.dec(); // On call end
```

### Structured Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'openvoice.log' })
  ]
});

// Log with context
logger.info('Call started', {
  callId: 'call_xyz789',
  assistantId: 'asst_abc123',
  userId: 'user_123'
});

logger.error('STT provider failed', {
  callId: 'call_xyz789',
  provider: 'deepgram',
  error: error.message
});
```

---

## Summary

This architecture provides:

✅ **Modularity** - Swap providers without rewriting core logic
✅ **Performance** - <700ms latency through streaming and optimization
✅ **Reliability** - Graceful degradation with fallbacks and circuit breakers
✅ **Scalability** - Single-server v1, horizontal scaling ready for v2
✅ **Security** - Authentication, rate limiting, input validation
✅ **Observability** - Metrics, logging, tracing for production debugging

This is the foundation for building an **insanely great** open source voice AI platform.

---

*Next: Let's start building.*
