import OpenAI from 'openai';
import { ILLMProvider, LLMConfig } from './ILLMProvider';
import { TextChunk } from '@types/TextChunk';
import { Message } from '@models/Message';

/**
 * OpenAIAdapter - OpenAI LLM Provider Implementation
 *
 * Uses OpenAI's streaming chat completions API (SSE)
 * Supports GPT-4, GPT-4-Turbo, GPT-3.5-Turbo models
 */
export class OpenAIAdapter implements ILLMProvider {
  private client: OpenAI;

  constructor(private apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Stream completion chunks from OpenAI
   */
  async *streamCompletion(messages: Message[], config: LLMConfig): AsyncIterableIterator<TextChunk> {
    try {
      // Convert our Message format to OpenAI's format
      const openaiMessages = messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));

      // Create streaming completion
      const stream = await this.client.chat.completions.create({
        model: config.model,
        messages: openaiMessages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 150,
        top_p: config.topP ?? 1.0,
        stream: true, // Enable streaming
      });

      // Yield chunks as they arrive (SSE streaming)
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content;

        if (content) {
          yield {
            text: content,
            isDone: false,
          };
        }

        // Check if this is the last chunk
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason === 'stop' || finishReason === 'length') {
          yield {
            text: '',
            isDone: true,
          };
          break;
        }
      }
    } catch (error: any) {
      // Handle OpenAI-specific errors
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded');
      } else if (error.status === 400) {
        throw new Error(`OpenAI API error: ${error.message}`);
      } else {
        throw new Error(`OpenAI streaming failed: ${error.message}`);
      }
    }
  }
}
