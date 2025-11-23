import { Configuration } from './Configuration';
import { Conversation, createConversation } from './Conversation';
import { v4 as uuidv4 } from 'uuid';

/**
 * SessionState - State machine for conversation lifecycle
 *
 * Transitions:
 * idle → listening: User clicks "Start Conversation"
 * listening → processing: Turn detected (user stops speaking)
 * processing → speaking: First audio chunk from TTS
 * speaking → listening: Audio playback complete
 * * → error: Any provider failure
 * * → idle: User clicks "Stop Conversation"
 */
export type SessionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

/**
 * Session - Represents a user's browser session with conversation state
 */
export interface Session {
  id: string;
  config: Configuration;
  conversation: Conversation;
  state: SessionState;
  createdAt: Date;
  error?: string; // Error message if state is 'error'
}

/**
 * Create a new session
 */
export function createSession(config: Configuration): Session {
  return {
    id: uuidv4(),
    config,
    conversation: createConversation(),
    state: 'idle',
    createdAt: new Date(),
  };
}

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  idle: ['listening', 'error'],
  listening: ['processing', 'idle', 'error'],
  processing: ['speaking', 'idle', 'error'],
  speaking: ['listening', 'idle', 'error'],
  error: ['idle'], // Can only recover by stopping
};

/**
 * Validate state transition
 */
export function canTransition(from: SessionState, to: SessionState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Transition session state
 * @throws Error if transition is invalid
 */
export function transitionState(
  session: Session,
  newState: SessionState,
  error?: string
): Session {
  if (!canTransition(session.state, newState)) {
    throw new Error(
      `Invalid state transition: ${session.state} → ${newState}`
    );
  }

  return {
    ...session,
    state: newState,
    error: newState === 'error' ? error : undefined,
  };
}
