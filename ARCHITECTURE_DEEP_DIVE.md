# OpenVoice Architecture: Extensibility + Performance Deep Dive

> "The secret to building both fast and flexible software is knowing where to be rigid and where to be fluid."

This document explains how OpenVoice's architecture achieves **both** extensibility (easy to add features) and performance (<700ms latency).

---

## Table of Contents

1. [The Core Architectural Principle](#the-core-architectural-principle)
2. [Layered Architecture: Why It Enables Extensibility](#layered-architecture-why-it-enables-extensibility)
3. [The Provider Plugin System](#the-provider-plugin-system)
4. [Node.js vs Rust: The Latency Analysis](#nodejs-vs-rust-the-latency-analysis)
5. [WebRTC Voice Integration Deep Dive](#webrtc-voice-integration-deep-dive)
6. [Future: Telephony Integration Path](#future-telephony-integration-path)
7. [Adding New Features Without Breaking Latency](#adding-new-features-without-breaking-latency)
8. [Performance Optimization Strategies](#performance-optimization-strategies)

---

## The Core Architectural Principle

### Separation of Concerns + Stream-First Design

The architecture has **two key principles**:

#### 1. **Layered Separation**
Each layer has ONE job and can be modified independently:

```
┌─────────────────────────────────────────────────────┐
│  Presentation Layer (HTTP/WebSocket)                │  ← Add new APIs here
│  - REST endpoints, WebSocket handlers               │
│  - Authentication, rate limiting                    │
└──────────────────────┬──────────────────────────────┘
                       │ Clean interfaces
┌──────────────────────▼──────────────────────────────┐
│  Application Layer (Business Logic)                 │  ← Add new features here
│  - AssistantService, CallService                    │
│  - Session management, orchestration                │
└──────────────────────┬──────────────────────────────┘
                       │ Domain objects
┌──────────────────────▼──────────────────────────────┐
│  Domain Layer (Core Voice Engine)                   │  ← Conversation logic
│  - ConversationPipeline (STT→LLM→TTS)              │
│  - TurnDetector, InterruptionHandler                │
└──────────────────────┬──────────────────────────────┘
                       │ Provider interfaces
┌──────────────────────▼──────────────────────────────┐
│  Infrastructure Layer (External Services)           │  ← Add new providers here
│  - STT/LLM/TTS provider adapters                    │
│  - WebRTC transport, storage                        │
└─────────────────────────────────────────────────────┘
```

**Why this matters:**
- **Add new API endpoint?** → Only touch Presentation Layer
- **Add new feature (e.g., call recording)?** → Add to Application Layer
- **Add new provider (e.g., Google STT)?** → Add to Infrastructure Layer
- **Core conversation logic stays unchanged** → Latency unaffected

#### 2. **Stream-First Design**

Everything is a **stream** (no blocking):

```typescript
// NOT THIS (blocking):
const fullTranscript = await stt.transcribe(audioBuffer);  // Wait for entire audio
const fullResponse = await llm.complete(transcript);        // Wait for entire response
const fullAudio = await tts.synthesize(response);          // Wait for entire synthesis
playAudio(fullAudio);                                      // Finally play

// THIS (streaming):
audioStream
  .pipe(sttProvider)         // Transcribe chunks as they arrive
  .pipe(turnDetector)        // Detect when user finishes
  .pipe(llmProvider)         // Generate response tokens as they come
  .pipe(ttsProvider)         // Synthesize audio chunks immediately
  .pipe(audioOutput);        // Play as soon as chunks arrive
```

**Result:** Start playing AI response while LLM is still generating. Latency drops by 50-70%.

---

## Layered Architecture: Why It Enables Extensibility

### Example: Adding Call Recording Feature

Let's trace how we'd add call recording WITHOUT touching core pipeline:

#### Step 1: Application Layer - Add Recording Service

```typescript
// src/application/services/RecordingService.ts
class RecordingService {
  private recordings = new Map<string, RecordingSession>();

  async startRecording(callId: string, options: RecordingOptions): Promise<void> {
    const session = new RecordingSession(callId, options);
    this.recordings.set(callId, session);

    // Subscribe to conversation events (non-intrusive)
    const call = this.callService.getCall(callId);
    call.on('audio_chunk', (chunk) => session.appendAudio(chunk));
    call.on('transcript', (text) => session.appendTranscript(text));
  }

  async stopRecording(callId: string): Promise<RecordingFile> {
    const session = this.recordings.get(callId);
    return await session.finalize();
  }
}
```

**Key point:** Recording service **listens** to existing events. Doesn't modify pipeline.

#### Step 2: Presentation Layer - Add API Endpoints

```typescript
// src/presentation/routes/recordings.ts
router.post('/v1/calls/:callId/recordings', async (req, res) => {
  const { callId } = req.params;
  await recordingService.startRecording(callId, req.body);
  res.json({ status: 'recording_started' });
});

router.get('/v1/calls/:callId/recordings', async (req, res) => {
  const file = await recordingService.getRecording(req.params.callId);
  res.json(file);
});
```

**Impact on latency:** ZERO. Recording happens in parallel, doesn't block conversation pipeline.

---

### Example: Adding New LLM Provider (Gemini)

#### Step 1: Infrastructure Layer - Implement Provider Interface

```typescript
// src/infrastructure/providers/llm/GeminiLLMProvider.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiLLMProvider implements LLMProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  streamCompletion(messages: Message[], config: LLMConfig): ReadableStream<string> {
    const model = this.client.getGenerativeModel({
      model: config.model || 'gemini-pro'
    });

    return new ReadableStream({
      async start(controller) {
        const result = await model.generateContentStream(
          formatMessagesForGemini(messages)
        );

        for await (const chunk of result.stream) {
          controller.enqueue(chunk.text());
        }
        controller.close();
      }
    });
  }

  async cancelCompletion(): Promise<void> {
    // Cancel in-flight request
  }
}
```

#### Step 2: Register Provider

```typescript
// src/infrastructure/providers/ProviderRegistry.ts
registry.registerLLM('gemini', new GeminiLLMProvider(process.env.GEMINI_API_KEY));
```

#### Step 3: Use in Assistant Config

```typescript
POST /v1/assistants
{
  "model": {
    "provider": "gemini",  // ← Just specify new provider
    "model": "gemini-pro",
    "temperature": 0.7
  }
}
```

**Impact on latency:** Depends on Gemini's performance, but architecture doesn't add overhead.

**Impact on existing code:** ZERO. Core pipeline doesn't change. Provider interface hides implementation.

---

## The Provider Plugin System

### The Power of Abstraction

All providers implement **simple, streaming interfaces**:

```typescript
// The contract every STT provider must follow
interface STTProvider {
  name: string;

  createStream(config: STTConfig): {
    audioInput: WritableStream<AudioBuffer>;
    transcriptOutput: ReadableStream<TranscriptChunk>;
  };

  closeStream(): Promise<void>;
}

// The contract every LLM provider must follow
interface LLMProvider {
  name: string;

  streamCompletion(
    messages: Message[],
    config: LLMConfig
  ): ReadableStream<string>;

  cancelCompletion(): Promise<void>;
}

// The contract every TTS provider must follow
interface TTSProvider {
  name: string;

  streamSynthesis(
    text: string,
    config: TTSConfig
  ): ReadableStream<AudioChunk>;

  cancelSynthesis(): Promise<void>;
}
```

### Why This Is Brilliant

**1. Easy to Add Providers**

Want to add Azure STT? Just implement the interface:

```typescript
class AzureSTTProvider implements STTProvider {
  // Implement the 3 required methods
  // Rest of Azure-specific code is hidden
}
```

**2. Easy to Test**

Mock providers for testing:

```typescript
class MockSTTProvider implements STTProvider {
  name = 'mock';

  createStream() {
    return {
      audioInput: new WritableStream(),
      transcriptOutput: new ReadableStream({
        start(controller) {
          controller.enqueue({ text: 'Hello', isFinal: true });
          controller.close();
        }
      })
    };
  }
}

// Test conversation pipeline with mock provider
const pipeline = new ConversationPipeline({
  stt: new MockSTTProvider(),
  llm: new MockLLMProvider(),
  tts: new MockTTSProvider()
});
```

**3. Easy to Swap Providers**

Runtime provider selection:

```typescript
class AdaptiveProviderSelector {
  selectSTT(context: CallContext): STTProvider {
    // Choose based on language
    if (context.language === 'en') {
      return registry.getSTT('deepgram');  // Best for English
    } else {
      return registry.getSTT('google');    // Better multi-language
    }
  }

  selectLLM(context: CallContext): LLMProvider {
    // Choose based on complexity
    if (context.requiresComplexReasoning) {
      return registry.getLLM('claude-opus');  // Most capable
    } else {
      return registry.getLLM('gpt-4o-mini');  // Fastest
    }
  }
}
```

**4. Easy to Implement Fallbacks**

Automatic fallback chain:

```typescript
class ResilientLLMProvider implements LLMProvider {
  constructor(
    private primary: LLMProvider,
    private fallback: LLMProvider
  ) {}

  streamCompletion(messages: Message[], config: LLMConfig): ReadableStream<string> {
    return new ReadableStream({
      async start(controller) {
        try {
          // Try primary provider
          for await (const chunk of this.primary.streamCompletion(messages, config)) {
            controller.enqueue(chunk);
          }
        } catch (error) {
          logger.warn('Primary LLM failed, using fallback', { error });

          // Fallback to secondary provider
          for await (const chunk of this.fallback.streamCompletion(messages, config)) {
            controller.enqueue(chunk);
          }
        }
        controller.close();
      }
    });
  }
}

// Usage
const resilientLLM = new ResilientLLMProvider(
  registry.getLLM('openai'),      // Primary
  registry.getLLM('anthropic')    // Fallback
);
```

---

## Node.js vs Rust: The Latency Analysis

### The Big Question: Should We Use Rust?

Let's break down **actual latency sources** in our system:

#### Latency Budget Breakdown

```
Total Target: 700ms
├── Audio Capture (browser)          50ms   ← Can't optimize (browser API)
├── WebRTC Transport (up)            50ms   ← Network latency
├── Speech-to-Text (Deepgram)       150ms   ← Provider API (external)
├── Turn Detection (our code)        10ms   ← THIS we control
├── LLM Completion (OpenAI)         300ms   ← Provider API (external)
├── Text-to-Speech (ElevenLabs)     100ms   ← Provider API (external)
└── WebRTC Transport (down)          40ms   ← Network latency
```

**We only control ~10ms out of 700ms (1.4%).**

The rest is:
- **Network latency** (100ms total) - Can't optimize
- **Provider API latency** (550ms total) - Can't optimize (external services)

### Where Rust Would Help

Rust excels at **CPU-bound tasks**:
- Heavy computation
- Memory-intensive operations
- Low-level protocol parsing

But our bottlenecks are **I/O-bound**:
- Waiting for network responses (STT/LLM/TTS APIs)
- WebRTC streaming (delegated to mediasoup, written in C++)
- Most time spent idle, waiting for external services

### Node.js Advantages for Our Use Case

#### 1. **I/O Performance**

Node.js event loop is **designed** for I/O-heavy workloads:

```javascript
// Node.js handles thousands of concurrent I/O operations efficiently
async function handleCall() {
  // All these happen concurrently without blocking
  const [sttStream, llmStream, ttsStream] = await Promise.all([
    deepgram.connect(),   // Network I/O
    openai.connect(),     // Network I/O
    elevenlabs.connect()  // Network I/O
  ]);

  // Event loop handles all streams in parallel
}
```

In Rust, you'd use `tokio` for async I/O, which is similar performance but more complex to write.

#### 2. **Ecosystem**

| Feature | Node.js | Rust |
|---------|---------|------|
| WebRTC (mediasoup) | ✅ Production-ready | ⚠️ Limited options |
| OpenAI SDK | ✅ Official | 🔨 Community |
| Deepgram SDK | ✅ Official | 🔨 Community |
| ElevenLabs SDK | ✅ Official | ❌ None |
| WebSocket (Socket.io) | ✅ Battle-tested | 🔨 Custom |

Using Rust means **rebuilding everything from scratch** or using immature libraries.

#### 3. **Development Speed**

```typescript
// TypeScript: Add new provider in 50 lines
class NewProvider implements LLMProvider {
  async streamCompletion(messages: Message[]) {
    const response = await fetch('https://api.example.com', {
      method: 'POST',
      body: JSON.stringify(messages)
    });
    return response.body; // ReadableStream
  }
}
```

```rust
// Rust: Same thing, but 200+ lines
// - Handle lifetimes
// - Implement trait bounds
// - Deal with async runtime (tokio)
// - Convert between types (String vs &str vs Cow)
impl LLMProvider for NewProvider {
    async fn stream_completion<'a>(
        &'a self,
        messages: &'a [Message]
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String, Error>> + Send + 'a>>, Error> {
        // ... many lines of complex async code
    }
}
```

#### 4. **Where Rust WOULD Help**

If we needed to:
- **Implement audio codecs from scratch** (we use Opus, already implemented in C++)
- **Custom DSP** (audio filtering, echo cancellation) - but WebRTC handles this
- **Ultra-high concurrency** (100k+ connections per server) - but we're targeting 100 concurrent calls in v1

For our use case: **Node.js bottleneck is not the problem**.

### Hybrid Approach (Best of Both Worlds)

**Use Node.js for orchestration, Rust for specific hot paths (if needed later):**

```typescript
// Node.js (main application)
import { analyzeAudioQuality } from './native/audio_analyzer.node'; // Rust module

class ConversationPipeline {
  async processAudio(chunk: AudioBuffer) {
    // Fast path: Call Rust for CPU-intensive audio analysis
    const quality = analyzeAudioQuality(chunk); // Rust N-API module

    if (quality < 0.5) {
      this.emit('audio_quality_warning');
    }

    // Continue with normal flow (I/O-bound)
    await this.sttProvider.process(chunk);
  }
}
```

**Rust module** (compiled to native Node.js addon):

```rust
// src/native/audio_analyzer.rs
use neon::prelude::*;

fn analyze_audio_quality(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let buffer = cx.argument::<JsBuffer>(0)?;
    let data = buffer.as_slice(&cx);

    // CPU-intensive computation in Rust
    let quality = calculate_snr(data);

    Ok(cx.number(quality))
}
```

**When to consider this:**
- Profile shows Node.js CPU usage >80% (unlikely for v1)
- Specific CPU-bound operation takes >50ms
- Standard library doesn't have fast implementation

**For v1:** Skip this complexity. Add only if profiling shows Node.js CPU is the bottleneck (it won't be).

---

## WebRTC Voice Integration Deep Dive

### How Voice Actually Flows Through the System

#### Architecture: Browser ↔ mediasoup ↔ Application

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  ┌────────────┐         ┌──────────────┐                   │
│  │ Microphone │────────▶│  Web Audio   │                   │
│  └────────────┘         │   Context    │                   │
│                         │              │                   │
│                         │ - Capture    │                   │
│                         │ - Encoding   │                   │
│                         │ - Opus codec │                   │
│                         └──────┬───────┘                   │
│                                │                            │
│                         ┌──────▼───────┐                   │
│                         │  RTCPeerConn │                   │
│                         │              │                   │
│                         │ - DTLS       │                   │
│                         │ - SRTP       │                   │
│                         │ - ICE        │                   │
│                         └──────┬───────┘                   │
└────────────────────────────────┼────────────────────────────┘
                                 │
                          WebRTC (encrypted)
                                 │
┌────────────────────────────────▼────────────────────────────┐
│                      mediasoup Server                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              mediasoup Worker (C++)                 │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    │    │
│  │  │ WebRTC   │───▶│  Router  │───▶│ RTP      │    │    │
│  │  │Transport │    │          │    │Transport │    │    │
│  │  └──────────┘    └────┬─────┘    └────┬─────┘    │    │
│  │                       │               │           │    │
│  │                  ┌────▼─────┐    ┌───▼──────┐   │    │
│  │                  │Producer  │    │Consumer  │   │    │
│  │                  │(mic      │    │(AI voice)│   │    │
│  │                  │ audio)   │    │          │   │    │
│  │                  └────┬─────┘    └───▲──────┘   │    │
│  └───────────────────────┼──────────────┼───────────┘    │
│                          │              │                │
│  ┌───────────────────────▼──────────────┼───────────┐   │
│  │         Node.js Application Layer    │           │   │
│  │                                      │           │   │
│  │  audioStream.on('data', (chunk) => {│           │   │
│  │    // Opus-encoded PCM audio        │           │   │
│  │    conversationPipeline             │           │   │
│  │      .processAudio(chunk);          │           │   │
│  │  });                                │           │   │
│  │                                     │           │   │
│  │  pipeline.on('audio_out', (chunk) => {          │   │
│  │    audioOutput.send(chunk); ───────────────────┘   │
│  │  });                                               │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/WS
                          │
┌─────────────────────────▼────────────────────────────────┐
│              ConversationPipeline                         │
│                                                           │
│  audioChunk (Opus) → decode → PCM → STT Provider         │
└───────────────────────────────────────────────────────────┘
```

### Step-by-Step: Starting a Voice Call

#### 1. **Client Requests Call**

```javascript
// Browser
const response = await fetch('https://api.openvoice.io/v1/calls', {
  method: 'POST',
  headers: { 'X-API-Key': apiKey },
  body: JSON.stringify({ assistantId: 'asst_123' })
});

const { callId, webRtcSignalUrl } = await response.json();
// webRtcSignalUrl: "wss://api.openvoice.io/v1/calls/call_xyz/webrtc"
```

#### 2. **Server Creates mediasoup Resources**

```typescript
// Server: src/application/services/CallService.ts
class CallService {
  async createCall(assistantId: string): Promise<Call> {
    const callId = generateId();

    // 1. Create mediasoup transport for this call
    const transport = await this.mediasoupManager.createTransport(callId);

    // 2. Create conversation pipeline
    const assistant = await this.assistantService.getAssistant(assistantId);
    const pipeline = new ConversationPipeline({
      stt: registry.getSTT(assistant.transcriber.provider),
      llm: registry.getLLM(assistant.model.provider),
      tts: registry.getTTS(assistant.voice.provider),
      config: assistant
    });

    // 3. Wire up: mediasoup → pipeline
    transport.on('audio_input', (chunk) => {
      pipeline.processAudioChunk(chunk);
    });

    // 4. Wire up: pipeline → mediasoup
    pipeline.on('audio_output', (chunk) => {
      transport.sendAudio(chunk);
    });

    // 5. Store session
    const call = new Call(callId, transport, pipeline, assistant);
    this.activeCalls.set(callId, call);

    return call;
  }
}
```

#### 3. **WebRTC Signaling (ICE/SDP Exchange)**

```typescript
// Server: WebSocket handler for WebRTC signaling
io.of('/v1/calls/:callId/webrtc').on('connection', async (socket) => {
  const { callId } = socket.handshake.params;
  const call = callService.getCall(callId);

  // Step 3a: Client requests transport parameters
  socket.on('get_transport_params', async (callback) => {
    const transport = call.mediasoupTransport;
    callback({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters
    });
  });

  // Step 3b: Client sends DTLS parameters to complete connection
  socket.on('connect_transport', async ({ dtlsParameters }) => {
    await call.mediasoupTransport.connect({ dtlsParameters });
  });

  // Step 3c: Client creates producer (microphone audio)
  socket.on('produce', async ({ kind, rtpParameters }, callback) => {
    const producer = await call.mediasoupTransport.produce({
      kind,
      rtpParameters
    });

    // Wire producer to conversation pipeline
    producer.on('rtp', (packet) => {
      const audioChunk = decodeOpus(packet.payload);
      call.pipeline.processAudioChunk(audioChunk);
    });

    callback({ id: producer.id });
  });

  // Step 3d: Client creates consumer (AI voice audio)
  socket.on('consume', async ({ rtpCapabilities }, callback) => {
    const consumer = await call.mediasoupTransport.consume({
      producerId: call.aiAudioProducerId, // AI-generated audio
      rtpCapabilities,
      paused: false
    });

    callback({
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    });
  });
});
```

#### 4. **Browser Completes WebRTC Connection**

```javascript
// Browser: @openvoice/web-sdk
class OpenVoiceCall {
  async connect() {
    // Connect WebSocket for signaling
    this.socket = io(this.webRtcSignalUrl);

    // Create RTCPeerConnection
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Get microphone stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const audioTrack = stream.getAudioTracks()[0];
    this.pc.addTrack(audioTrack, stream);

    // Get transport parameters from server
    const transportParams = await this.socket.emitWithAck('get_transport_params');

    // Create SDP offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Send DTLS parameters to server
    await this.socket.emitWithAck('connect_transport', {
      dtlsParameters: this.pc.localDescription
    });

    // Create producer (send mic audio)
    const producerId = await this.socket.emitWithAck('produce', {
      kind: 'audio',
      rtpParameters: getRtpParameters(audioTrack)
    });

    // Create consumer (receive AI audio)
    const { rtpParameters } = await this.socket.emitWithAck('consume', {
      rtpCapabilities: this.pc.getCapabilities('audio')
    });

    // Add remote track
    this.pc.addTransceiver('audio', { direction: 'recvonly' });

    // ✅ WebRTC connection established
    // Audio now flows: Browser ↔ mediasoup ↔ Pipeline
  }
}
```

#### 5. **Audio Flows Through Pipeline**

Once WebRTC is connected:

```typescript
// Real-time audio flow (runs continuously during call)

// INPUT: User speaks
microphoneAudio (raw)
  ↓ (Browser encodes)
OpusPackets
  ↓ (WebRTC/SRTP - encrypted)
mediasoup receives
  ↓ (mediasoup decodes Opus)
PCM audio chunks (48kHz, 16-bit)
  ↓ (emit to Node.js)
ConversationPipeline.processAudioChunk()
  ↓
STTProvider.process() → "Hello, I need help"
  ↓
TurnDetector.onTranscript() → "User finished speaking"
  ↓
LLMProvider.streamCompletion() → "I'd be happy to help you..."
  ↓
TTSProvider.streamSynthesis() → PCM audio chunks
  ↓ (mediasoup encodes to Opus)
OpusPackets
  ↓ (WebRTC/SRTP - encrypted)
Browser receives
  ↓ (Browser decodes & plays)
speakerAudio (raw)
```

### Key WebRTC Optimizations

#### 1. **Opus Codec Configuration**

```typescript
const rtpParameters = {
  codecs: [{
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    parameters: {
      'useinbandfec': 1,       // Forward error correction for packet loss
      'usedtx': 1,             // Discontinuous transmission (silence detection)
      'maxplaybackrate': 48000,
      'stereo': 1,
      'sprop-stereo': 1
    }
  }]
};
```

**Why Opus?**
- **Low latency:** 5-20ms codec delay (vs 100ms+ for AAC)
- **High quality:** Transparent audio at 64kbps
- **Packet loss resilience:** FEC rebuilds lost packets
- **Variable bitrate:** Adapts to network conditions

#### 2. **Jitter Buffer Tuning**

```typescript
// Browser configuration
const pc = new RTCPeerConnection({
  iceServers: [...],

  // Minimize jitter buffer for low latency
  audio: {
    jitterBufferTarget: 50,  // 50ms (aggressive)
    jitterBufferMaxSize: 200 // 200ms max (prevent underruns)
  }
});
```

**Trade-off:** Lower jitter buffer = lower latency but more audio glitches on poor networks.

#### 3. **Congestion Control**

mediasoup uses **Google Congestion Control (GCC)** to adapt bitrate:

```typescript
const transport = await router.createWebRtcTransport({
  listenIps: [...],
  initialAvailableOutgoingBitrate: 600000,  // 600kbps initial
  minimumAvailableOutgoingBitrate: 200000,  // 200kbps minimum
  maxIncomingBitrate: 1500000               // 1.5Mbps max incoming
});
```

---

## Future: Telephony Integration Path

### How Phone Calls Work (vs Web Calls)

| Aspect | Web Calls (v1) | Phone Calls (v2) |
|--------|----------------|------------------|
| **Transport** | WebRTC (UDP/TCP) | SIP + RTP (UDP) |
| **Signaling** | WebSocket | SIP (Session Initiation Protocol) |
| **Network** | Internet | PSTN (Phone network) |
| **Audio Codec** | Opus (48kHz, wideband) | G.711 (8kHz, narrowband) |
| **Provider** | Direct (mediasoup) | Twilio/Vonage/Telnyx |

### Architecture: Adding Telephony Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    Current (v1): Web Only                    │
│                                                              │
│  Browser (WebRTC) → mediasoup → ConversationPipeline        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                            ↓ v2: Add Telephony

┌─────────────────────────────────────────────────────────────┐
│                   Future (v2): Web + Phone                   │
│                                                              │
│  ┌──────────────┐            ┌───────────────────┐         │
│  │   Browser    │            │   Phone Network   │         │
│  │   (WebRTC)   │            │   (PSTN/SIP)      │         │
│  └──────┬───────┘            └────────┬──────────┘         │
│         │                               │                   │
│         │                               │                   │
│  ┌──────▼──────────────────────────────▼───────────┐       │
│  │          Unified Transport Layer                 │       │
│  │  ┌─────────────┐      ┌──────────────────┐     │       │
│  │  │  mediasoup  │      │ TelephonyAdapter │     │       │
│  │  │  (WebRTC)   │      │  (Twilio SIP)    │     │       │
│  │  └──────┬──────┘      └────────┬─────────┘     │       │
│  │         │                       │                │       │
│  │         └───────────┬───────────┘                │       │
│  │                     │                            │       │
│  │          ┌──────────▼──────────┐                │       │
│  │          │  AudioRouter        │                │       │
│  │          │  (normalizes audio) │                │       │
│  │          └──────────┬──────────┘                │       │
│  └─────────────────────┼───────────────────────────┘       │
│                        │                                    │
│            ┌───────────▼──────────┐                        │
│            │ ConversationPipeline │                        │
│            │  (unchanged!)        │                        │
│            └──────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Step 1: Create Telephony Adapter Interface

```typescript
// src/infrastructure/telephony/TelephonyAdapter.ts
interface TelephonyAdapter {
  name: string;

  // Inbound call handling
  onIncomingCall(handler: (call: IncomingCall) => Promise<void>): void;
  answerCall(callSid: string, webhookUrl: string): Promise<void>;

  // Outbound call handling
  initiateCall(to: string, from: string, webhookUrl: string): Promise<string>;

  // Audio streaming
  streamAudio(callSid: string): {
    audioInput: ReadableStream<AudioBuffer>;
    audioOutput: WritableStream<AudioBuffer>;
  };

  // Call control
  hangup(callSid: string): Promise<void>;
  transfer(callSid: string, to: string): Promise<void>;
  sendDTMF(callSid: string, digits: string): Promise<void>;
}
```

#### Step 2: Implement Twilio Adapter

```typescript
// src/infrastructure/telephony/TwilioAdapter.ts
import twilio from 'twilio';
import WebSocket from 'ws';

class TwilioAdapter implements TelephonyAdapter {
  name = 'twilio';
  private client: twilio.Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = twilio(accountSid, authToken);
  }

  onIncomingCall(handler: (call: IncomingCall) => Promise<void>): void {
    // Express webhook endpoint
    app.post('/webhooks/twilio/incoming', async (req, res) => {
      const { CallSid, From, To } = req.body;

      const call: IncomingCall = {
        id: CallSid,
        from: From,
        to: To,
        direction: 'inbound'
      };

      await handler(call);

      // Return TwiML to connect audio stream
      res.type('text/xml');
      res.send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Connect>
            <Stream url="wss://${process.env.PUBLIC_URL}/media/${CallSid}" />
          </Connect>
        </Response>
      `);
    });
  }

  streamAudio(callSid: string): {
    audioInput: ReadableStream<AudioBuffer>;
    audioOutput: WritableStream<AudioBuffer>;
  } {
    const ws = new WebSocket(`wss://media.twilio.com/streams/${callSid}`);

    const audioInput = new ReadableStream({
      start(controller) {
        ws.on('message', (data) => {
          const message = JSON.parse(data);

          if (message.event === 'media') {
            // Twilio sends mulaw (G.711) encoded audio
            const mulawBuffer = Buffer.from(message.media.payload, 'base64');

            // Decode mulaw → PCM 16-bit
            const pcmBuffer = decodeMulaw(mulawBuffer);

            controller.enqueue(pcmBuffer);
          }
        });
      }
    });

    const audioOutput = new WritableStream({
      write(chunk: AudioBuffer) {
        // Encode PCM → mulaw (G.711)
        const mulawBuffer = encodeMulaw(chunk);

        ws.send(JSON.stringify({
          event: 'media',
          media: {
            payload: mulawBuffer.toString('base64')
          }
        }));
      }
    });

    return { audioInput, audioOutput };
  }

  async initiateCall(to: string, from: string, webhookUrl: string): Promise<string> {
    const call = await this.client.calls.create({
      to,
      from,
      url: webhookUrl,  // TwiML webhook
      statusCallback: `${webhookUrl}/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    return call.sid;
  }

  async hangup(callSid: string): Promise<void> {
    await this.client.calls(callSid).update({ status: 'completed' });
  }
}
```

#### Step 3: Create Unified Transport Manager

```typescript
// src/application/services/TransportManager.ts
class TransportManager {
  createTransport(type: 'web' | 'phone', config: any): Transport {
    if (type === 'web') {
      return new WebRTCTransport(config);
    } else if (type === 'phone') {
      return new TelephonyTransport(config);
    }
    throw new Error(`Unknown transport type: ${type}`);
  }
}

interface Transport {
  id: string;
  type: 'web' | 'phone';

  getAudioStream(): {
    input: ReadableStream<AudioBuffer>;
    output: WritableStream<AudioBuffer>;
  };

  close(): Promise<void>;
}

class TelephonyTransport implements Transport {
  constructor(
    public id: string,
    private adapter: TelephonyAdapter,
    private callSid: string
  ) {}

  type = 'phone' as const;

  getAudioStream() {
    return this.adapter.streamAudio(this.callSid);
  }

  async close(): Promise<void> {
    await this.adapter.hangup(this.callSid);
  }
}
```

#### Step 4: Audio Normalization Layer

Phone audio is **8kHz, mulaw** vs web audio is **48kHz, Opus/PCM**. Need to normalize:

```typescript
// src/infrastructure/audio/AudioRouter.ts
class AudioRouter {
  normalizeInput(source: Transport): ReadableStream<AudioBuffer> {
    const { input } = source.getAudioStream();

    if (source.type === 'phone') {
      // Resample: 8kHz → 16kHz (standard for STT)
      return input.pipeThrough(new ResamplerTransform(8000, 16000));
    } else {
      // WebRTC already sends 48kHz, downsample to 16kHz
      return input.pipeThrough(new ResamplerTransform(48000, 16000));
    }
  }

  normalizeOutput(destination: Transport, audioStream: ReadableStream<AudioBuffer>) {
    if (destination.type === 'phone') {
      // Resample: 16kHz → 8kHz (phone quality)
      const resampled = audioStream.pipeThrough(new ResamplerTransform(16000, 8000));

      // Pipe to phone output
      resampled.pipeTo(destination.getAudioStream().output);
    } else {
      // Resample: 16kHz → 48kHz (WebRTC quality)
      const resampled = audioStream.pipeThrough(new ResamplerTransform(16000, 48000));

      resampled.pipeTo(destination.getAudioStream().output);
    }
  }
}
```

#### Step 5: Update CallService (Minimal Changes)

```typescript
// src/application/services/CallService.ts
class CallService {
  async createCall(
    assistantId: string,
    options: { type: 'web' | 'phone'; phoneNumber?: string }
  ): Promise<Call> {
    const callId = generateId();

    // 1. Create transport (web or phone)
    const transport = this.transportManager.createTransport(options.type, {
      callId,
      phoneNumber: options.phoneNumber
    });

    // 2. Normalize audio streams
    const normalizedInput = this.audioRouter.normalizeInput(transport);
    const normalizedOutput = this.audioRouter.createOutputStream();
    this.audioRouter.normalizeOutput(transport, normalizedOutput);

    // 3. Create conversation pipeline (UNCHANGED!)
    const assistant = await this.assistantService.getAssistant(assistantId);
    const pipeline = new ConversationPipeline({
      stt: registry.getSTT(assistant.transcriber.provider),
      llm: registry.getLLM(assistant.model.provider),
      tts: registry.getTTS(assistant.voice.provider),
      config: assistant
    });

    // 4. Wire up: transport → pipeline
    normalizedInput.pipeTo(new WritableStream({
      write(chunk) {
        pipeline.processAudioChunk(chunk);
      }
    }));

    // 5. Wire up: pipeline → transport
    pipeline.on('audio_output', (chunk) => {
      normalizedOutput.write(chunk);
    });

    // 6. Store session
    const call = new Call(callId, transport, pipeline, assistant);
    this.activeCalls.set(callId, call);

    return call;
  }
}
```

### Key Insight: ConversationPipeline Unchanged

**The beauty of this architecture:** Adding telephony doesn't touch the core voice engine.

```typescript
// This code works for BOTH web and phone calls:
const pipeline = new ConversationPipeline({...});
pipeline.processAudioChunk(chunk); // Doesn't care if chunk came from WebRTC or SIP
pipeline.on('audio_output', sendToUser); // Doesn't care where it's going
```

**Why this works:**
- **ConversationPipeline is transport-agnostic** - it only knows about PCM audio buffers
- **AudioRouter handles format conversion** - phone vs web codecs
- **Transport interface is unified** - `getAudioStream()` works the same

---

## Adding New Features Without Breaking Latency

### Principle: Features Should Be **Orthogonal** to Pipeline

**Orthogonal** = Independent, non-interfering.

### Example 1: Call Analytics

**Bad approach** (breaks latency):

```typescript
// ❌ BAD: Analytics in critical path
class ConversationPipeline {
  async processAudioChunk(chunk: AudioBuffer) {
    // Wait for analytics (adds 50ms latency!)
    await this.analytics.trackAudioQuality(chunk);

    // Now process STT
    await this.sttProvider.process(chunk);
  }
}
```

**Good approach** (parallel):

```typescript
// ✅ GOOD: Analytics in parallel
class ConversationPipeline {
  async processAudioChunk(chunk: AudioBuffer) {
    // Process STT immediately (no blocking)
    this.sttProvider.process(chunk);

    // Track analytics in background (fire-and-forget)
    setImmediate(() => {
      this.analytics.trackAudioQuality(chunk).catch(err =>
        logger.error('Analytics failed', err)
      );
    });
  }
}
```

**Result:** Analytics adds **0ms latency**.

### Example 2: Sentiment Analysis

**Bad approach** (breaks latency):

```typescript
// ❌ BAD: Sentiment analysis blocks LLM
class ConversationPipeline {
  async handleUserTurnComplete(transcript: string) {
    // Wait for sentiment (adds 200ms latency!)
    const sentiment = await this.sentimentAnalyzer.analyze(transcript);

    // Pass to LLM with sentiment
    await this.llmProvider.streamCompletion([
      { role: 'system', content: `User sentiment: ${sentiment}` },
      { role: 'user', content: transcript }
    ]);
  }
}
```

**Good approach** (streaming with parallel enrichment):

```typescript
// ✅ GOOD: Start LLM immediately, enrich in parallel
class ConversationPipeline {
  async handleUserTurnComplete(transcript: string) {
    // Start LLM immediately (no blocking)
    const llmStream = this.llmProvider.streamCompletion([
      { role: 'user', content: transcript }
    ]);

    // Analyze sentiment in parallel
    this.sentimentAnalyzer.analyze(transcript).then(sentiment => {
      // Emit event for logging/UI
      this.emit('sentiment', { transcript, sentiment });

      // Optionally: Adjust TTS emotion based on sentiment
      if (sentiment === 'angry') {
        this.ttsConfig.stability = 0.3; // More empathetic
      }
    });

    return llmStream;
  }
}
```

**Result:** Sentiment analysis adds **0ms latency** to conversation.

### Example 3: Call Recording

**Implementation** (zero latency impact):

```typescript
// ✅ Call recording: Listen to events, don't block pipeline
class CallRecordingService {
  startRecording(callId: string) {
    const call = callService.getCall(callId);
    const recorder = new AudioRecorder(`recordings/${callId}.wav`);

    // Listen to audio chunks (parallel)
    call.on('audio_input', (chunk) => {
      recorder.appendInput(chunk); // Non-blocking write
    });

    call.on('audio_output', (chunk) => {
      recorder.appendOutput(chunk); // Non-blocking write
    });

    // Listen to transcript events (parallel)
    call.on('transcript', (event) => {
      recorder.appendTranscript(event); // Non-blocking write
    });
  }
}
```

**Result:** Recording adds **0ms latency**.

---

## Performance Optimization Strategies

### 1. **Measure First, Optimize Later**

```typescript
// Add instrumentation to measure actual latency
class ConversationPipeline {
  async processAudioChunk(chunk: AudioBuffer) {
    const start = performance.now();

    await this.sttProvider.process(chunk);
    const sttLatency = performance.now() - start;

    metrics.histogram('latency.stt', sttLatency);

    if (sttLatency > 200) {
      logger.warn('STT latency high', { sttLatency });
    }
  }
}
```

**Only optimize what the measurements show is slow.**

### 2. **Connection Pooling for Providers**

```typescript
// Reuse HTTP connections to providers
class DeepgramSTTProvider {
  private connectionPool = new http.Agent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000
  });

  createStream() {
    return fetch('https://api.deepgram.com/v1/listen', {
      agent: this.connectionPool  // Reuse connections
    });
  }
}
```

**Saves:** 50-100ms per request (TLS handshake avoidance).

### 3. **Warm Provider Connections on Session Start**

```typescript
class CallService {
  async createCall(assistantId: string) {
    const call = /* ... create call ... */;

    // Warm up provider connections (parallel)
    await Promise.all([
      call.pipeline.sttProvider.warmup(),  // Connect to Deepgram
      call.pipeline.llmProvider.warmup(),  // Connect to OpenAI
      call.pipeline.ttsProvider.warmup()   // Connect to ElevenLabs
    ]);

    return call;
  }
}
```

**Saves:** 100-200ms on first message (cold start eliminated).

### 4. **Cache LLM Responses (Optional)**

For common queries:

```typescript
class CachedLLMProvider implements LLMProvider {
  private cache = new LRUCache<string, string>({ max: 1000 });

  async streamCompletion(messages: Message[]) {
    const cacheKey = hashMessages(messages);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      // Return cached response as stream (0ms latency!)
      return readableStreamFromString(cached);
    }

    // Not cached, call real LLM
    const stream = await this.baseLLM.streamCompletion(messages);

    // Cache for next time
    let fullResponse = '';
    return stream.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        fullResponse += chunk;
        controller.enqueue(chunk);
      },
      flush() {
        cache.set(cacheKey, fullResponse);
      }
    }));
  }
}
```

**Use case:** FAQ chatbot, where same questions asked often.

---

## Summary: Architecture Strengths

### ✅ **Extensibility**

| Want to add... | Impact on existing code |
|----------------|-------------------------|
| New STT provider | Add 1 class, 0 changes to core |
| New LLM provider | Add 1 class, 0 changes to core |
| New TTS provider | Add 1 class, 0 changes to core |
| Call recording | Add 1 service, 0 changes to core |
| Sentiment analysis | Add 1 service, 0 changes to core |
| Phone calls | Add telephony adapter, minimal changes |
| Function calling | Add tool system, extends LLM layer |

### ✅ **Performance**

- **Node.js is NOT the bottleneck** (98.6% of latency is I/O-bound)
- **Stream-first design** minimizes buffering (50-70% latency reduction)
- **Provider plugin system** has zero overhead (simple function calls)
- **Parallel execution** for non-critical features (analytics, recording, etc.)

### ✅ **Future-Proof**

- **Transport abstraction** makes adding phone/video straightforward
- **Provider abstraction** makes swapping services trivial
- **Event-driven architecture** makes adding features non-invasive
- **Layered design** isolates changes to specific layers

---

## Final Answer: Should We Use Rust?

**For v1: No.**

**Reasoning:**
1. Node.js is not the bottleneck (only 1.4% of latency is our code)
2. I/O-bound workload (Node.js excels here)
3. Rich ecosystem (mediasoup, provider SDKs)
4. Faster development (ship v1 in 12 weeks)

**For v2+: Maybe, for specific hot paths.**

If profiling shows:
- Audio processing (DSP, filtering) is slow
- Custom codec implementation needed
- >80% CPU usage on Node.js process

Then: Add Rust modules via N-API for those specific functions.

But realistically: **mediasoup (C++) already handles the heavy lifting**.

---

**The architecture is designed to be BOTH fast AND flexible. That's the magic.**
