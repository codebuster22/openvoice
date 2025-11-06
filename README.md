# OpenVoice

**The open source alternative to Vapi.ai**

Build voice AI agents that can have real-time conversations over the web. Self-hostable. MIT licensed. No platform fees.

---

## 🎯 Vision

Voice AI is transforming how we interact with technology, but existing platforms lock you into proprietary services with per-minute fees. **OpenVoice changes that.**

We're building a production-grade, open source voice AI platform that gives you:

- ✅ **Complete control** - Self-host anywhere, customize everything
- ✅ **Zero platform fees** - Only pay your AI provider costs
- ✅ **MIT license** - Use it commercially, fork it, build on it
- ✅ **Production-ready** - <700ms latency, handles interruptions, scales

---

## 📚 Documentation

This repository contains comprehensive research and planning documents:

### Core Documents

1. **[RESEARCH.md](RESEARCH.md)** - Deep dive into Vapi.ai, market analysis, and why OpenVoice will succeed
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture, design patterns, and implementation details
3. **[V1_SCOPE.md](V1_SCOPE.md)** - What we're building (and not building) in version 1.0

### Quick Links

- **[How Vapi.ai Works](RESEARCH.md#the-problem-were-solving)** - Understanding the competition
- **[Technology Stack Decisions](RESEARCH.md#technology-stack-decisions)** - Why TypeScript + Node.js + mediasoup
- **[System Architecture](ARCHITECTURE.md#system-architecture)** - Layered architecture and data flow
- **[v1 Feature Matrix](V1_SCOPE.md#feature-comparison-matrix)** - OpenVoice vs Vapi.ai comparison
- **[Implementation Roadmap](RESEARCH.md#implementation-roadmap)** - 12-week development plan

---

## 🚀 Current Status

**Phase:** Research & Planning ✅

We've completed:
- ✅ Comprehensive Vapi.ai analysis
- ✅ Open source landscape evaluation
- ✅ Technical architecture design
- ✅ v1 scope definition
- ✅ Technology stack decisions

**Next Steps:**
1. Project structure and tooling setup
2. WebRTC infrastructure (mediasoup)
3. STT/LLM/TTS provider integrations
4. REST API and WebSocket implementation

---

## 🎨 What OpenVoice Will Do

### v1.0 (Web Calls Only)

OpenVoice v1 focuses on **web-based voice conversations** with AI:

```javascript
import { OpenVoiceClient } from '@openvoice/web-sdk';

// Create a client
const client = new OpenVoiceClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://your-openvoice-server.com'
});

// Start a voice conversation
const call = await client.startCall({
  assistantId: 'asst_friendly_support_agent'
});

// Listen for transcript events
call.on('transcript', (event) => {
  console.log(`${event.role}: ${event.text}`);
});

// The user can now speak to the AI through their browser
```

**Features:**
- 🎙️ Real-time voice conversations via WebRTC
- 🔄 Streaming STT → LLM → TTS pipeline
- ⚡ <700ms latency
- 🛑 Interruption handling (user can interrupt AI)
- 🔌 Pluggable providers (OpenAI, Anthropic, Deepgram, ElevenLabs, etc.)
- 🐳 Docker-based deployment
- 📊 Prometheus metrics

### v2.0+ (Future)

- 📞 Phone call support (inbound/outbound via Twilio)
- 🛠️ Function calling for custom actions
- 🌍 Multi-language support
- 🐍 Python SDK
- ☸️ Kubernetes deployment

See [V1_SCOPE.md](V1_SCOPE.md) for the complete feature breakdown.

---

## 🏗️ Architecture Overview

OpenVoice uses a **layered architecture** with streaming-first design:

```
Browser (WebRTC)
    ↓
mediasoup (Audio Transport)
    ↓
┌───────────────────────────────┐
│  Conversation Pipeline        │
│                               │
│  STT → LLM → TTS             │
│  (Deepgram → OpenAI → ElevenLabs)
└───────────────────────────────┘
    ↓
Provider Adapters (Pluggable)
```

**Technology Stack:**
- **Language:** TypeScript + Node.js
- **WebRTC:** mediasoup (SFU)
- **API Framework:** Express + Socket.io
- **Audio Codec:** Opus
- **Database:** PostgreSQL (future), in-memory/file-based (v1)
- **Deployment:** Docker + Docker Compose

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical deep dive.

---

## 🤔 Why OpenVoice?

### vs. Vapi.ai (Proprietary)

| Feature | Vapi.ai | OpenVoice |
|---------|---------|-----------|
| **Platform Fee** | $0.05/min | $0.00 (free) |
| **Self-Hostable** | ❌ | ✅ |
| **Open Source** | ❌ | ✅ (MIT) |
| **Customizable** | Limited | Fully |
| **Data Sovereignty** | Cloud only | On-premises |

**Total cost at scale:**
- Vapi.ai: ~$0.15/min (platform + providers) = **$9,000/month** for 1,000 hours
- OpenVoice: ~$0.10/min (providers only) = **$6,000/month** for 1,000 hours

**Savings: $3,000/month (33%)**

### vs. Vocode (Open Source)

| Feature | Vocode | OpenVoice |
|---------|--------|-----------|
| **Platform** | Library | Full platform |
| **API Surface** | Programmatic only | REST + WebSocket |
| **WebRTC Built-in** | ❌ (DIY) | ✅ (mediasoup) |
| **Deployment Ready** | ❌ (library) | ✅ (Docker) |
| **Documentation** | Developer-focused | End-to-end |

**OpenVoice is to Vocode what Ruby on Rails is to Ruby.**

---

## 🛤️ Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Project structure, tooling, Docker setup
- REST API boilerplate
- In-memory assistant storage

### Phase 2: WebRTC (Weeks 3-4)
- mediasoup integration
- WebSocket signaling
- JavaScript SDK

### Phase 3: STT Integration (Week 5)
- Deepgram streaming API
- Whisper local fallback

### Phase 4: LLM Integration (Week 6)
- OpenAI + Anthropic streaming
- Turn detection logic

### Phase 5: TTS Integration (Week 7)
- ElevenLabs + Azure streaming
- Interruption handling

### Phase 6: Pipeline Orchestration (Week 8)
- End-to-end STT → LLM → TTS
- Latency optimization

### Phase 7: Call Management (Week 9)
- Complete call lifecycle
- Transcript storage

### Phase 8: Testing & Polish (Week 10)
- Unit, integration, E2E tests
- Performance testing

### Phase 9: Documentation (Week 11)
- Quick start, API reference
- Self-hosting guide

### Phase 10: v1.0 Release (Week 12)
- Final polish, security audit
- GitHub release, announcement

See [RESEARCH.md](RESEARCH.md#implementation-roadmap) for detailed breakdown.

---

## 🎯 Success Metrics

### v1.0 Definition of Done

- ✅ Web calls work end-to-end
- ✅ <700ms average latency
- ✅ Interruption handling reliable
- ✅ >80% test coverage
- ✅ Complete API documentation
- ✅ Docker deployment works

### 6-Month Goals (Post-Launch)

- **GitHub Stars:** 5,000+
- **Contributors:** 50+
- **Production Deployments:** 100+
- **Community Projects:** 20+ apps built with OpenVoice

---

## 🤝 Contributing

**We're in the research phase!** Contributions will open once we start coding.

For now, you can:
1. ⭐ Star this repo to show interest
2. 💬 Open discussions for feature ideas
3. 📖 Review the research docs and provide feedback

Once we start building, we'll have:
- Contribution guidelines
- Good first issues
- Development setup guide

---

## 📄 License

MIT License - Maximum freedom for developers and companies.

See [LICENSE](LICENSE) for details.

---

## 🌟 Philosophy

> "Good design is as little design as possible." — Dieter Rams

We're not building every feature. We're building the **essential 20% that delivers 80% of the value**, with exceptional quality.

v1 does **one thing perfectly**: Web-based voice conversations with AI.

- Phone calls? v2.
- Function calling? v2.
- Dashboard UI? Community can build it.

This focus means we ship faster, with higher quality, and build momentum.

---

## 📞 Support

- **Documentation:** Coming soon (once we start building)
- **Issues:** [GitHub Issues](https://github.com/codebuster22/openvoice/issues)
- **Discussions:** [GitHub Discussions](https://github.com/codebuster22/openvoice/discussions)

---

## 🙏 Acknowledgments

Inspired by:
- **Vapi.ai** - For proving the market and showing what's possible
- **Vocode** - For pioneering open source voice AI
- **LiveKit** - For excellent WebRTC infrastructure
- The entire open source voice AI community

---

**Let's build something insanely great. Together.** 🚀
