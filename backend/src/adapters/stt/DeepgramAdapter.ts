import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import { ISTTProvider, STTConfig } from './ISTTProvider';
import { TranscriptChunk } from '@types/TranscriptChunk';

/**
 * DeepgramAdapter - Deepgram Speech-to-Text Provider Implementation
 *
 * Uses Deepgram's streaming WebSocket API for real-time transcription
 * Supports endpointing (automatic silence detection) and interim results
 */
export class DeepgramAdapter implements ISTTProvider {
  private deepgram: ReturnType<typeof createClient>;
  private connection: LiveClient | null = null;

  constructor(private apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Deepgram API key is required');
    }
    this.deepgram = createClient(apiKey);
  }

  /**
   * Start streaming transcription via Deepgram WebSocket
   */
  async *startStream(audioStream: Buffer, config: STTConfig): AsyncIterableIterator<TranscriptChunk> {
    // Establish WebSocket connection to Deepgram
    this.connection = this.deepgram.listen.live({
      language: config.language || 'en',
      model: config.model || 'general',
      punctuate: config.punctuate !== false, // Default true
      endpointing: config.endpointing || 1000, // 1s default silence threshold
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
      interim_results: true, // Enable interim transcripts
    });

    // Queue for transcript chunks (producer-consumer pattern)
    const chunkQueue: TranscriptChunk[] = [];
    let done = false;
    let error: Error | null = null;

    // Handle transcription events
    this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;

      if (transcript && transcript.trim() !== '') {
        const chunk: TranscriptChunk = {
          text: transcript,
          isFinal: data.is_final === true && data.speech_final === true,
          timestamp: Date.now(),
        };
        chunkQueue.push(chunk);
      }
    });

    // Handle errors
    this.connection.on(LiveTranscriptionEvents.Error, (err: any) => {
      error = new Error(err.message || 'Deepgram connection failed');
      if (err.status === 401) {
        error = new Error('Invalid API key');
      }
      done = true;
    });

    // Handle connection close
    this.connection.on(LiveTranscriptionEvents.Close, () => {
      done = true;
    });

    // Send audio data to Deepgram
    // In real implementation, this would stream chunks
    // For MVP, we send the buffer in chunks
    const chunkSize = 1024; // 1KB chunks
    for (let i = 0; i < audioStream.length; i += chunkSize) {
      const chunk = audioStream.slice(i, i + chunkSize);
      this.connection.send(chunk);

      // Small delay to simulate streaming (remove in production)
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Consume chunks as they arrive
    while (!done || chunkQueue.length > 0) {
      if (error) {
        throw error;
      }

      if (chunkQueue.length > 0) {
        const chunk = chunkQueue.shift();
        if (chunk) {
          yield chunk;

          // If final chunk, we're done
          if (chunk.isFinal) {
            done = true;
          }
        }
      } else {
        // Wait for more chunks
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Stop streaming and close connection
   */
  async stopStream(): Promise<void> {
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
    }
  }
}
