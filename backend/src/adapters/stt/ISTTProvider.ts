import { TranscriptChunk } from '@types/TranscriptChunk';

/**
 * STT Provider Configuration
 */
export interface STTConfig {
  language?: string;
  model?: string;
  punctuate?: boolean;
  endpointing?: number; // Silence threshold in milliseconds
  [key: string]: unknown; // Allow provider-specific config
}

/**
 * ISTTProvider - Interface for Speech-to-Text providers
 *
 * All STT providers (Deepgram, Whisper, AssemblyAI, etc.) must implement this interface.
 * Follows Constitution Principle III: Provider Abstraction
 */
export interface ISTTProvider {
  /**
   * Start streaming transcription
   *
   * @param audioStream - Audio data buffer (PCM 16-bit, 16kHz recommended)
   * @param config - Provider-specific configuration
   * @returns Async iterator yielding TranscriptChunk objects
   *
   * @throws Error if connection fails or authentication fails
   *
   * Example:
   * ```typescript
   * for await (const chunk of provider.startStream(audioBuffer, config)) {
   *   console.log(chunk.text, chunk.isFinal);
   * }
   * ```
   */
  startStream(audioStream: Buffer, config: STTConfig): AsyncIterableIterator<TranscriptChunk>;

  /**
   * Stop the streaming connection gracefully
   * Should close WebSocket/HTTP connections and clean up resources
   *
   * @returns Promise that resolves when cleanup is complete
   */
  stopStream(): Promise<void>;
}
