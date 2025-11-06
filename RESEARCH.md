# OpenVoice: Building the Open Source Alternative to Vapi.ai

## Executive Summary

Vapi.ai has created something remarkable: a platform that makes voice AI accessible to developers. But it comes with a $0.05/min platform fee on top of provider costs, closed-source infrastructure, and vendor lock-in. **We're going to build something better.**

Not "feature parity." Not "good enough." **Better.**

OpenVoice will be the open source, self-hostable, zero-cost alternative that gives developers complete control over their voice AI infrastructure. MIT licensed. Built for the community. Designed to run anywhere—from a developer's laptop to production at scale.

---

## The Problem We're Solving

### What Vapi.ai Does Right

Vapi.ai solves a real problem: orchestrating real-time voice conversations with AI is **hard**. You need:

1. **Speech-to-Text (STT)** - Converting audio to text in real-time
2. **Large Language Models (LLM)** - Processing and generating responses
3. **Text-to-Speech (TTS)** - Converting responses back to natural audio
4. **Real-time Audio Transport** - WebRTC streaming with <700ms latency
5. **Telephony Integration** - Connecting to phone networks (Twilio, etc.)
6. **Orchestration Logic** - Managing conversation flow, interruptions, turn-taking
7. **Developer APIs** - Making it simple to build and deploy

Vapi.ai packages all of this into a hosted platform with a clean API. Developers pay ~$0.15/min per conversation (platform + providers) and get a working voice AI agent in minutes.

### The Gap in the Market

**Cost barrier:** At scale, $0.05/min platform fees add up fast. A customer support center handling 10,000 hours/month pays $3,000 just for Vapi's hosting—before provider costs.

**Vendor lock-in:** Your entire voice infrastructure depends on a single company's availability, pricing, and roadmap.

**Data sovereignty:** Sensitive conversations (healthcare, finance, legal) require on-premises deployment. Vapi.ai doesn't offer this for most customers.

**Customization limits:** Closed-source means you can't modify the orchestration logic, add custom audio processing, or optimize for your specific use case.

### The Open Source Landscape

**Vocode** (vocodedev/vocode-core) is the closest alternative:
- Python-based, modular architecture
- 6.7k+ GitHub stars, active community
- Supports STT/LLM/TTS provider swapping
- **BUT:** Focused on being a library, not a platform. No hosted API surface. Limited telephony support. Requires significant integration work.

**LiveKit Agents** is powerful for real-time WebRTC but:
- More general-purpose (video + audio)
- Requires deeper WebRTC knowledge
- Not specifically optimized for voice AI orchestration

**Bolna, Dograh, Rasa** are either too early, too specialized, or require excessive custom integration.

### The Opportunity

There's no open source platform that offers:
1. **Drop-in API compatibility** with Vapi.ai's developer experience
2. **Self-hostable** with Docker/Kubernetes
3. **Production-grade** performance (<700ms latency)
4. **MIT licensed** for maximum freedom
5. **Community-driven** development

**That's what we're building.**

---

## Vision: OpenVoice v1.0

### Core Philosophy

> "Simplicity is the ultimate sophistication." - Leonardo da Vinci

We're not building every feature Vapi has. We're building the **essential 20% that delivers 80% of the value**. Version 1 is about:

1. **Nailing the fundamentals** - Real-time audio, STT→LLM→TTS orchestration, WebRTC transport
2. **Developer experience** - Clean REST API, WebSocket for real-time, clear documentation
3. **Production readiness** - Containerized, scalable, observable
4. **Provider flexibility** - Easy to swap STT/LLM/TTS providers

### What We're Building in v1

#### ✅ Core Voice Engine
- **Real-time audio streaming** via WebRTC
- **Streaming STT** with chunked transcription (Deepgram, Whisper, AssemblyAI)
- **LLM orchestration** with streaming responses (OpenAI, Anthropic)
- **Streaming TTS** with natural-sounding voices (ElevenLabs, Play.ht, Azure)
- **Latency optimization** - Target <700ms end-to-end
- **Interruption handling** - Detect when users interrupt the AI
- **Turn-taking logic** - Natural conversation flow with pause detection

#### ✅ Web Integration (Browser-based calls)
- **WebRTC signaling** for browser ↔ server audio
- **JavaScript SDK** for embedding voice agents in web apps
- **Session management** - Create, manage, end conversations
- **Real-time events** - WebSocket for transcript streaming, status updates

#### ✅ REST API (Vapi-compatible subset)
- `POST /assistants` - Create voice assistant configurations
- `GET /assistants/:id` - Retrieve assistant details
- `PATCH /assistants/:id` - Update assistant settings
- `DELETE /assistants/:id` - Delete assistant
- `POST /calls` - Initiate a web-based call session
- `GET /calls/:id` - Get call details and transcript
- `POST /calls/:id/stop` - End an active call

#### ✅ Assistant Configuration
- **System prompts** - Define AI personality and behavior
- **Model selection** - Choose LLM provider and model
- **Voice configuration** - Select TTS voice and settings
- **Temperature/max_tokens** - Control response generation
- **First message** - What the AI says when conversation starts

#### ✅ Provider Integration (Initial Set)
- **STT**: Deepgram (primary), OpenAI Whisper (local fallback)
- **LLM**: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude)
- **TTS**: ElevenLabs (primary), Azure (secondary)
- **Pluggable architecture** - Easy to add more providers

#### ✅ Infrastructure
- **Docker containerization** - Single-command deployment
- **Environment-based config** - 12-factor app principles
- **Logging and observability** - Structured logs, metrics hooks
- **Health checks** - `/health` endpoint for monitoring

#### ✅ Documentation
- **Quick start guide** - Get running in 5 minutes
- **API reference** - Complete endpoint documentation
- **Provider setup** - How to configure API keys
- **Self-hosting guide** - Deploy to your own infrastructure

### What We're NOT Building in v1

#### ❌ Telephony Integration
**Why not:** Phone call integration requires SIP/PSTN connectivity (Twilio, Vonage, Telnyx), regulatory compliance, and adds significant complexity. v1 focuses on web-based voice calls only.

**Future:** v2 will add inbound/outbound phone call support.

#### ❌ Built-in Tools/Function Calling
**Why not:** While Vapi has `transferCall`, `endCall`, `sms`, `dtmf` - these are nice-to-haves. v1 focuses on core conversation quality.

**Future:** v2 will add function calling framework for custom tools.

#### ❌ Multi-language Support Beyond English
**Why not:** Supporting 100+ languages requires extensive testing and provider optimization. v1 prioritizes English for quality over breadth.

**Future:** v2+ will add multi-language support.

#### ❌ Dashboard UI
**Why not:** A web dashboard for managing assistants is valuable but not essential. v1 is API-first.

**Future:** Community can build UIs on top of the API.

#### ❌ Analytics/Usage Tracking
**Why not:** Built-in analytics adds database requirements and complexity. Developers can integrate their own.

**Future:** v2+ may add optional analytics modules.

#### ❌ Enterprise Features (SSO, RBAC, SLAs)
**Why not:** v1 targets developers and startups, not enterprises. Keep it simple.

**Future:** Enterprise features can be layered on for v3+.

#### ❌ Voice Activity Detection (VAD) Tuning UI
**Why not:** While important, v1 will use sensible defaults. Advanced tuning can come later.

**Future:** Expose VAD parameters in v2.

#### ❌ Custom Wake Words
**Why not:** "Hey Assistant" wake words are for always-on scenarios. v1 focuses on active conversations.

**Future:** May add in v2+ if there's demand.

---

## Technical Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Browser    │     │  Mobile App  │     │  Web Widget  │   │
│  │  (WebRTC)    │     │   (WebRTC)   │     │   (WebRTC)   │   │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘   │
│         │                     │                     │            │
└─────────┼─────────────────────┼─────────────────────┼───────────┘
          │                     │                     │
          │        WebRTC Signaling (WebSocket)       │
          │                     │                     │
┌─────────▼─────────────────────▼─────────────────────▼───────────┐
│                       API Gateway Layer                          │
│  ┌──────────────┐                         ┌──────────────┐     │
│  │ REST API     │                         │  WebSocket   │     │
│  │ (Express)    │                         │  (Socket.io) │     │
│  └──────┬───────┘                         └──────┬───────┘     │
└─────────┼──────────────────────────────────────────┼────────────┘
          │                                          │
┌─────────▼──────────────────────────────────────────▼────────────┐
│                   Orchestration Engine                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            Session Manager                              │    │
│  │  - Track active conversations                           │    │
│  │  - Manage WebRTC peer connections                       │    │
│  │  - Handle lifecycle (start, pause, resume, end)         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Conversation Pipeline                           │    │
│  │                                                          │    │
│  │  Audio Stream → STT → LLM → TTS → Audio Stream         │    │
│  │                                                          │    │
│  │  - Manages streaming data flow                          │    │
│  │  - Handles backpressure                                 │    │
│  │  - Detects interruptions                                │    │
│  │  - Implements turn-taking logic                         │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
          │                     │                     │
┌─────────▼─────────────────────▼─────────────────────▼───────────┐
│                      Provider Adapters                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ STT Provider │  │ LLM Provider │  │ TTS Provider │          │
│  │              │  │              │  │              │          │
│  │ - Deepgram   │  │ - OpenAI     │  │ - ElevenLabs │          │
│  │ - Whisper    │  │ - Anthropic  │  │ - Azure      │          │
│  │ - AssemblyAI │  │ - (Pluggable)│  │ - Play.ht    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. API Gateway
- **REST API** for assistant management, call control
- **WebSocket** for real-time signaling and event streaming
- **Authentication** middleware (API key based initially)
- **Request validation** using JSON schemas

#### 2. Session Manager
- Tracks active conversation sessions
- Manages WebRTC peer connections
- Coordinates between REST API and real-time pipeline
- Handles graceful shutdown and cleanup

#### 3. Conversation Pipeline
The heart of OpenVoice. For each active session:

```
┌─────────────┐
│ Audio Input │ (WebRTC from client)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ STT Stream  │ Deepgram/Whisper → text chunks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Transcript  │ Buffer for turn detection
│  Buffer     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Turn Detect │ Did user finish speaking?
└──────┬──────┘
       │ (user_turn_complete)
       ▼
┌─────────────┐
│ LLM Stream  │ OpenAI/Claude → response chunks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ TTS Stream  │ ElevenLabs/Azure → audio chunks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Audio Output│ (WebRTC to client)
└─────────────┘
```

**Key Responsibilities:**
- **Streaming coordination** - Minimize latency by streaming through each stage
- **Interruption detection** - If user speaks while AI is talking, cancel TTS
- **Backpressure handling** - If TTS can't keep up, buffer LLM output
- **Error recovery** - Gracefully handle provider failures

#### 4. Provider Adapters
Abstract interfaces for each service type:

```typescript
interface STTProvider {
  startStream(config: STTConfig): ReadableStream<TranscriptChunk>
  stopStream(): Promise<void>
}

interface LLMProvider {
  streamCompletion(messages: Message[], config: LLMConfig): ReadableStream<string>
}

interface TTSProvider {
  streamSynthesis(text: string, config: TTSConfig): ReadableStream<AudioChunk>
}
```

Each provider implements these interfaces, making it trivial to swap providers or add new ones.

---

## Technology Stack Decisions

### Language: **TypeScript + Node.js**

**Why not Python (like Vocode)?**

1. **WebRTC ecosystem** - Node.js has mature WebRTC libraries (`mediasoup`, `simple-peer`, `wrtc`)
2. **Async I/O** - Node's event loop is ideal for streaming audio and managing many concurrent connections
3. **JavaScript SDK** - Building a browser SDK is easier when the server is also JS/TS
4. **Performance** - V8 JIT + streaming I/O handles real-time audio efficiently
5. **Developer familiarity** - Broader adoption in web development community

**Trade-offs:**
- Python has stronger ML/AI ecosystem (but we're calling APIs, not training models)
- Python may be more familiar to data science folks (but our audience is web developers)

**Decision: TypeScript for type safety, Node.js for runtime.**

---

### Core Framework: **Express + Socket.io**

- **Express** - Battle-tested REST API framework
- **Socket.io** - WebSocket library with fallbacks and easy event handling
- **Why not Fastify?** Express has better ecosystem and community support for WebRTC projects
- **Why not NestJS?** Too much abstraction for v1. Keep it simple.

---

### WebRTC: **mediasoup** (SFU architecture)

**Options considered:**
1. **simple-peer** - Too low-level, would need to build SFU logic ourselves
2. **Janus Gateway** - C-based, harder to extend
3. **mediasoup** - Node.js-based SFU (Selective Forwarding Unit), production-grade, used by many platforms

**Decision: mediasoup** - Gives us scalable WebRTC routing with Node.js integration.

---

### Audio Processing: **Web Audio API + node-opus**

- **Browser side:** Web Audio API for capturing microphone input
- **Server side:** `node-opus` for encoding/decoding Opus audio codec
- **Why Opus?** Industry standard for real-time audio (used by WhatsApp, Discord, Zoom)

---

### Database: **PostgreSQL** (for assistant configurations, call logs)

- Store assistant definitions (prompts, model configs, voice settings)
- Store call metadata (start time, duration, transcript)
- **Why Postgres?** Reliable, JSON support, good for structured + semi-structured data

**Alternative:** Start with **SQLite** for v1 simplicity, migrate to Postgres for production.

**Decision: Start with in-memory + file-based storage (JSON), add database in v1.1.**

---

### Configuration: **Environment Variables + YAML**

- **Environment variables** for secrets (API keys)
- **YAML files** for assistant templates and system configuration
- **Rationale:** Simple, follows 12-factor app principles, easy to containerize

---

### Deployment: **Docker + Docker Compose**

- **Single Dockerfile** for the application
- **docker-compose.yml** for local development (includes Postgres if needed)
- **Why not Kubernetes?** v1 targets single-server deployments. K8s adds complexity.
- **Future:** Provide Helm charts for K8s in v2

---

### Testing Strategy

1. **Unit tests** - Jest for business logic (turn detection, provider adapters)
2. **Integration tests** - Test full STT→LLM→TTS pipeline with mock providers
3. **E2E tests** - Playwright for WebRTC client ↔ server testing
4. **Load tests** - Artillery or k6 for concurrent conversation simulation

---

## API Design (Vapi-Compatible Subset)

### Assistant Management

#### Create Assistant
```http
POST /v1/assistants
Content-Type: application/json

{
  "name": "Customer Support Agent",
  "firstMessage": "Hi, how can I help you today?",
  "systemPrompt": "You are a friendly customer support agent for an e-commerce company.",
  "model": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 150
  },
  "voice": {
    "provider": "elevenlabs",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "stability": 0.5,
    "similarityBoost": 0.75
  },
  "transcriber": {
    "provider": "deepgram",
    "model": "nova-2",
    "language": "en"
  }
}

Response:
{
  "id": "asst_abc123",
  "name": "Customer Support Agent",
  "createdAt": "2025-11-06T10:30:00Z",
  ...
}
```

#### Get Assistant
```http
GET /v1/assistants/asst_abc123

Response:
{
  "id": "asst_abc123",
  "name": "Customer Support Agent",
  "firstMessage": "Hi, how can I help you today?",
  ...
}
```

#### Update Assistant
```http
PATCH /v1/assistants/asst_abc123
Content-Type: application/json

{
  "systemPrompt": "You are an EXTREMELY friendly support agent."
}
```

#### Delete Assistant
```http
DELETE /v1/assistants/asst_abc123

Response: 204 No Content
```

---

### Call Management

#### Start Web Call
```http
POST /v1/calls
Content-Type: application/json

{
  "assistantId": "asst_abc123",
  "metadata": {
    "userId": "user_123",
    "context": "product_inquiry"
  }
}

Response:
{
  "callId": "call_xyz789",
  "status": "queued",
  "webSocketUrl": "wss://openvoice.example.com/v1/calls/call_xyz789/ws",
  "webRtcSignalUrl": "wss://openvoice.example.com/v1/calls/call_xyz789/webrtc"
}
```

#### Get Call Details
```http
GET /v1/calls/call_xyz789

Response:
{
  "callId": "call_xyz789",
  "assistantId": "asst_abc123",
  "status": "active",
  "startedAt": "2025-11-06T10:35:00Z",
  "duration": 127,
  "transcript": [
    {
      "role": "assistant",
      "message": "Hi, how can I help you today?",
      "timestamp": "2025-11-06T10:35:01Z"
    },
    {
      "role": "user",
      "message": "I need help with my order",
      "timestamp": "2025-11-06T10:35:05Z"
    },
    ...
  ]
}
```

#### End Call
```http
POST /v1/calls/call_xyz789/stop

Response:
{
  "callId": "call_xyz789",
  "status": "ended",
  "endedAt": "2025-11-06T10:37:08Z",
  "duration": 128
}
```

---

### WebSocket Events (Real-time)

Client connects to `wss://openvoice.example.com/v1/calls/{callId}/ws`

#### Server → Client Events

**`transcript`** - Partial or final transcript chunks
```json
{
  "event": "transcript",
  "role": "user",
  "text": "I need help with",
  "isFinal": false,
  "timestamp": "2025-11-06T10:35:05.123Z"
}
```

**`assistant_speaking`** - AI started generating response
```json
{
  "event": "assistant_speaking",
  "timestamp": "2025-11-06T10:35:06.500Z"
}
```

**`assistant_message`** - Full assistant response (text)
```json
{
  "event": "assistant_message",
  "text": "I'd be happy to help you with your order. Can you provide your order number?",
  "timestamp": "2025-11-06T10:35:08.200Z"
}
```

**`call_ended`** - Call terminated
```json
{
  "event": "call_ended",
  "reason": "user_hangup",
  "duration": 128,
  "timestamp": "2025-11-06T10:37:08.000Z"
}
```

#### Client → Server Commands

**`hangup`** - End the call
```json
{
  "command": "hangup"
}
```

---

### JavaScript SDK (Web)

```javascript
import { OpenVoiceClient } from '@openvoice/web-sdk';

const client = new OpenVoiceClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://openvoice.example.com'
});

// Start a call
const call = await client.startCall({
  assistantId: 'asst_abc123'
});

// Listen for events
call.on('transcript', (event) => {
  console.log(`${event.role}: ${event.text}`);
});

call.on('ended', (event) => {
  console.log(`Call ended after ${event.duration} seconds`);
});

// End the call
await call.hangup();
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Project structure and tooling setup
- [ ] Express + Socket.io boilerplate
- [ ] TypeScript configuration
- [ ] Docker containerization
- [ ] Basic REST API for assistants (CRUD)
- [ ] In-memory storage for assistants

### Phase 2: WebRTC Integration (Weeks 3-4)
- [ ] mediasoup SFU setup
- [ ] WebRTC signaling via Socket.io
- [ ] Audio stream handling (Opus codec)
- [ ] Browser SDK for WebRTC client
- [ ] Basic call session management

### Phase 3: STT Integration (Week 5)
- [ ] Deepgram streaming API integration
- [ ] Transcript buffering and chunking
- [ ] Real-time transcript events via WebSocket
- [ ] OpenAI Whisper local fallback (optional)

### Phase 4: LLM Integration (Week 6)
- [ ] OpenAI streaming completion API
- [ ] Anthropic Claude streaming API
- [ ] Turn detection logic (when to send to LLM)
- [ ] Message history management

### Phase 5: TTS Integration (Week 7)
- [ ] ElevenLabs streaming API
- [ ] Azure TTS integration (fallback)
- [ ] Audio chunk buffering and playback
- [ ] Interruption handling (cancel TTS if user speaks)

### Phase 6: Orchestration Pipeline (Week 8)
- [ ] End-to-end STT → LLM → TTS pipeline
- [ ] Streaming coordination and backpressure handling
- [ ] Latency optimization (<700ms target)
- [ ] Error recovery and graceful degradation

### Phase 7: Call Management (Week 9)
- [ ] Complete call lifecycle (start, active, ended)
- [ ] Transcript storage and retrieval
- [ ] Call metadata and analytics
- [ ] Rate limiting and quota management

### Phase 8: Testing & Polish (Week 10)
- [ ] Unit test coverage (>80%)
- [ ] Integration tests for full pipeline
- [ ] E2E tests with browser automation
- [ ] Load testing (concurrent calls)
- [ ] Performance profiling and optimization

### Phase 9: Documentation (Week 11)
- [ ] Quick start guide
- [ ] API reference documentation
- [ ] Self-hosting guide (Docker)
- [ ] Provider setup tutorials
- [ ] Troubleshooting guide

### Phase 10: Release (Week 12)
- [ ] Final bug fixes and polish
- [ ] Security audit
- [ ] License and contribution guidelines
- [ ] GitHub release (v1.0.0)
- [ ] Announcement blog post

---

## Success Metrics

### v1.0 Definition of Done

1. **Functional completeness**
   - ✅ Web-based voice calls work end-to-end
   - ✅ Assistant configuration via REST API
   - ✅ Real-time transcript streaming
   - ✅ <700ms average latency
   - ✅ Interruption handling works reliably

2. **Developer experience**
   - ✅ Get a demo running in <5 minutes
   - ✅ Comprehensive API documentation
   - ✅ JavaScript SDK published to npm
   - ✅ Docker deployment guide works

3. **Code quality**
   - ✅ >80% test coverage
   - ✅ TypeScript with strict mode
   - ✅ Linted with Prettier + ESLint
   - ✅ Documented with TSDoc comments

4. **Community readiness**
   - ✅ MIT license
   - ✅ Contribution guidelines
   - ✅ Issue templates
   - ✅ Code of conduct

### Adoption Goals (6 months post-launch)

- **GitHub stars:** 5,000+
- **Contributors:** 50+
- **Production deployments:** 100+
- **Community projects:** 20+ open source apps built with OpenVoice

---

## Why This Will Succeed

### 1. **Timing**
Voice AI is exploding. Vapi raised funding, competitors are emerging, but there's no credible open source alternative. We're early.

### 2. **Market Validation**
Vapi's success proves the demand. Vocode's 6.7k stars prove developers want open source. We're combining the best of both.

### 3. **Technical Feasibility**
Every component already exists:
- WebRTC: Mature, battle-tested
- STT/LLM/TTS: Multiple providers with APIs
- Node.js: Proven for real-time applications

We're not inventing new technology. We're orchestrating existing pieces better than anyone else.

### 4. **Community-First**
MIT license means anyone can use it, fork it, commercialize it. This creates a flywheel:
- Developers use it → Find bugs → Submit PRs
- Companies build on it → Need features → Contribute back
- Ecosystem grows → More integrations → More adoption

### 5. **Focus**
We're not building "everything." We're building the **core platform** exceptionally well. v1 does one thing perfectly: **real-time voice conversations over the web.**

Phone calls? v2.
Function calling? v2.
Dashboard UI? Community can build it.

This focus means we ship faster, with higher quality, and build momentum.

---

## The Path Forward

This research document defines **what** we're building and **why**. Next steps:

1. **Technical Design Doc** - Detailed architecture, class diagrams, API specs
2. **Project Setup** - Initialize codebase, tooling, CI/CD
3. **Spike: WebRTC + mediasoup** - Prove we can stream audio reliably
4. **Spike: STT → LLM → TTS** - Prove we can orchestrate the pipeline
5. **Build Phase 1** - Start the roadmap

Let's build something **insanely great**.

---

## License

MIT License - Maximum freedom for developers and companies.

---

*This research was compiled on November 6, 2025. The landscape evolves fast. We'll adapt as we build.*
