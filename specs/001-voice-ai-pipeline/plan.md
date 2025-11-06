# Implementation Plan: Voice AI Pipeline MVP with Web Demo

**Branch**: `001-voice-ai-pipeline` | **Date**: 2025-11-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-voice-ai-pipeline/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path ✅
2. Fill Technical Context ✅
3. Fill Constitution Check section ✅
4. Evaluate Constitution Check ✅ PASS
5. Execute Phase 0 → research.md ✅
6. Execute Phase 1 → contracts, data-model.md, quickstart.md ✅
7. Re-evaluate Constitution Check ✅ PASS
8. Plan Phase 2 → Task generation approach ✅
9. STOP - Ready for /tasks command ✅
```

## Summary

Build an end-to-end voice AI conversation system with streaming STT → LLM → TTS pipeline. Users configure API keys via web interface, speak to an AI assistant, and receive real-time voice responses with live transcripts. Target <5 second end-to-end latency. MVP scope: web-only, single conversation, no interruption handling.

**Core Value**: Proves OpenVoice's streaming architecture achieves production-grade latency with pluggable providers.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 20 LTS
**Primary Dependencies**:
- Backend: Express 4.18, ws 8.16 (WebSocket), @deepgram/sdk, openai 4.x, elevenlabs-node
- Frontend: Vanilla JS (ES6+), Web Audio API, MediaRecorder API
- Testing: Jest 29, Supertest, Playwright

**Storage**: In-memory (Session Map) - No database for MVP
**Testing**: Jest (unit), Supertest (integration), Playwright (E2E)
**Target Platform**: Linux/macOS server (Docker), Desktop browsers (Chrome, Firefox, Safari, Edge latest)

**Project Type**: **web** (backend + frontend)

**Performance Goals**:
- <5 seconds end-to-end latency (user stops speaking → AI audio starts) at p90
- <300ms STT transcription latency
- <2s LLM first token latency
- <500ms TTS first audio chunk latency

**Constraints**:
- Streaming-only architecture (no buffering complete responses)
- Single concurrent conversation per server instance (MVP scope)
- No persistent storage
- Desktop browsers only

**Scale/Scope**:
- 1 concurrent conversation per MVP deployment
- ~50 conversation turns per session
- ~5-10 minute conversation durations

## Constitution Check

_Evaluating against OpenVoice Constitution v1.0.0_

### Principle I: Layered Architecture & Separation of Concerns
✅ **COMPLIANT**
- Presentation: Express routes + WebSocket handlers
- Application: SessionManager, ConversationController
- Domain: ConversationPipeline, TurnDetector, TranscriptBuffer
- Infrastructure: DeepgramSTTAdapter, OpenAILLMAdapter, ElevenLabsTTSAdapter
- No layer skipping; domain logic isolated from provider details

### Principle II: Streaming-First Design
✅ **COMPLIANT**
- All providers use streaming APIs (Deepgram WS, OpenAI SSE, ElevenLabs WS)
- Node.js async iterators for pipeline coordination
- Backpressure handling via stream pause/resume
- No buffering of complete responses

### Principle III: Provider Abstraction (Pluggability)
✅ **COMPLIANT**
- Interface definitions: `ISTTProvider`, `ILLMProvider`, `ITTSProvider`
- Adapters: `DeepgramAdapter`, `OpenAIAdapter`, `ElevenLabsAdapter`
- Configuration-driven provider selection (future multi-provider support ready)
- Provider-specific code isolated behind adapter pattern

### Principle IV: Test-Driven Development
✅ **COMPLIANT**
- Contract tests for API endpoints (written first, fail initially)
- Unit tests for provider adapters with mocked APIs
- Integration tests for pipeline orchestration
- E2E tests for browser interaction (Playwright)
- Target: 80% code coverage

### Principle V: Simplicity & Focus (80/20 Rule)
✅ **COMPLIANT**
- MVP scope: Essential voice conversation only
- No interruptions, no persistence, no auth, no phone calls
- Vanilla JS frontend (no React/Vue complexity)
- In-memory storage (no DB setup)
- Proven technologies: TypeScript, Node.js, Express

**Gate Status**: ✅ **ALL PRINCIPLES SATISFIED** - No violations, no complexity justification needed

## Project Structure

### Documentation (this feature)

```
specs/001-voice-ai-pipeline/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output (technology decisions)
├── data-model.md        # Phase 1 output (entities & state machines)
├── quickstart.md        # Phase 1 output (demo setup guide)
├── contracts/           # Phase 1 output (API contracts)
│   ├── websocket-protocol.md
│   └── api-schema.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created yet)
```

### Source Code (repository root)

```
# Option 2: Web application (backend + frontend)

backend/
├── src/
│   ├── adapters/              # Infrastructure layer
│   │   ├── stt/
│   │   │   ├── ISTTProvider.ts
│   │   │   └── DeepgramAdapter.ts
│   │   ├── llm/
│   │   │   ├── ILLMProvider.ts
│   │   │   └── OpenAIAdapter.ts
│   │   └── tts/
│   │       ├── ITTSProvider.ts
│   │       └── ElevenLabsAdapter.ts
│   ├── domain/                # Domain layer
│   │   ├── ConversationPipeline.ts
│   │   ├── TurnDetector.ts
│   │   └── TranscriptBuffer.ts
│   ├── services/              # Application layer
│   │   ├── SessionManager.ts
│   │   └── ConversationController.ts
│   ├── api/                   # Presentation layer
│   │   ├── routes/
│   │   │   └── health.ts
│   │   └── websocket/
│   │       └── ConversationHandler.ts
│   ├── models/                # Data models
│   │   ├── Configuration.ts
│   │   ├── Conversation.ts
│   │   ├── Message.ts
│   │   └── Session.ts
│   ├── types/                 # TypeScript types
│   │   ├── AudioChunk.ts
│   │   ├── TextChunk.ts
│   │   └── TranscriptChunk.ts
│   └── server.ts              # Express app entry point
├── tests/
│   ├── unit/
│   │   ├── adapters/          # Provider adapter tests (mocked)
│   │   ├── domain/            # Domain logic tests
│   │   └── services/          # Service tests
│   ├── integration/
│   │   ├── pipeline.test.ts   # End-to-end pipeline tests
│   │   └── websocket.test.ts  # WebSocket protocol tests
│   └── e2e/
│       └── conversation.spec.ts  # Playwright browser tests
├── package.json
├── tsconfig.json
├── jest.config.js
└── Dockerfile

frontend/
├── public/
│   ├── index.html             # Configuration UI + conversation interface
│   ├── styles.css             # Minimal styling
│   └── app.js                 # Client-side logic (ES6 modules)
├── package.json               # Build tooling only (no runtime deps)
└── README.md

docker-compose.yml             # Backend + frontend dev setup
```

**Structure Decision**: Option 2 (Web application) - Backend API + Frontend UI required

## Phase 0: Outline & Research

### Research Tasks Completed

1. **Provider Selection & Integration Patterns**
   - **Decision**: Deepgram (STT), OpenAI GPT-4-Turbo (LLM), ElevenLabs (TTS)
   - **Rationale**: Best streaming latency, mature APIs, user requirements alignment
   - **Alternatives considered**:
     - STT: Whisper API (batch only), AssemblyAI (higher cost)
     - LLM: Anthropic Claude (good but user wants OpenAI), Gemini (less mature)
     - TTS: OpenAI TTS (newer), Azure (enterprise complexity)

2. **Audio Streaming Architecture**
   - **Decision**: WebSocket binary frames for bidirectional audio
   - **Rationale**: Low latency, full-duplex, native browser support
   - **Format**: PCM 16-bit 16kHz (browser→server), MP3 24kHz (server→browser)

3. **Turn Detection Strategy**
   - **Decision**: Deepgram's built-in `endpointing` feature
   - **Rationale**: Offloads complexity, tunable silence threshold (1-2s)
   - **Fallback**: Custom silence detector if endpointing insufficient

4. **Pipeline Orchestration Pattern**
   - **Decision**: Async generator pipeline with event emitters
   - **Rationale**: Natural streaming abstraction, backpressure support
   - **Pattern**:
     ```typescript
     async function* pipeline(audioStream) {
       for await (const text of stt.stream(audioStream)) {
         if (turnDetector.isComplete(text)) {
           for await (const llmChunk of llm.stream(messages)) {
             for await (const audioChunk of tts.stream(llmChunk)) {
               yield audioChunk;
             }
           }
         }
       }
     }
     ```

5. **WebSocket Protocol Design**
   - **Decision**: Mixed binary/JSON protocol
   - **Frame types**:
     - `AUDIO_INPUT` (binary): User audio chunks
     - `AUDIO_OUTPUT` (binary): AI audio chunks
     - `TRANSCRIPT` (JSON): Text transcriptions
     - `STATUS` (JSON): State changes (listening, processing, speaking)
     - `ERROR` (JSON): Error messages
   - **Rationale**: Efficient audio transfer, structured control messages

6. **State Machine for Conversation Lifecycle**
   - **States**: `idle`, `listening`, `processing`, `speaking`, `error`
   - **Transitions**:
     - `idle` → `listening`: User clicks "Start Conversation"
     - `listening` → `processing`: Turn detected (user stops speaking)
     - `processing` → `speaking`: First audio chunk from TTS
     - `speaking` → `listening`: Audio playback complete
     - `*` → `error`: Any provider failure
     - `*` → `idle`: User clicks "Stop Conversation"

7. **Error Handling & Retry Strategy**
   - **Transient failures**: Retry with exponential backoff (2s, 4s, 8s max)
   - **Auth failures**: Immediate fail, display credential error
   - **Rate limits**: Immediate fail, show "retry later" message
   - **Network disconnects**: Detect via WebSocket close, allow reconnection

8. **Testing Strategy**
   - **Unit tests**: Provider adapters with `nock` for HTTP mocking, custom WebSocket mocks
   - **Integration tests**: Full pipeline with pre-recorded audio fixtures (`.wav` files)
   - **E2E tests**: Playwright with mock audio input (synthetic MediaStream)
   - **Coverage target**: 80% overall, 100% for domain layer

**Output**: research.md created with all decisions documented

## Phase 1: Design & Contracts

### 1. Data Model (`data-model.md`)

#### Entity: Configuration
```typescript
interface Configuration {
  deepgramApiKey: string;
  openaiApiKey: string;
  elevenLabsApiKey: string;
  model: 'gpt-4-turbo' | 'gpt-3.5-turbo';
  voice: string; // ElevenLabs voice ID
  systemPrompt: string;
}
```
**Validation**: All API keys non-empty, model in allowed list, voice non-empty

#### Entity: Session
```typescript
interface Session {
  id: string; // UUID
  config: Configuration;
  conversation: Conversation;
  state: SessionState;
  createdAt: Date;
}

type SessionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
```

**State Transitions**:
```
idle → listening: startConversation()
listening → processing: onTurnDetected()
processing → speaking: onFirstAudioChunk()
speaking → listening: onAudioComplete()
any → error: onProviderError()
any → idle: stopConversation()
```

#### Entity: Conversation
```typescript
interface Conversation {
  messages: Message[];
  startedAt: Date;
  lastActivityAt: Date;
}
```

#### Entity: Message
```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioData?: Buffer; // Only for assistant messages
}
```

#### Value Objects

```typescript
interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

interface TextChunk {
  text: string;
  isDone: boolean;
}

interface AudioChunk {
  data: Buffer;
  format: 'mp3' | 'pcm';
  sampleRate: number;
}
```

### 2. API Contracts (`contracts/`)

#### WebSocket Protocol (`contracts/websocket-protocol.md`)

**Connection**:
- Endpoint: `ws://localhost:3000/conversation`
- Query params: `?sessionId={uuid}`

**Client → Server Messages**:

```json
// Start conversation
{
  "type": "START",
  "config": {
    "deepgramApiKey": "...",
    "openaiApiKey": "...",
    "elevenLabsApiKey": "...",
    "model": "gpt-4-turbo",
    "voice": "21m00Tcm4TlvDq8ikWAM",
    "systemPrompt": "You are a helpful AI assistant."
  }
}

// Audio input (binary frame)
<binary: PCM 16-bit 16kHz audio chunk>

// Stop conversation
{
  "type": "STOP"
}
```

**Server → Client Messages**:

```json
// Status update
{
  "type": "STATUS",
  "state": "listening" | "processing" | "speaking" | "idle" | "error",
  "timestamp": 1699564800000
}

// Transcript (user speech)
{
  "type": "TRANSCRIPT",
  "role": "user",
  "text": "What's the weather like?",
  "isFinal": true,
  "timestamp": 1699564801000
}

// Transcript (AI response text)
{
  "type": "TRANSCRIPT",
  "role": "assistant",
  "text": "The weather is sunny with a high of 72°F.",
  "isFinal": false,
  "timestamp": 1699564803000
}

// Audio output (binary frame)
<binary: MP3 24kHz audio chunk>

// Error
{
  "type": "ERROR",
  "code": "AUTH_FAILED" | "RATE_LIMIT" | "NETWORK_ERROR" | "PROVIDER_ERROR",
  "message": "Failed to authenticate with OpenAI: Invalid API key",
  "timestamp": 1699564805000
}
```

#### Health Check API (`contracts/api-schema.yaml`)

```yaml
openapi: 3.0.0
info:
  title: OpenVoice API
  version: 1.0.0

paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [ok]
                  timestamp:
                    type: integer
                    format: int64
```

### 3. Contract Tests

**WebSocket Protocol Test** (`tests/integration/websocket.test.ts`):
```typescript
describe('WebSocket Conversation Protocol', () => {
  it('should start conversation and receive status update', async () => {
    const ws = await connectWebSocket('/conversation');
    ws.send(JSON.stringify({ type: 'START', config: mockConfig }));

    const statusMsg = await waitForMessage(ws);
    expect(statusMsg.type).toBe('STATUS');
    expect(statusMsg.state).toBe('listening');
  });

  it('should stream audio and receive transcript', async () => {
    const ws = await connectWebSocket('/conversation');
    ws.send(JSON.stringify({ type: 'START', config: mockConfig }));

    // Send audio chunks
    const audioBuffer = await loadTestAudio('hello.pcm');
    ws.send(audioBuffer, { binary: true });

    // Expect transcript
    const transcriptMsg = await waitForMessage(ws, msg => msg.type === 'TRANSCRIPT');
    expect(transcriptMsg.role).toBe('user');
    expect(transcriptMsg.text).toContain('hello');
  });

  // ... more contract tests
});
```

**Provider Adapter Test** (`tests/unit/adapters/deepgram.test.ts`):
```typescript
describe('DeepgramAdapter', () => {
  it('should stream transcription chunks', async () => {
    const mockDeepgram = createMockDeepgramClient();
    const adapter = new DeepgramAdapter(mockDeepgram);

    const audioStream = createMockAudioStream();
    const transcripts: TranscriptChunk[] = [];

    for await (const chunk of adapter.startStream(audioStream, config)) {
      transcripts.push(chunk);
    }

    expect(transcripts.length).toBeGreaterThan(0);
    expect(transcripts[0].text).toBeDefined();
  });

  // ... more unit tests
});
```

### 4. Quickstart Guide (`quickstart.md`)

**Prerequisites**:
- Node.js 20+
- npm
- Deepgram API key (free tier: deepgram.com)
- OpenAI API key (platform.openai.com)
- ElevenLabs API key (free tier: elevenlabs.io)

**Setup**:
```bash
# Clone and install
git clone <repo>
cd openvoice
npm install

# Start backend (port 3000)
cd backend
npm run dev

# Serve frontend (port 8080)
cd frontend
npm run serve
```

**Demo Workflow**:
1. Open http://localhost:8080
2. Enter API keys:
   - Deepgram: `your_deepgram_key`
   - OpenAI: `your_openai_key`
   - ElevenLabs: `your_elevenlabs_key`
3. Select Model: `gpt-4-turbo`
4. Select Voice: `Rachel` (or any available voice)
5. System Prompt: `You are a helpful AI assistant.`
6. Click "Start Conversation"
7. Allow microphone access
8. Speak: "Hello, how are you?"
9. Observe:
   - Your speech appears in transcript ("You: Hello, how are you?")
   - AI response text appears ("AI: Hello! I'm doing well...")
   - AI voice audio plays
10. Continue conversation (multiple turns)
11. Click "Stop Conversation" when done

**Expected Latency**:
- User finishes speaking → Transcript appears: <2 seconds
- Transcript appears → AI response starts: <3 seconds
- **Total end-to-end**: <5 seconds

### 5. Agent File Update (`CLAUDE.md`)

Created `CLAUDE.md` at repository root with:
- Project overview: Voice AI conversation system
- Architecture: Layered (Presentation/Application/Domain/Infrastructure)
- Key technologies: TypeScript, Node.js, Express, WebSockets, Deepgram, OpenAI, ElevenLabs
- Constitution principles: Streaming-first, provider abstraction, TDD
- Recent changes: Initial MVP implementation (Phase 1 complete)
- Testing approach: Jest unit tests, Supertest integration, Playwright E2E
- Known constraints: MVP scope (web-only, no interruptions, in-memory)

**Output**: All Phase 1 deliverables complete ✅

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - NOT executed during /plan_

**Task Generation Strategy**:

1. **Load** `templates/tasks-template.md` as base structure
2. **Generate tasks** from Phase 1 design docs:
   - **Infrastructure Setup** (3 tasks):
     - Initialize TypeScript project (backend + frontend)
     - Configure Jest + ESLint + Prettier
     - Create Docker setup
   - **Provider Adapters** (9 tasks):
     - STT: Interface definition, Deepgram adapter, unit tests
     - LLM: Interface definition, OpenAI adapter, unit tests
     - TTS: Interface definition, ElevenLabs adapter, unit tests
   - **Domain Layer** (9 tasks):
     - ConversationPipeline, TurnDetector, TranscriptBuffer
     - Each with unit tests
   - **Application Layer** (6 tasks):
     - SessionManager, ConversationController
     - Each with unit tests
   - **Presentation Layer** (6 tasks):
     - WebSocket handler, contract tests
     - Frontend UI, E2E tests
   - **Integration** (3 tasks):
     - End-to-end pipeline test
     - Quickstart validation
     - Performance benchmarking

3. **Ordering Strategy**:
   - **TDD order**: Tests before implementation for each component
   - **Dependency order**: Infrastructure → Adapters → Domain → Application → Presentation
   - **Parallel execution**: Mark independent tasks with [P]
     - Example: All three provider adapter tests can run in parallel

4. **Task Format**:
   ```
   ## Task [###]: [Component] - [Action]
   **Dependencies**: [Task IDs or "None"]
   **Parallel**: [Yes/No]
   **Test First**: [Yes/No]
   **Files**:
   - src/...
   - tests/...

   **Acceptance Criteria**:
   - [ ] Criterion 1
   - [ ] Criterion 2
   ```

**Estimated Output**: 36 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (`/tasks` command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_No violations detected - section intentionally left empty_

All constitutional principles are satisfied without requiring complexity justification.

## Progress Tracking

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach complete (/plan command - described only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---

_Based on Constitution v1.0.0 - See `/memory/constitution.md`_
