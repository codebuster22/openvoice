<!--
Sync Impact Report:
- Version: 0.0.0 → 1.0.0
- Initial constitution creation for OpenVoice
- Principles established:
  1. Layered Architecture & Separation of Concerns
  2. Streaming-First Design for Real-Time Performance
  3. Provider Abstraction (Pluggability)
  4. Test-Driven Development (NON-NEGOTIABLE)
  5. Simplicity & Focus (80/20 Rule)
- New sections added:
  - Technology Stack & Standards
  - Development Workflow & Quality Gates
- Templates to update: ✅ None yet (initial setup)
- Follow-up: Create spec-template.md, plan-template.md, tasks-template.md
-->

# OpenVoice Constitution

## Core Principles

### I. Layered Architecture & Separation of Concerns

**MUST:**
- Follow strict layered architecture: Presentation → Application → Domain → Infrastructure
- Each layer communicates only with adjacent layers (no layer skipping)
- Domain logic MUST be independent of infrastructure details (STT/LLM/TTS providers)
- Every component MUST have a single, clear responsibility

**Rationale:** Enables independent testing, provider flexibility, and long-term maintainability. Following proven enterprise patterns ensures OpenVoice remains extensible as we scale from v1 (web calls) to v2+ (phone calls, function calling).

### II. Streaming-First Design for Real-Time Performance

**MUST:**
- All audio/data flows MUST use streaming (no buffering complete responses)
- Target <700ms end-to-end latency (STT → LLM → TTS) for 95th percentile
- Implement backpressure handling for all streaming pipelines
- Use reactive patterns (event emitters, async iterators) for data flow

**Rationale:** Voice AI requires real-time responsiveness. Streaming is non-negotiable for achieving <700ms latency and handling interruptions gracefully.

### III. Provider Abstraction (Pluggability)

**MUST:**
- Define provider-agnostic interfaces for STT, LLM, TTS, and phone services
- Providers MUST be swappable via configuration (no code changes)
- Support multiple providers simultaneously (user choice per assistant)
- All provider-specific code isolated behind adapter pattern

**Rationale:** Vendor lock-in is OpenVoice's anti-pattern. Users should choose best-of-breed providers for their use case. This is a core differentiator from proprietary platforms.

### IV. Test-Driven Development (NON-NEGOTIABLE)

**MUST:**
- Tests written BEFORE implementation (Red-Green-Refactor cycle strictly enforced)
- Minimum 80% code coverage for all core components
- Every API endpoint MUST have integration tests
- Provider adapters MUST have unit tests with mocked external APIs
- Critical paths (call lifecycle, interruption handling) MUST have E2E tests

**Rationale:** Voice AI is complex and failure-sensitive. TDD ensures correctness, catches regressions early, and enables confident refactoring. No exceptions.

### V. Simplicity & Focus (80/20 Rule)

**MUST:**
- Build the 20% of features that deliver 80% of value
- v1 scope is frozen: web calls only (no phone, no functions, no dashboard)
- Every feature addition requires removing complexity elsewhere or deferring to v2+
- Choose boring, proven technologies over bleeding-edge (TypeScript > Rust, PostgreSQL > MongoDB)
- Prefer convention over configuration where reasonable

**Rationale:** Shipping fast with high quality requires ruthless focus. Feature creep kills projects. We're not building Vapi.ai clone—we're building the essential foundation.

## Technology Stack & Standards

**Mandatory Technologies:**
- **Language:** TypeScript (strict mode enabled)
- **Runtime:** Node.js 20+ (LTS releases only)
- **WebRTC:** mediasoup (SFU architecture)
- **API Framework:** Express.js + Socket.io
- **Audio Codec:** Opus (WebRTC standard)
- **Testing:** Jest + Supertest (integration) + Playwright (E2E)
- **Linting:** ESLint + Prettier (enforced via pre-commit hooks)
- **Containerization:** Docker + Docker Compose

**Versioning:**
- Semantic versioning (MAJOR.MINOR.PATCH)
- MAJOR: Breaking API changes or provider contract changes
- MINOR: New features, new provider support
- PATCH: Bug fixes, performance improvements

**Performance Requirements:**
- <700ms latency (95th percentile) for STT → LLM → TTS pipeline
- Support 100 concurrent calls per server instance (v1 target)
- Memory usage <2GB per server instance under load

**Security Requirements:**
- API key authentication for all REST endpoints
- TLS 1.3 for all external connections
- No credentials in logs (structured logging with sanitization)
- Regular dependency updates (Dependabot enabled)

## Development Workflow & Quality Gates

**Before Starting Implementation:**
1. Feature spec MUST be written and approved (`/specify` command)
2. Technical plan MUST detail architecture changes (`/plan` command)
3. Tasks MUST be broken down with clear acceptance criteria (`/tasks` command)

**During Implementation:**
- All code MUST pass linting (ESLint + Prettier)
- All tests MUST pass (unit, integration, E2E where applicable)
- All commits MUST follow conventional commits format
- All PRs MUST include tests for new functionality

**Code Review Requirements:**
- Every PR requires at least one approval
- Reviewer MUST verify:
  - Constitution compliance (layered architecture, provider abstraction, streaming-first)
  - Test coverage meets 80% threshold
  - Performance impact assessed (latency regression checks)
  - Documentation updated (API docs, README if public-facing)

**Deployment Gates:**
- All tests passing in CI/CD pipeline
- Docker build succeeds
- Manual smoke test of critical paths (start call, interrupt, end call)

## Governance

**Constitution Authority:**
- This constitution supersedes all other development practices
- When in doubt, refer to core principles (I-V above)
- Complexity/deviation MUST be explicitly justified and documented

**Amendment Process:**
- Amendments require discussion and consensus
- Version number incremented according to semantic versioning
- All dependent templates (spec, plan, tasks) MUST be updated
- Rationale for amendment MUST be documented

**Compliance Verification:**
- All PRs/reviews MUST verify constitution compliance
- Architecture Decision Records (ADRs) MUST reference relevant principles
- Quarterly constitution review to ensure principles remain relevant

**Runtime Guidance:**
- Refer to `ARCHITECTURE.md` for detailed technical patterns
- Refer to `V1_SCOPE.md` for feature inclusion decisions
- Refer to `RESEARCH.md` for context on market positioning

**Version**: 1.0.0 | **Ratified**: 2025-11-06 | **Last Amended**: 2025-11-06
