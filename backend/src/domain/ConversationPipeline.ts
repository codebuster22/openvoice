import { ISTTProvider } from '@adapters/stt/ISTTProvider';
import { ILLMProvider } from '@adapters/llm/ILLMProvider';
import { ITTSProvider } from '@adapters/tts/ITTSProvider';
import { AudioChunk } from '@types/AudioChunk';
import { TranscriptBuffer } from './TranscriptBuffer';
import { TurnDetector } from './TurnDetector';

/**
 * ConversationPipeline - Orchestrates STT → LLM → TTS flow
 *
 * Core domain logic that coordinates:
 * 1. User speaks → STT transcription
 * 2. Turn detection (pause) → triggers LLM
 * 3. LLM generates response → TTS synthesis
 * 4. Audio chunks returned to caller
 *
 * Follows Constitution Principle II: Streaming-First Design
 */
export class ConversationPipeline {
  private transcriptBuffer: TranscriptBuffer;
  private turnDetector: TurnDetector;

  constructor(
    private sttProvider: ISTTProvider,
    private llmProvider: ILLMProvider,
    private ttsProvider: ITTSProvider,
    private systemPrompt: string = 'You are a helpful AI assistant.'
  ) {
    this.transcriptBuffer = new TranscriptBuffer();
    this.turnDetector = new TurnDetector({ silenceThreshold: 1000 }); // 1s default

    // Add system prompt to transcript
    this.transcriptBuffer.addMessage('system', systemPrompt);
  }

  /**
   * Process audio input through full pipeline
   *
   * Flow:
   * 1. Stream audio → STT
   * 2. Detect turn completion
   * 3. Send transcript → LLM
   * 4. Stream LLM response → TTS
   * 5. Yield audio chunks
   *
   * @param audioInput - User's speech audio (PCM 16-bit 16kHz)
   * @returns Async iterator of audio chunks (AI response)
   */
  async *process(audioInput: Buffer): AsyncIterableIterator<AudioChunk> {
    // Step 1: STT - Transcribe user speech
    let userTranscript = '';
    const sttConfig = {
      language: 'en',
      model: 'general',
      punctuate: true,
      endpointing: 1000,
    };

    for await (const transcriptChunk of this.sttProvider.startStream(audioInput, sttConfig)) {
      this.turnDetector.addTranscript(
        transcriptChunk.text,
        transcriptChunk.isFinal,
        transcriptChunk.timestamp
      );

      if (transcriptChunk.isFinal) {
        userTranscript = transcriptChunk.text;
        break; // Got final transcript, move to LLM
      }
    }

    // Add user message to transcript buffer
    if (userTranscript.trim() !== '') {
      this.transcriptBuffer.addMessage('user', userTranscript);
    }

    // Step 2: LLM - Generate response
    const messages = this.transcriptBuffer.getMessages();
    const llmConfig = {
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 150,
    };

    let aiResponseText = '';

    for await (const textChunk of this.llmProvider.streamCompletion(messages, llmConfig)) {
      if (!textChunk.isDone) {
        aiResponseText += textChunk.text;

        // Step 3: TTS - Stream text to speech
        // Start TTS immediately as LLM chunks arrive (low latency!)
        const ttsConfig = {
          voice: '21m00Tcm4TlvDq8ikWAM', // Rachel (default)
          model: 'eleven_turbo_v2',
        };

        for await (const audioChunk of this.ttsProvider.streamSpeech(
          textChunk.text,
          ttsConfig
        )) {
          yield audioChunk; // Stream audio to caller immediately
        }
      }
    }

    // Add AI response to transcript buffer
    if (aiResponseText.trim() !== '') {
      this.transcriptBuffer.addMessage('assistant', aiResponseText);
    }

    // Reset turn detector for next turn
    this.turnDetector.reset();
  }

  /**
   * Get conversation transcript
   */
  getTranscript(): ReturnType<typeof this.transcriptBuffer.getMessages> {
    return this.transcriptBuffer.getMessages();
  }

  /**
   * Clear conversation history
   */
  reset(): void {
    this.transcriptBuffer.clear();
    this.transcriptBuffer.addMessage('system', this.systemPrompt);
    this.turnDetector.reset();
  }
}
