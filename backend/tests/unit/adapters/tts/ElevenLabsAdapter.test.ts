import { ElevenLabsAdapter } from '@adapters/tts/ElevenLabsAdapter';

/**
 * Unit test for ElevenLabs TTS Adapter with WebSocket streaming
 */
describe('ElevenLabsAdapter', () => {
  let adapter: ElevenLabsAdapter;

  beforeEach(() => {
    adapter = new ElevenLabsAdapter('fake-api-key');
  });

  it('should initialize with API key', () => {
    expect(() => new ElevenLabsAdapter('test-key')).not.toThrow();
  });

  it('should throw if API key is empty', () => {
    expect(() => new ElevenLabsAdapter('')).toThrow('ElevenLabs API key is required');
  });

  it('should stream MP3 audio chunks from ElevenLabs WebSocket', async () => {
    const text = 'Hello world';
    const config = { voice: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_turbo_v2' };

    // This will fail until we implement the adapter
    const chunks = [];
    for await (const chunk of adapter.streamSpeech(text, config)) {
      chunks.push(chunk);
      if (chunks.length >= 3) break; // Get first 3 chunks
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].format).toBe('mp3');
    expect(chunks[0].sampleRate).toBe(24000); // ElevenLabs default
  });

  it('should handle ElevenLabs quota exceeded errors', async () => {
    const text = 'Test';
    const config = { voice: '21m00Tcm4TlvDq8ikWAM', model: 'eleven_turbo_v2' };

    // Will test when implemented with mocked quota error
    await expect(async () => {
      for await (const _chunk of adapter.streamSpeech(text, config)) {
        // Should throw quota error
      }
    }).rejects.toThrow();
  });
});
