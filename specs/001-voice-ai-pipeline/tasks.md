# Tasks: Voice AI Pipeline MVP with Web Demo

**Input**: Design documents from `/specs/001-voice-ai-pipeline/`
**Prerequisites**: plan.md ✅, spec.md ✅

## Execution Flow (main)

```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript, Node.js, Express, WebSocket
   → Structure: Web app (backend + frontend)
2. Load optional design documents ✅
   → plan.md: Architecture, data models, contracts defined
   → spec.md: Functional requirements, user stories
3. Generate tasks by category ✅
   → Setup: 4 tasks
   → Tests: 15 tasks (contract + integration + E2E)
   → Core: 18 tasks (adapters + domain + services + API)
   → Integration: 3 tasks (frontend + end-to-end)
   → Polish: 3 tasks (docs + performance)
4. Apply task rules ✅
   → Different files = marked [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T043) ✅
6. Generate dependency graph ✅
7. Validate task completeness ✅
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- File paths relative to repository root

## Path Conventions

**Web app structure** (per plan.md):
- Backend: `backend/src/`, `backend/tests/`
- Frontend: `frontend/public/`

---

## Phase 3.1: Setup & Infrastructure

**Goal**: Initialize project structure, dependencies, and tooling

- [ ] **T001** Create project directory structure (backend/ and frontend/ with subdirectories per plan.md)
  - **Files**: `backend/src/{adapters,domain,services,api,models,types}/`, `backend/tests/{unit,integration,e2e}/`, `frontend/public/`
  - **Dependencies**: None
  - **Acceptance**: Directory structure matches plan.md exactly

- [ ] **T002** Initialize backend TypeScript project with dependencies
  - **Files**: `backend/package.json`, `backend/tsconfig.json`
  - **Dependencies**: T001
  - **Packages**: express, ws, @deepgram/sdk, openai, elevenlabs-node, jest, @types/*, ts-node
  - **Acceptance**: `npm install` succeeds, `tsc --noEmit` passes

- [ ] **T003** [P] Configure ESLint, Prettier, and Jest for backend
  - **Files**: `backend/.eslintrc.json`, `backend/.prettierrc`, `backend/jest.config.js`
  - **Dependencies**: T002
  - **Acceptance**: `npm run lint` and `npm run test` commands work (no tests yet)

- [ ] **T004** [P] Create Docker setup for development
  - **Files**: `Dockerfile`, `docker-compose.yml`, `.dockerignore`
  - **Dependencies**: T002
  - **Acceptance**: `docker-compose up` builds and runs successfully

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Provider Adapter Contract Tests

- [ ] **T005** [P] STT adapter interface contract test
  - **Files**: `backend/tests/unit/adapters/stt/ISTTProvider.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Test defines expected interface (startStream, stopStream), FAILS with "not implemented"

- [ ] **T006** [P] Deepgram adapter unit test with mocked WebSocket
  - **Files**: `backend/tests/unit/adapters/stt/DeepgramAdapter.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests streaming behavior, endpointing, FAILS with "module not found"

- [ ] **T007** [P] LLM adapter interface contract test
  - **Files**: `backend/tests/unit/adapters/llm/ILLMProvider.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Test defines expected interface (streamCompletion), FAILS with "not implemented"

- [ ] **T008** [P] OpenAI adapter unit test with mocked SSE stream
  - **Files**: `backend/tests/unit/adapters/llm/OpenAIAdapter.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests streaming chunks, error handling, FAILS with "module not found"

- [ ] **T009** [P] TTS adapter interface contract test
  - **Files**: `backend/tests/unit/adapters/tts/ITTSProvider.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Test defines expected interface (streamSpeech), FAILS with "not implemented"

- [ ] **T010** [P] ElevenLabs adapter unit test with mocked WebSocket
  - **Files**: `backend/tests/unit/adapters/tts/ElevenLabsAdapter.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests audio streaming, FAILS with "module not found"

### Domain Layer Unit Tests

- [ ] **T011** [P] ConversationPipeline orchestration test
  - **Files**: `backend/tests/unit/domain/ConversationPipeline.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests STT→LLM→TTS flow with mocks, FAILS with "module not found"

- [ ] **T012** [P] TurnDetector logic test
  - **Files**: `backend/tests/unit/domain/TurnDetector.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests pause detection (1s, 2s thresholds), FAILS with "module not found"

- [ ] **T013** [P] TranscriptBuffer state management test
  - **Files**: `backend/tests/unit/domain/TranscriptBuffer.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests message ordering, role tagging, FAILS with "module not found"

### Application Layer Unit Tests

- [ ] **T014** [P] SessionManager lifecycle test
  - **Files**: `backend/tests/unit/services/SessionManager.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests session creation, state transitions (idle→listening→processing→speaking), FAILS

- [ ] **T015** [P] ConversationController coordination test
  - **Files**: `backend/tests/unit/services/ConversationController.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests pipeline initialization, error propagation, FAILS

### Integration Tests

- [ ] **T016** [P] WebSocket protocol contract test
  - **Files**: `backend/tests/integration/websocket.test.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests START message, audio frames, STOP message, FAILS with "handler not defined"

- [ ] **T017** [P] End-to-end pipeline integration test with fixtures
  - **Files**: `backend/tests/integration/pipeline.test.ts`
  - **Dependencies**: T002, T003
  - **Test data**: `backend/tests/fixtures/hello.pcm`, `backend/tests/fixtures/expected-response.json`
  - **Acceptance**: Tests full STT→LLM→TTS flow with pre-recorded audio, FAILS

### E2E Browser Tests

- [ ] **T018** [P] Playwright E2E conversation test
  - **Files**: `backend/tests/e2e/conversation.spec.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests browser UI interaction (config, start, speak, stop), FAILS

- [ ] **T019** [P] Playwright E2E error handling test
  - **Files**: `backend/tests/e2e/errors.spec.ts`
  - **Dependencies**: T002, T003
  - **Acceptance**: Tests invalid credentials, network errors, FAILS

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Infrastructure Layer: Provider Adapters

- [ ] **T020** [P] Create STT provider interface definition
  - **Files**: `backend/src/adapters/stt/ISTTProvider.ts`, `backend/src/types/TranscriptChunk.ts`
  - **Dependencies**: T005 (test must be failing)
  - **Acceptance**: Interface matches contract test, TypeScript compiles

- [ ] **T021** Implement Deepgram STT adapter
  - **Files**: `backend/src/adapters/stt/DeepgramAdapter.ts`
  - **Dependencies**: T020, T006 (test must be failing)
  - **Acceptance**: T006 test passes, streams transcription chunks via async generator

- [ ] **T022** [P] Create LLM provider interface definition
  - **Files**: `backend/src/adapters/llm/ILLMProvider.ts`, `backend/src/types/TextChunk.ts`
  - **Dependencies**: T007 (test must be failing)
  - **Acceptance**: Interface matches contract test, TypeScript compiles

- [ ] **T023** Implement OpenAI LLM adapter with SSE streaming
  - **Files**: `backend/src/adapters/llm/OpenAIAdapter.ts`
  - **Dependencies**: T022, T008 (test must be failing)
  - **Acceptance**: T008 test passes, streams completion chunks via async generator

- [ ] **T024** [P] Create TTS provider interface definition
  - **Files**: `backend/src/adapters/tts/ITTSProvider.ts`, `backend/src/types/AudioChunk.ts`
  - **Dependencies**: T009 (test must be failing)
  - **Acceptance**: Interface matches contract test, TypeScript compiles

- [ ] **T025** Implement ElevenLabs TTS adapter with WebSocket streaming
  - **Files**: `backend/src/adapters/tts/ElevenLabsAdapter.ts`
  - **Dependencies**: T024, T010 (test must be failing)
  - **Acceptance**: T010 test passes, streams audio chunks via async generator

### Domain Layer: Business Logic

- [ ] **T026** [P] Implement TurnDetector with configurable silence threshold
  - **Files**: `backend/src/domain/TurnDetector.ts`
  - **Dependencies**: T012 (test must be failing)
  - **Acceptance**: T012 test passes, detects 1s/2s pauses correctly

- [ ] **T027** [P] Implement TranscriptBuffer with message history
  - **Files**: `backend/src/domain/TranscriptBuffer.ts`, `backend/src/models/Message.ts`
  - **Dependencies**: T013 (test must be failing)
  - **Acceptance**: T013 test passes, maintains ordered conversation history

- [ ] **T028** Implement ConversationPipeline orchestrator
  - **Files**: `backend/src/domain/ConversationPipeline.ts`
  - **Dependencies**: T021, T023, T025, T026, T027, T011 (test must be failing)
  - **Acceptance**: T011 test passes, coordinates STT→LLM→TTS with backpressure handling

### Data Models

- [ ] **T029** [P] Create Configuration model with validation
  - **Files**: `backend/src/models/Configuration.ts`
  - **Dependencies**: None
  - **Acceptance**: Validates API keys non-empty, model in allowed list

- [ ] **T030** [P] Create Session model with state machine
  - **Files**: `backend/src/models/Session.ts`, `backend/src/models/Conversation.ts`
  - **Dependencies**: T029
  - **Acceptance**: State transitions match plan.md specification (idle→listening→processing→speaking)

### Application Layer: Services

- [ ] **T031** Implement SessionManager with in-memory storage
  - **Files**: `backend/src/services/SessionManager.ts`
  - **Dependencies**: T030, T014 (test must be failing)
  - **Acceptance**: T014 test passes, manages session lifecycle with Map<string, Session>

- [ ] **T032** Implement ConversationController
  - **Files**: `backend/src/services/ConversationController.ts`
  - **Dependencies**: T028, T031, T015 (test must be failing)
  - **Acceptance**: T015 test passes, initializes pipeline with user config, handles errors

### Presentation Layer: API

- [ ] **T033** Implement health check endpoint
  - **Files**: `backend/src/api/routes/health.ts`
  - **Dependencies**: T002
  - **Acceptance**: `GET /health` returns `{"status":"ok","timestamp":...}`

- [ ] **T034** Implement WebSocket conversation handler
  - **Files**: `backend/src/api/websocket/ConversationHandler.ts`
  - **Dependencies**: T032, T016 (test must be failing)
  - **Acceptance**: T016 test passes, handles START/AUDIO_INPUT/STOP messages, streams TRANSCRIPT/AUDIO_OUTPUT/STATUS

- [ ] **T035** Create Express server entry point
  - **Files**: `backend/src/server.ts`
  - **Dependencies**: T033, T034
  - **Acceptance**: Server starts on port 3000, serves health endpoint, accepts WebSocket connections

---

## Phase 3.4: Integration (Frontend + E2E)

- [ ] **T036** Create frontend HTML with configuration UI
  - **Files**: `frontend/public/index.html`, `frontend/public/styles.css`
  - **Dependencies**: None (can be parallel)
  - **UI Elements**: API key inputs (3), model dropdown, voice dropdown, system prompt textarea, Start/Stop buttons, transcript panel
  - **Acceptance**: Form validates all fields filled before enabling Start button

- [ ] **T037** Implement frontend WebSocket client with audio streaming
  - **Files**: `frontend/public/app.js`
  - **Dependencies**: T036
  - **Features**:
    - MediaRecorder for microphone capture (PCM 16kHz)
    - WebSocket binary/JSON messaging
    - Web Audio API for playback
    - Transcript rendering with auto-scroll
  - **Acceptance**: Connects to `ws://localhost:3000/conversation`, sends audio, displays transcripts, plays AI audio

- [ ] **T038** Wire up frontend to backend and validate E2E tests pass
  - **Files**: None (integration validation)
  - **Dependencies**: T035, T037, T018, T019 (E2E tests must exist)
  - **Acceptance**: T018 and T019 Playwright tests pass end-to-end

---

## Phase 3.5: Polish & Documentation

- [ ] **T039** [P] Create quickstart.md with setup instructions
  - **Files**: `specs/001-voice-ai-pipeline/quickstart.md`
  - **Dependencies**: T038 (working system)
  - **Content**: Prerequisites, installation steps, demo workflow, troubleshooting
  - **Acceptance**: Following guide from scratch results in working demo

- [ ] **T040** [P] Measure and optimize latency to meet <5s target
  - **Files**: `backend/tests/integration/latency.test.ts`
  - **Dependencies**: T038
  - **Metrics**: STT latency, LLM first token, TTS first chunk, end-to-end
  - **Acceptance**: p90 latency <5 seconds measured over 10 test conversations

- [ ] **T041** [P] Run test coverage report and ensure >80%
  - **Files**: Coverage report generation only
  - **Dependencies**: All tests (T005-T019, T040)
  - **Acceptance**: `npm run test:coverage` shows >80% overall, 100% for domain layer

- [ ] **T042** Create demo video/screenshots for README
  - **Files**: `docs/demo-video.mp4`, `docs/screenshots/*.png`
  - **Dependencies**: T038
  - **Acceptance**: 2-minute video showing configuration → conversation → transcript

- [ ] **T043** Update root README.md with MVP status
  - **Files**: `README.md`
  - **Dependencies**: T042
  - **Acceptance**: Adds "✅ MVP Complete" section with demo link, quickstart, and architecture diagram

---

## Dependencies

**Phase order** (strict):
1. Setup (T001-T004)
2. Tests (T005-T019) - MUST be failing before Phase 3.3
3. Implementation (T020-T037) - Makes tests pass
4. Polish (T038-T043)

**Key blocking relationships**:
- T002 blocks all backend tasks
- T005-T019 (tests) block corresponding implementation tasks
- T020 (STT interface) blocks T021 (Deepgram impl)
- T022 (LLM interface) blocks T023 (OpenAI impl)
- T024 (TTS interface) blocks T025 (ElevenLabs impl)
- T021, T023, T025 block T028 (ConversationPipeline)
- T028 blocks T032 (ConversationController)
- T032 blocks T034 (WebSocket handler)
- T035 (server) + T037 (frontend) block T038 (E2E validation)
- T038 blocks all polish tasks (T039-T043)

---

## Parallel Execution Examples

### Round 1: Setup (after T002 completes)
```bash
# Launch T003 and T004 together
Task: "Configure ESLint, Prettier, Jest - backend/.eslintrc.json, backend/jest.config.js"
Task: "Create Docker setup - Dockerfile, docker-compose.yml"
```

### Round 2: All Unit Tests (after T002, T003 complete)
```bash
# Launch T005-T015 together (15 tests in parallel)
Task: "STT adapter interface contract test - backend/tests/unit/adapters/stt/ISTTProvider.test.ts"
Task: "Deepgram adapter unit test - backend/tests/unit/adapters/stt/DeepgramAdapter.test.ts"
Task: "LLM adapter interface contract test - backend/tests/unit/adapters/llm/ILLMProvider.test.ts"
Task: "OpenAI adapter unit test - backend/tests/unit/adapters/llm/OpenAIAdapter.test.ts"
Task: "TTS adapter interface contract test - backend/tests/unit/adapters/tts/ITTSProvider.test.ts"
Task: "ElevenLabs adapter unit test - backend/tests/unit/adapters/tts/ElevenLabsAdapter.test.ts"
Task: "ConversationPipeline test - backend/tests/unit/domain/ConversationPipeline.test.ts"
Task: "TurnDetector test - backend/tests/unit/domain/TurnDetector.test.ts"
Task: "TranscriptBuffer test - backend/tests/unit/domain/TranscriptBuffer.test.ts"
Task: "SessionManager test - backend/tests/unit/services/SessionManager.test.ts"
Task: "ConversationController test - backend/tests/unit/services/ConversationController.test.ts"
# ... continue with T016-T019
```

### Round 3: Provider Interfaces (after corresponding tests fail)
```bash
# Launch T020, T022, T024 together (interface definitions)
Task: "Create STT provider interface - backend/src/adapters/stt/ISTTProvider.ts"
Task: "Create LLM provider interface - backend/src/adapters/llm/ILLMProvider.ts"
Task: "Create TTS provider interface - backend/src/adapters/tts/ITTSProvider.ts"
```

### Round 4: Domain Components (after T012, T013 tests fail)
```bash
# Launch T026, T027 together
Task: "Implement TurnDetector - backend/src/domain/TurnDetector.ts"
Task: "Implement TranscriptBuffer - backend/src/domain/TranscriptBuffer.ts"
```

### Round 5: Data Models
```bash
# Launch T029, T030 together
Task: "Create Configuration model - backend/src/models/Configuration.ts"
Task: "Create Session model - backend/src/models/Session.ts"
```

### Round 6: Polish (after T038 completes)
```bash
# Launch T039, T040, T041, T042 together
Task: "Create quickstart.md - specs/001-voice-ai-pipeline/quickstart.md"
Task: "Measure latency - backend/tests/integration/latency.test.ts"
Task: "Test coverage report - run npm test:coverage"
Task: "Create demo video - docs/demo-video.mp4"
```

---

## Notes

- **[P] marker**: Tasks can run in parallel (different files, no shared dependencies)
- **TDD strict**: Verify all tests (T005-T019) fail before starting T020
- **Commit frequency**: After each task or logical group (e.g., after all provider adapters)
- **Latency monitoring**: Track metrics during T040, optimize bottlenecks (likely TTS or LLM first token)

---

## Validation Checklist

_GATE: Checked before proceeding to implementation_

- [x] All provider interfaces have contract tests (T005, T007, T009)
- [x] All provider implementations have unit tests (T006, T008, T010)
- [x] All domain components have unit tests (T011, T012, T013)
- [x] All services have unit tests (T014, T015)
- [x] WebSocket protocol has integration test (T016)
- [x] Full pipeline has integration test (T017)
- [x] Browser interaction has E2E tests (T018, T019)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks are truly independent ([P] tasks modify different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task

---

**Total Tasks**: 43
**Estimated Parallel Groups**: 8 (significantly reduces wall-clock time)
**TDD Coverage**: 15 test tasks before 23 implementation tasks
**Constitution Compliance**: ✅ All principles followed (layered architecture, streaming-first, provider abstraction, TDD)

**Ready for `/implement` command**
