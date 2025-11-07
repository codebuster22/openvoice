import { ISTTProvider } from '@adapters/stt/ISTTProvider';
import { TranscriptChunk } from '@types/TranscriptChunk';

/**
 * Contract test for STT Provider Interface
 * This test defines the expected behavior of ALL STT providers
 * Must be implemented by: Deepgram, Whisper, AssemblyAI, etc.
 */
describe('ISTTProvider Contract', () => {
  let provider: ISTTProvider;

  beforeEach(() => {
    // This will fail until we create a concrete implementation
    // For now, we're testing the interface contract
    provider = {} as ISTTProvider;
  });

  describe('startStream()', () => {
    it('should return an async iterator of TranscriptChunk', async () => {
      const mockAudioStream = Buffer.from('mock audio data');
      const config = { language: 'en', model: 'general' };

      const streamIterator = provider.startStream(mockAudioStream, config);

      expect(streamIterator).toBeDefined();
      expect(typeof streamIterator[Symbol.asyncIterator]).toBe('function');
    });

    it('should yield interim transcripts with isFinal=false', async () => {
      // Mock streaming behavior
      const mockAudioStream = Buffer.from('test audio');
      const config = { language: 'en', model: 'general' };

      const chunks: TranscriptChunk[] = [];
      for await (const chunk of provider.startStream(mockAudioStream, config)) {
        chunks.push(chunk);
        if (chunks.length >= 3) break; // Get first 3 chunks
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.some((c) => !c.isFinal)).toBe(true);
    });

    it('should yield final transcript with isFinal=true when user stops speaking', async () => {
      const mockAudioStream = Buffer.from('complete sentence audio');
      const config = { language: 'en', model: 'general' };

      const chunks: TranscriptChunk[] = [];
      for await (const chunk of provider.startStream(mockAudioStream, config)) {
        chunks.push(chunk);
        if (chunk.isFinal) break;
      }

      const finalChunk = chunks.find((c) => c.isFinal);
      expect(finalChunk).toBeDefined();
      expect(finalChunk?.text).toBeTruthy();
      expect(finalChunk?.timestamp).toBeGreaterThan(0);
    });

    it('should throw error if stream fails', async () => {
      const invalidStream = null as unknown as Buffer;
      const config = { language: 'en', model: 'general' };

      await expect(async () => {
        for await (const _chunk of provider.startStream(invalidStream, config)) {
          // Should not reach here
        }
      }).rejects.toThrow();
    });
  });

  describe('stopStream()', () => {
    it('should gracefully close the streaming connection', async () => {
      await expect(provider.stopStream()).resolves.not.toThrow();
    });

    it('should stop yielding chunks after stopStream() is called', async () => {
      const mockAudioStream = Buffer.from('long audio stream');
      const config = { language: 'en', model: 'general' };

      const streamIterator = provider.startStream(mockAudioStream, config);

      // Get first chunk
      const { value: firstChunk } = await streamIterator.next();
      expect(firstChunk).toBeDefined();

      // Stop stream
      await provider.stopStream();

      // Try to get next chunk - should complete
      const { done } = await streamIterator.next();
      expect(done).toBe(true);
    });
  });

  describe('TranscriptChunk format', () => {
    it('should have required fields: text, isFinal, timestamp', async () => {
      const mockAudioStream = Buffer.from('test');
      const config = { language: 'en', model: 'general' };

      const { value: chunk } = await provider.startStream(mockAudioStream, config).next();

      expect(chunk).toHaveProperty('text');
      expect(chunk).toHaveProperty('isFinal');
      expect(chunk).toHaveProperty('timestamp');

      expect(typeof chunk.text).toBe('string');
      expect(typeof chunk.isFinal).toBe('boolean');
      expect(typeof chunk.timestamp).toBe('number');
    });
  });
});
