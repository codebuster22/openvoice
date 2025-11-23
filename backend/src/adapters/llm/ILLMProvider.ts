import { TextChunk } from '@types/TextChunk';
import { Message } from '@models/Message';

/**
 * LLM Provider Configuration
 */
export interface LLMConfig {
  model: string; // e.g., 'gpt-4-turbo', 'claude-3-opus', 'gemini-pro'
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  [key: string]: unknown; // Allow provider-specific config
}

/**
 * ILLMProvider - Interface for Large Language Model providers
 *
 * All LLM providers (OpenAI, Anthropic, Google, etc.) must implement this interface.
 * Follows Constitution Principle III: Provider Abstraction
 */
export interface ILLMProvider {
  /**
   * Stream completion chunks from LLM
   *
   * @param messages - Conversation history (system + user + assistant messages)
   * @param config - Model configuration (temperature, max tokens, etc.)
   * @returns Async iterator yielding TextChunk objects
   *
   * @throws Error if API fails, rate limited, or authentication fails
   *
   * Example:
   * ```typescript
   * const messages = [
   *   { role: 'system', content: 'You are helpful' },
   *   { role: 'user', content: 'Hello!' }
   * ];
   *
   * for await (const chunk of provider.streamCompletion(messages, config)) {
   *   process.stdout.write(chunk.text);
   *   if (chunk.isDone) break;
   * }
   * ```
   */
  streamCompletion(messages: Message[], config: LLMConfig): AsyncIterableIterator<TextChunk>;
}
