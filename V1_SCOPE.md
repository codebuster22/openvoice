# OpenVoice v1.0 Scope Definition

> "Focus is about saying no." — Steve Jobs

This document provides a crystal-clear definition of what we're building in v1 and, more importantly, what we're **not** building.

---

## Core Principle

**v1 is about nailing ONE thing perfectly: Web-based voice conversations with AI.**

We're not trying to match every Vapi.ai feature. We're building the essential foundation that developers need, with the quality and performance that makes it production-ready.

---

## Feature Comparison Matrix

| Feature | Vapi.ai | OpenVoice v1 | OpenVoice v2+ |
|---------|---------|--------------|---------------|
| **Core Voice Engine** |
| WebRTC audio streaming | ✅ | ✅ | ✅ |
| Real-time STT (speech-to-text) | ✅ | ✅ | ✅ |
| LLM orchestration | ✅ | ✅ | ✅ |
| Real-time TTS (text-to-speech) | ✅ | ✅ | ✅ |
| Streaming pipeline | ✅ | ✅ | ✅ |
| Interruption handling | ✅ | ✅ | ✅ |
| Turn-taking detection | ✅ | ✅ | ✅ |
| <700ms latency | ✅ | ✅ | ✅ |
| **Integration Types** |
| Web calls (browser) | ✅ | ✅ | ✅ |
| Inbound phone calls | ✅ | ❌ | ✅ (v2) |
| Outbound phone calls | ✅ | ❌ | ✅ (v2) |
| **API & SDK** |
| REST API for assistants | ✅ | ✅ | ✅ |
| REST API for calls | ✅ | ✅ (web only) | ✅ |
| WebSocket real-time events | ✅ | ✅ | ✅ |
| JavaScript/TypeScript SDK | ✅ | ✅ | ✅ |
| Python SDK | ✅ | ❌ | ✅ (v2) |
| **Provider Support** |
| Multiple STT providers | ✅ | ✅ (2-3 providers) | ✅ (expand) |
| Multiple LLM providers | ✅ | ✅ (2 providers) | ✅ (expand) |
| Multiple TTS providers | ✅ | ✅ (2-3 providers) | ✅ (expand) |
| Bring your own API keys | ✅ | ✅ | ✅ |
| **Advanced Features** |
| Function calling / Tools | ✅ | ❌ | ✅ (v2) |
| Transfer call | ✅ | ❌ | ✅ (v2) |
| Send SMS | ✅ | ❌ | ✅ (v2) |
| DTMF (dial pad) | ✅ | ❌ | ✅ (v2) |
| Custom wake words | ✅ | ❌ | 🤔 (maybe v3) |
| Voice activity detection tuning | ✅ | ❌ (defaults only) | ✅ (v2) |
| **Language Support** |
| English | ✅ | ✅ | ✅ |
| Spanish, French, etc. | ✅ | ❌ | ✅ (v2) |
| 100+ languages | ✅ | ❌ | ✅ (v3) |
| **User Interface** |
| Dashboard for assistants | ✅ | ❌ | 🤔 (community) |
| Call analytics UI | ✅ | ❌ | 🤔 (community) |
| Usage tracking UI | ✅ | ❌ | 🤔 (community) |
| **Deployment** |
| Hosted cloud service | ✅ | ❌ (self-host only) | ✅ (optional v3) |
| Self-hostable | ❌ | ✅ | ✅ |
| Docker/Docker Compose | N/A | ✅ | ✅ |
| Kubernetes (Helm) | N/A | ❌ | ✅ (v2) |
| **Analytics & Monitoring** |
| Built-in analytics | ✅ | ❌ | 🤔 (v2+) |
| Prometheus metrics | N/A | ✅ | ✅ |
| Structured logging | N/A | ✅ | ✅ |
| **Enterprise Features** |
| SSO / SAML | ✅ | ❌ | 🤔 (v3+) |
| RBAC (role-based access) | ✅ | ❌ | 🤔 (v3+) |
| SLA guarantees | ✅ | ❌ | N/A (open source) |
| HIPAA compliance | ✅ | ❌ (DIY) | 🤔 (guidance) |
| **Pricing** |
| Platform fee | $0.05/min | $0.00 (free, MIT) | $0.00 (free, MIT) |
| Provider costs | Pass-through | Pass-through | Pass-through |

**Legend:**
- ✅ Included
- ❌ Not included
- 🤔 Maybe (community/future consideration)

---

## What We're Building in v1

### ✅ Must Have (Non-Negotiable)

#### 1. Core Voice Engine
- **WebRTC audio streaming** using mediasoup
- **Streaming STT** with Deepgram (primary) and Whisper (fallback)
- **Streaming LLM** with OpenAI and Anthropic
- **Streaming TTS** with ElevenLabs (primary) and Azure (fallback)
- **End-to-end latency <700ms** (target)
- **Interruption handling** (user can interrupt AI)
- **Turn-taking logic** with configurable silence detection

#### 2. REST API
- `POST /v1/assistants` - Create assistant
- `GET /v1/assistants/:id` - Get assistant
- `PATCH /v1/assistants/:id` - Update assistant
- `DELETE /v1/assistants/:id` - Delete assistant
- `POST /v1/calls` - Start web call
- `GET /v1/calls/:id` - Get call details
- `POST /v1/calls/:id/stop` - End call

#### 3. WebSocket Real-Time Events
- `transcript` - User speech transcription (partial and final)
- `assistant_speaking` - AI started speaking
- `assistant_message` - AI response text
- `call_ended` - Call terminated

#### 4. Assistant Configuration
- System prompt (instructions)
- First message (greeting)
- LLM model selection (OpenAI GPT-4, GPT-3.5, Claude)
- TTS voice selection (ElevenLabs voices, Azure voices)
- STT language (English only in v1)
- Temperature, max_tokens

#### 5. JavaScript/TypeScript SDK
- `OpenVoiceClient` class for API interaction
- `Call` class for managing active calls
- Event listeners for real-time updates
- Published to npm as `@openvoice/web-sdk`

#### 6. Infrastructure
- **Docker** - Single Dockerfile for easy deployment
- **docker-compose.yml** - Local development setup
- **Environment-based config** - All secrets via env vars
- **Health check endpoint** - `/health` for monitoring
- **Prometheus metrics** - Latency, errors, active calls

#### 7. Documentation
- **README.md** - Project overview and quick start
- **docs/quickstart.md** - Get running in 5 minutes
- **docs/api-reference.md** - Complete API documentation
- **docs/self-hosting.md** - Docker deployment guide
- **docs/providers.md** - How to configure STT/LLM/TTS providers

#### 8. Quality Standards
- **>80% test coverage** - Unit, integration, E2E tests
- **TypeScript strict mode** - Type safety everywhere
- **Linted code** - Prettier + ESLint
- **CI/CD** - GitHub Actions for tests and builds

---

### 🤔 Nice to Have (If Time Permits)

#### 1. Additional Providers
- AssemblyAI for STT
- Play.ht for TTS
- Google Cloud STT/TTS

#### 2. Call Metadata
- Custom metadata fields on assistants and calls
- Searchable transcript history

#### 3. Rate Limiting
- Built-in rate limiting per API key
- Configurable limits

#### 4. Example Applications
- Demo chat widget for websites
- Voice chatbot example
- React component library

---

## What We're NOT Building in v1

### ❌ Deferred to v2

#### 1. Telephony Integration
**Why:** Requires SIP/PSTN connectivity (Twilio/Vonage/Telnyx), phone number provisioning, regulatory compliance, and adds significant complexity.

**v2 Plan:**
- Integrate with Twilio for phone calls
- Support inbound and outbound calling
- DTMF (dial pad) support
- Call transfer functionality

#### 2. Function Calling / Tools
**Why:** Requires designing a plugin architecture, defining tool schemas, and handling async tool execution. v1 focuses on conversation quality.

**v2 Plan:**
- Define tool/function calling interface
- Built-in tools: `transferCall`, `endCall`, `apiRequest`
- Custom tool registration

#### 3. Advanced Voice Features
**Why:** These are optimizations that can wait until core functionality is solid.

**v2 Plan:**
- Configurable Voice Activity Detection (VAD)
- Custom silence thresholds
- Backchannel sounds ("mm-hmm", "yeah")

#### 4. Multi-Language Support
**Why:** Supporting 100+ languages requires extensive testing, provider optimization per language, and localized prompts.

**v2 Plan:**
- Add Spanish, French, German, Mandarin
- v3: Expand to 100+ languages

#### 5. Analytics Dashboard
**Why:** A web UI for managing assistants and viewing analytics is valuable but not essential. v1 is API-first.

**v2 Plan (or community-driven):**
- Web dashboard for assistant management
- Call logs and transcript viewer
- Usage analytics and graphs

#### 6. Python SDK
**Why:** JavaScript SDK covers web use cases. Python can wait.

**v2 Plan:**
- Official Python SDK
- Published to PyPI as `openvoice-python`

#### 7. Kubernetes Deployment
**Why:** v1 targets single-server deployments. K8s adds complexity.

**v2 Plan:**
- Helm charts for Kubernetes
- Horizontal Pod Autoscaler config
- Redis for shared state

### ❌ Deferred to v3+

#### 1. Hosted Cloud Service
**Why:** v1 is self-hosted only. Offering a hosted service requires infrastructure, billing, support, and is a business decision.

**v3 Consideration:**
- Offer optional hosted version
- Freemium model (free tier + paid)
- Compete directly with Vapi.ai

#### 2. Enterprise Features
**Why:** SSO, RBAC, compliance certifications are for large enterprises. v1 targets developers and startups.

**v3 Consideration:**
- SSO / SAML integration
- Role-based access control
- Audit logging
- HIPAA compliance guidance

#### 3. Custom Wake Words
**Why:** "Hey OpenVoice" wake words are for always-on scenarios. v1 focuses on active conversations.

**v3 Consideration:**
- Integrate wake word detection (Porcupine, Snowboy)
- Configurable wake words

#### 4. Video Support
**Why:** Vapi is voice-only. We're voice-only.

**v3+ Consideration:**
- Maybe add video if there's demand (requires significant WebRTC changes)

---

## Decision Framework

When a feature request comes up, use this framework:

### Question 1: Does it improve core conversation quality?
- If **YES** → Consider for v1
- If **NO** → Defer to v2+

### Question 2: Does it add significant complexity?
- If **YES** → Defer to v2+
- If **NO** → Consider for v1

### Question 3: Is it essential for basic functionality?
- If **YES** → Must have for v1
- If **NO** → Nice to have or defer

### Question 4: Can the community build it on top of our API?
- If **YES** → Let the community build it
- If **NO** → We need to build it

---

## Examples: Apply the Decision Framework

### Example 1: "Add support for background music during AI speech"

1. **Core conversation quality?** NO (it's a nice-to-have feature)
2. **Significant complexity?** YES (requires audio mixing)
3. **Essential for basic functionality?** NO
4. **Can community build it?** YES (by post-processing audio)

**Decision: ❌ Defer to v2+**

---

### Example 2: "Add support for interruption handling"

1. **Core conversation quality?** YES (critical for natural conversation)
2. **Significant complexity?** MODERATE (but manageable)
3. **Essential for basic functionality?** YES
4. **Can community build it?** NO (requires core pipeline changes)

**Decision: ✅ Must have for v1**

---

### Example 3: "Add a web dashboard for managing assistants"

1. **Core conversation quality?** NO (doesn't affect conversation)
2. **Significant complexity?** MODERATE (separate frontend app)
3. **Essential for basic functionality?** NO (API-first approach works)
4. **Can community build it?** YES (using our REST API)

**Decision: ❌ Let community build it, provide API**

---

### Example 4: "Add phone call support"

1. **Core conversation quality?** NO (separate channel)
2. **Significant complexity?** YES (telephony, SIP, PSTN, compliance)
3. **Essential for basic functionality?** NO (web calls cover basic use case)
4. **Can community build it?** NO (requires core integration)

**Decision: ❌ Defer to v2 (high-priority post-v1)**

---

## Success Criteria for v1 Launch

Before we release v1.0.0, we must achieve:

### ✅ Functional Criteria

1. **Demo works end-to-end** - User can start a web call, have a conversation, and end the call
2. **Latency target met** - Average end-to-end latency <700ms (measured over 100 test calls)
3. **Interruption works** - User can interrupt AI 95%+ of the time within 500ms
4. **Stable under load** - 50 concurrent calls on a single server without degradation

### ✅ Code Quality Criteria

1. **Test coverage >80%** - Unit + integration tests
2. **Zero critical bugs** - No P0/P1 issues open
3. **TypeScript strict mode** - All code passes strict type checking
4. **Linted and formatted** - Prettier + ESLint passing

### ✅ Documentation Criteria

1. **Quick start works** - New user can get demo running in <5 minutes
2. **API docs complete** - All endpoints documented with examples
3. **Provider setup clear** - Step-by-step guides for Deepgram, OpenAI, ElevenLabs

### ✅ Community Criteria

1. **MIT license** - License file present
2. **Contributing guide** - CONTRIBUTING.md with guidelines
3. **Code of conduct** - CODE_OF_CONDUCT.md
4. **Issue templates** - Bug report and feature request templates

---

## Post-v1 Roadmap (Tentative)

### v1.1 (Minor Release)
- Performance optimizations based on production usage
- Additional STT/TTS provider options
- Improved error messages
- Bug fixes

### v1.2 (Minor Release)
- Call metadata and tagging
- Enhanced logging and debugging tools
- Docker Compose with Postgres for persistence

### v2.0 (Major Release)
- **Telephony integration** (Twilio, Vonage, Telnyx)
- **Function calling framework** for custom tools
- **Multi-language support** (Spanish, French, German, Mandarin)
- **Python SDK**
- **Kubernetes deployment** (Helm charts)

### v2.x (Incremental)
- Advanced VAD tuning
- Analytics and usage tracking
- More LLM/STT/TTS providers

### v3.0 (Major Release)
- **Optional hosted service** (freemium model)
- **Enterprise features** (SSO, RBAC, audit logs)
- **100+ language support**
- **Dashboard UI** (if not built by community)

---

## Philosophy: Ship, Learn, Iterate

> "Real artists ship." — Steve Jobs

We're not building v1 in isolation. We're building v1 to:

1. **Validate the concept** - Does the open source community want this?
2. **Learn from users** - What features do they actually need?
3. **Build momentum** - Get contributors, GitHub stars, and production deployments

**v1 doesn't have to be perfect. It has to be excellent at ONE thing: web-based voice conversations.**

The rest can come later, informed by real-world usage.

---

## Summary

### ✅ v1 Scope (What We're Building)
- Web-based voice calls (WebRTC)
- Streaming STT → LLM → TTS pipeline
- REST API + WebSocket events
- JavaScript SDK
- Docker deployment
- Comprehensive documentation

### ❌ Not in v1 (What We're NOT Building)
- Phone calls (inbound/outbound)
- Function calling / tools
- Multi-language support
- Dashboard UI
- Python SDK
- Kubernetes deployment

### 🎯 Goal
**Ship a production-ready, open source alternative to Vapi.ai's web calling feature that developers love to use.**

---

Let's build it. 🚀
