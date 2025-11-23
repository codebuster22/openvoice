import {
  Session,
  SessionState,
  createSession,
  transitionState,
} from '@models/Session';
import { Configuration } from '@models/Configuration';

/**
 * SessionManager - Manages active conversation sessions
 *
 * Responsibilities:
 * - CRUD operations for sessions
 * - State machine enforcement
 * - In-memory storage (Map<sessionId, Session>)
 *
 * Application layer service
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  /**
   * Create a new session with configuration
   */
  createSession(config: Configuration): Session {
    const session = createSession(config);
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Transition session state (enforces state machine)
   * @throws Error if transition is invalid
   */
  transitionState(sessionId: string, newState: SessionState, error?: string): Session {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updatedSession = transitionState(session, newState, error);
    this.sessions.set(sessionId, updatedSession);

    return updatedSession;
  }

  /**
   * Update session (replace entire session object)
   */
  updateSession(session: Session): void {
    if (!this.sessions.has(session.id)) {
      throw new Error(`Session not found: ${session.id}`);
    }
    this.sessions.set(session.id, session);
  }

  /**
   * Destroy session and clean up resources
   */
  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get session count (for monitoring)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clean up idle sessions (not needed for MVP, but good practice)
   */
  cleanupIdleSessions(maxAgeMs: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      const age = now - session.createdAt.getTime();
      if (session.state === 'idle' && age > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}
