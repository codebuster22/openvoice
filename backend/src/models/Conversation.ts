import { Message } from './Message';

/**
 * Conversation - An active or completed voice interaction session
 *
 * Contains ordered list of messages and metadata about the conversation.
 */
export interface Conversation {
  messages: Message[];
  startedAt: Date;
  lastActivityAt: Date;
}

/**
 * Create a new empty conversation
 */
export function createConversation(): Conversation {
  const now = new Date();
  return {
    messages: [],
    startedAt: now,
    lastActivityAt: now,
  };
}

/**
 * Add a message to the conversation
 */
export function addMessageToConversation(
  conversation: Conversation,
  message: Message
): Conversation {
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    lastActivityAt: new Date(),
  };
}
