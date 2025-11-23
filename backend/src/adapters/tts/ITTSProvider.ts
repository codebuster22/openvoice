import { AudioChunk } from '@types/AudioChunk';

/**
 * TTS Provider Configuration
 */
export interface TTSConfig {
  voice: string; // Voice ID or name (provider-specific)
  model?: string; // e.g., 'eleven_turbo_v2', 'tts-1-hd'
  stability?: number; // Voice stability (0.0-1.0, ElevenLabs specific)
  similarityBoost?: number; // Voice clarity (0.0-1.0, ElevenLabs specific)
  [key: string]: unknown; // Allow provider-specific config
}

/**
 * ITTSProvider - Interface for Text-to-Speech providers
 *
 * All TTS providers (ElevenLabs, Azure, OpenAI TTS, etc.) must implement this interface.
 * Follows Constitution Principle III: Provider Abstraction
 */
export interface ITTSProvider {
  /**
   * Stream audio chunks from text
   *
   * @param text - Text to convert to speech
   * @param config - Voice and model configuration
   * @returns Async iterator yielding AudioChunk objects
   *
   * @throws Error if API fails, quota exceeded, or authentication fails
   *
   * Example:
   * ```typescript
   * const audioChunks: Buffer[] = [];
   *
   * for await (const chunk of provider.streamSpeech('Hello world', config)) {
   *   audioChunks.push(chunk.data);
   * }
   *
   * const fullAudio = Buffer.concat(audioChunks);
   * ```
   */
  streamSpeech(text: string, config: TTSConfig): AsyncIterableIterator<AudioChunk>;
}
