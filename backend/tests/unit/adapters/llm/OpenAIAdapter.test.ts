import { OpenAIAdapter } from '@adapters/llm/OpenAIAdapter';
import { Message } from '@models/Message';

/**
 * Unit test for OpenAI LLM Adapter with SSE streaming
 */
describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;

  beforeEach(() => {
    adapter = new OpenAIAdapter('fake-api-key');
  });

  it('should initialize with API key', () => {
    expect(() => new OpenAIAdapter('test-key')).not.toThrow();
  });

  it('should throw if API key is empty', () => {
    expect(() => new OpenAIAdapter('')).toThrow('OpenAI API key is required');
  });

  it('should stream completion chunks from OpenAI SSE', async () => {
    const messages: Message[] = [
      { role: 'user', content: 'Say hello', timestamp: new Date() },
    ];
    const config = { model: 'gpt-4-turbo', temperature: 0.7 };

    // This will fail until we implement the adapter
    const chunks = [];
    for await (const chunk of adapter.streamCompletion(messages, config)) {
      chunks.push(chunk);
      if (chunk.isDone) break;
    }

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should handle OpenAI rate limit errors (429)', async () => {
    const messages: Message[] = [{ role: 'user', content: 'Test', timestamp: new Date() }];
    const config = { model: 'gpt-4-turbo' };

    // Mock rate limit error - will test when implemented
    await expect(async () => {
      for await (const _chunk of adapter.streamCompletion(messages, config)) {
        // Should throw rate limit error
      }
    }).rejects.toThrow();
  });
});
