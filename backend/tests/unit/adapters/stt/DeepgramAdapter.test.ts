import { DeepgramAdapter } from '@adapters/stt/DeepgramAdapter';
import { TranscriptChunk } from '@types/TranscriptChunk';

/**
 * Unit test for Deepgram STT Adapter
 * Mocks Deepgram SDK WebSocket to test streaming behavior
 */
describe('DeepgramAdapter', () => {
  let adapter: DeepgramAdapter;
  let mockDeepgramClient: jest.Mocked<any>;

  beforeEach(() => {
    // Mock Deepgram SDK
    mockDeepgramClient = {
      listen: {
        live: jest.fn().mockReturnValue({
          on: jest.fn(),
          send: jest.fn(),
          finish: jest.fn(),
        }),
      },
    };

    adapter = new DeepgramAdapter('fake-api-key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(() => new DeepgramAdapter('test-key')).not.toThrow();
    });

    it('should throw error if API key is empty', () => {
      expect(() => new DeepgramAdapter('')).toThrow('Deepgram API key is required');
    });
  });

  describe('startStream()', () => {
    it('should establish WebSocket connection to Deepgram', async () => {
      const audioBuffer = Buffer.from('audio data');
      const config = {
        language: 'en',
        model: 'general',
        punctuate: true,
        endpointing: 1000, // 1s silence detection
      };

      const streamIterator = adapter.startStream(audioBuffer, config);

      // Start consuming stream
      const firstChunk = await streamIterator.next();

      expect(mockDeepgramClient.listen.live).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
          model: 'general',
          punctuate: true,
          endpointing: 1000,
          encoding: 'linear16',
          sample_rate: 16000,
        })
      );
    });

    it('should yield interim transcript chunks', async () => {
      const audioBuffer = Buffer.from('hello world audio');
      const config = { language: 'en', model: 'general' };

      // Mock Deepgram WebSocket messages
      const mockConnection = {
        on: jest.fn((event, handler) => {
          if (event === 'transcriptReceived') {
            // Simulate interim transcripts
            setTimeout(() => handler({ is_final: false, channel: { alternatives: [{ transcript: 'hello' }] } }), 10);
            setTimeout(() => handler({ is_final: false, channel: { alternatives: [{ transcript: 'hello world' }] } }), 20);
          }
        }),
        send: jest.fn(),
        finish: jest.fn(),
      };

      mockDeepgramClient.listen.live.mockReturnValue(mockConnection);

      const chunks: TranscriptChunk[] = [];
      for await (const chunk of adapter.startStream(audioBuffer, config)) {
        chunks.push(chunk);
        if (chunks.length >= 2) break;
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].text).toBe('hello');
      expect(chunks[0].isFinal).toBe(false);
      expect(chunks[1].text).toBe('hello world');
      expect(chunks[1].isFinal).toBe(false);
    });

    it('should yield final transcript when endpointing detects pause', async () => {
      const audioBuffer = Buffer.from('complete sentence audio');
      const config = { language: 'en', model: 'general', endpointing: 1000 };

      const mockConnection = {
        on: jest.fn((event, handler) => {
          if (event === 'transcriptReceived') {
            // Simulate final transcript after endpointing
            setTimeout(
              () =>
                handler({
                  is_final: true,
                  speech_final: true,
                  channel: { alternatives: [{ transcript: 'Hello, how are you?' }] },
                }),
              30
            );
          }
        }),
        send: jest.fn(),
        finish: jest.fn(),
      };

      mockDeepgramClient.listen.live.mockReturnValue(mockConnection);

      const chunks: TranscriptChunk[] = [];
      for await (const chunk of adapter.startStream(audioBuffer, config)) {
        chunks.push(chunk);
        if (chunk.isFinal) break;
      }

      const finalChunk = chunks.find((c) => c.isFinal);
      expect(finalChunk).toBeDefined();
      expect(finalChunk?.text).toBe('Hello, how are you?');
      expect(finalChunk?.isFinal).toBe(true);
    });

    it('should handle Deepgram connection errors', async () => {
      const audioBuffer = Buffer.from('audio');
      const config = { language: 'en', model: 'general' };

      const mockConnection = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Deepgram connection failed')), 10);
          }
        }),
        send: jest.fn(),
        finish: jest.fn(),
      };

      mockDeepgramClient.listen.live.mockReturnValue(mockConnection);

      await expect(async () => {
        for await (const _chunk of adapter.startStream(audioBuffer, config)) {
          // Should throw before yielding
        }
      }).rejects.toThrow('Deepgram connection failed');
    });

    it('should handle authentication errors (401)', async () => {
      const audioBuffer = Buffer.from('audio');
      const config = { language: 'en', model: 'general' };

      const mockConnection = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            const authError = new Error('Invalid API key');
            (authError as any).status = 401;
            setTimeout(() => handler(authError), 10);
          }
        }),
        send: jest.fn(),
        finish: jest.fn(),
      };

      mockDeepgramClient.listen.live.mockReturnValue(mockConnection);

      await expect(async () => {
        for await (const _chunk of adapter.startStream(audioBuffer, config)) {
          // Should throw auth error
        }
      }).rejects.toThrow('Invalid API key');
    });
  });

  describe('stopStream()', () => {
    it('should close Deepgram WebSocket connection', async () => {
      const mockConnection = {
        on: jest.fn(),
        send: jest.fn(),
        finish: jest.fn(),
      };

      mockDeepgramClient.listen.live.mockReturnValue(mockConnection);

      // Start stream first
      const audioBuffer = Buffer.from('audio');
      const config = { language: 'en', model: 'general' };
      adapter.startStream(audioBuffer, config);

      // Stop stream
      await adapter.stopStream();

      expect(mockConnection.finish).toHaveBeenCalled();
    });

    it('should be idempotent (can call multiple times)', async () => {
      await adapter.stopStream();
      await expect(adapter.stopStream()).resolves.not.toThrow();
    });
  });

  describe('audio format handling', () => {
    it('should convert PCM audio to correct format for Deepgram', async () => {
      const pcmAudio = Buffer.alloc(1024); // 1KB of PCM data
      const config = { language: 'en', model: 'general' };

      const mockConnection = {
        on: jest.fn(),
        send: jest.fn(),
        finish: jest.fn(),
      };

      mockDeepgramClient.listen.live.mockReturnValue(mockConnection);

      adapter.startStream(pcmAudio, config);

      // Verify audio was sent in correct format
      expect(mockConnection.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });
});
