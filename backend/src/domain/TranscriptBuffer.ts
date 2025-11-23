import { Message } from '@models/Message';

/**
 * TranscriptBuffer - Maintains conversation message history
 *
 * Stores ordered sequence of user and assistant messages.
 * Provides formatting for LLM API consumption.
 */
export class TranscriptBuffer {
  private messages: Message[] = [];

  /**
   * Add a message to the transcript
   */
  addMessage(role: 'user' | 'assistant' | 'system', content: string, audioData?: Buffer): void {
    const message: Message = {
      role,
      content,
      timestamp: new Date(),
      audioData,
    };

    this.messages.push(message);
  }

  /**
   * Get all messages in chronological order
   */
  getMessages(): Message[] {
    return [...this.messages]; // Return copy to prevent external mutation
  }

  /**
   * Get messages formatted for LLM API
   * Excludes audioData and converts timestamps
   */
  getFormattedForLLM(): Array<{ role: string; content: string }> {
    return this.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Get last N messages
   */
  getLastN(count: number): Message[] {
    return this.messages.slice(-count);
  }

  /**
   * Clear all messages (start fresh conversation)
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Get message count
   */
  get length(): number {
    return this.messages.length;
  }
}
