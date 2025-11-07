import { ITTSProvider } from '@adapters/tts/ITTSProvider';
import { AudioChunk } from '@types/AudioChunk';

/**
 * Contract test for TTS Provider Interface
 * Defines expected behavior for ElevenLabs, Azure, OpenAI TTS, etc.
 */
describe('ITTSProvider Contract', () => {
  let provider: ITTSProvider;

  beforeEach(() => {
    provider = {} as ITTSProvider;
  });

  it('should stream audio chunks via async iterator', async () => {
    const text = 'Hello, this is a test.';
    const config = { voice: 'Rachel', model: 'eleven_turbo_v2' };

    const streamIterator = provider.streamSpeech(text, config);

    expect(streamIterator).toBeDefined();
    expect(typeof streamIterator[Symbol.asyncIterator]).toBe('function');
  });

  it('should yield audio chunks with correct format', async () => {
    const text = 'Test speech';
    const config = { voice: 'Rachel', model: 'eleven_turbo_v2' };

    const { value: chunk } = await provider.streamSpeech(text, config).next();

    expect(chunk).toHaveProperty('data');
    expect(chunk).toHaveProperty('format');
    expect(chunk).toHaveProperty('sampleRate');

    expect(Buffer.isBuffer(chunk.data)).toBe(true);
    expect(['mp3', 'pcm', 'opus']).toContain(chunk.format);
    expect(chunk.sampleRate).toBeGreaterThan(0);
  });

  it('should throw on invalid voice ID', async () => {
    const text = 'Test';
    const config = { voice: 'invalid-voice-id', model: 'eleven_turbo_v2' };

    await expect(async () => {
      for await (const _chunk of provider.streamSpeech(text, config)) {
        // Should throw
      }
    }).rejects.toThrow();
  });
});
