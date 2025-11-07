import { ILLMProvider } from '@adapters/llm/ILLMProvider';
import { TextChunk } from '@types/TextChunk';
import { Message } from '@models/Message';

/**
 * Contract test for LLM Provider Interface
 * Defines expected behavior for OpenAI, Claude, Gemini, etc.
 */
describe('ILLMProvider Contract', () => {
  let provider: ILLMProvider;

  beforeEach(() => {
    provider = {} as ILLMProvider;
  });

  it('should stream completion chunks via async iterator', async () => {
    const messages: Message[] = [
      { role: 'system', content: 'You are helpful', timestamp: new Date() },
      { role: 'user', content: 'Hello!', timestamp: new Date() },
    ];
    const config = { model: 'gpt-4-turbo', temperature: 0.7, maxTokens: 150 };

    const streamIterator = provider.streamCompletion(messages, config);

    expect(streamIterator).toBeDefined();
    expect(typeof streamIterator[Symbol.asyncIterator]).toBe('function');
  });

  it('should yield text chunks with isDone flag', async () => {
    const messages: Message[] = [{ role: 'user', content: 'Test', timestamp: new Date() }];
    const config = { model: 'gpt-4-turbo' };

    const chunks: TextChunk[] = [];
    for await (const chunk of provider.streamCompletion(messages, config)) {
      chunks.push(chunk);
      if (chunk.isDone) break;
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1].isDone).toBe(true);
  });

  it('should throw on invalid API credentials', async () => {
    const messages: Message[] = [];
    const config = { model: 'gpt-4-turbo' };

    await expect(async () => {
      for await (const _chunk of provider.streamCompletion(messages, config)) {
        // Should throw before yielding
      }
    }).rejects.toThrow();
  });
});
