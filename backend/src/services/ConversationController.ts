import { ConversationPipeline } from '@domain/ConversationPipeline';
import { DeepgramAdapter } from '@adapters/stt/DeepgramAdapter';
import { OpenAIAdapter } from '@adapters/llm/OpenAIAdapter';
import { ElevenLabsAdapter } from '@adapters/tts/ElevenLabsAdapter';
import { Configuration } from '@models/Configuration';

/**
 * ConversationController - Coordinates conversation lifecycle
 *
 * Responsibilities:
 * - Initialize pipeline with user configuration
 * - Create provider adapters with API keys
 * - Manage pipeline lifecycle (start/stop)
 * - Error propagation and cleanup
 *
 * Application layer service
 */
export class ConversationController {
  private pipeline: ConversationPipeline | null = null;
  private sttProvider: DeepgramAdapter | null = null;
  private llmProvider: OpenAIAdapter | null = null;
  private ttsProvider: ElevenLabsAdapter | null = null;

  /**
   * Initialize conversation pipeline with user config
   *
   * Creates provider adapters using user's API keys
   * @throws Error if provider initialization fails (invalid keys, etc.)
   */
  initializePipeline(config: Configuration): ConversationPipeline {
    try {
      // Create provider adapters with user's API keys
      this.sttProvider = new DeepgramAdapter(config.deepgramApiKey);
      this.llmProvider = new OpenAIAdapter(config.openaiApiKey);
      this.ttsProvider = new ElevenLabsAdapter(config.elevenLabsApiKey);

      // Create pipeline with providers and system prompt
      this.pipeline = new ConversationPipeline(
        this.sttProvider,
        this.llmProvider,
        this.ttsProvider,
        config.systemPrompt
      );

      return this.pipeline;
    } catch (error: any) {
      // Cleanup on failure
      this.cleanup();
      throw new Error(`Failed to initialize conversation: ${error.message}`);
    }
  }

  /**
   * Get current pipeline instance
   */
  getPipeline(): ConversationPipeline | null {
    return this.pipeline;
  }

  /**
   * Start conversation (placeholder for future connection handling)
   * @throws Error if pipeline not initialized or provider fails
   */
  async startConversation(config: Configuration): Promise<ConversationPipeline> {
    if (!this.pipeline) {
      this.initializePipeline(config);
    }

    if (!this.pipeline) {
      throw new Error('Failed to create conversation pipeline');
    }

    return this.pipeline;
  }

  /**
   * Stop conversation and clean up resources
   */
  async stopConversation(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Clean up provider connections and pipeline
   */
  private async cleanup(): Promise<void> {
    try {
      // Stop STT streaming if active
      if (this.sttProvider) {
        await this.sttProvider.stopStream();
      }

      // Clear references
      this.sttProvider = null;
      this.llmProvider = null;
      this.ttsProvider = null;
      this.pipeline = null;
    } catch (error) {
      console.error('Cleanup error:', error);
      // Continue cleanup even if one provider fails
    }
  }

  /**
   * Get conversation transcript (if pipeline exists)
   */
  getTranscript() {
    return this.pipeline?.getTranscript() || [];
  }
}
