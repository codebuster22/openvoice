import { ElevenLabsClient, stream } from 'elevenlabs-node';
import { ITTSProvider, TTSConfig } from './ITTSProvider';
import { AudioChunk } from '@types/AudioChunk';

/**
 * ElevenLabsAdapter - ElevenLabs Text-to-Speech Provider Implementation
 *
 * Uses ElevenLabs streaming API for real-time audio generation
 * Outputs MP3 audio at 24kHz (ElevenLabs default)
 */
export class ElevenLabsAdapter implements ITTSProvider {
  private client: ElevenLabsClient;

  constructor(private apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('ElevenLabs API key is required');
    }
    this.client = new ElevenLabsClient({ apiKey });
  }

  /**
   * Stream audio chunks from text
   */
  async *streamSpeech(text: string, config: TTSConfig): AsyncIterableIterator<AudioChunk> {
    try {
      // Use ElevenLabs streaming API
      const audioStream = await this.client.textToSpeech.convert(config.voice, {
        text,
        model_id: config.model || 'eleven_turbo_v2', // Fast model
        voice_settings: {
          stability: config.stability ?? 0.5,
          similarity_boost: config.similarityBoost ?? 0.75,
        },
      });

      // Stream audio chunks
      // ElevenLabs returns MP3 data in chunks
      for await (const chunk of audioStream) {
        yield {
          data: Buffer.from(chunk),
          format: 'mp3',
          sampleRate: 24000, // ElevenLabs default
        };
      }
    } catch (error: any) {
      // Handle ElevenLabs-specific errors
      if (error.status === 401 || error.statusCode === 401) {
        throw new Error('Invalid ElevenLabs API key');
      } else if (error.status === 429 || error.statusCode === 429) {
        throw new Error('ElevenLabs quota exceeded');
      } else if (error.status === 404 || error.statusCode === 404) {
        throw new Error(`Invalid voice ID: ${config.voice}`);
      } else {
        throw new Error(`ElevenLabs TTS failed: ${error.message}`);
      }
    }
  }
}
