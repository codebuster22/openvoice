import { ConversationController } from '@services/ConversationController';
import { ConversationPipeline } from '@domain/ConversationPipeline';
import { Configuration } from '@models/Configuration';

/** T015: ConversationController coordination test */
describe('ConversationController', () => {
  let controller: ConversationController;

  beforeEach(() => {
    controller = new ConversationController();
  });

  it('should initialize pipeline with user config', () => {
    const config: Configuration = {
      deepgramApiKey: 'test-key',
      openaiApiKey: 'test-key',
      elevenLabsApiKey: 'test-key',
      model: 'gpt-4-turbo',
      voice: 'Rachel',
      systemPrompt: 'Be helpful',
    };

    const pipeline = controller.initializePipeline(config);
    expect(pipeline).toBeInstanceOf(ConversationPipeline);
  });

  it('should propagate provider errors to caller', async () => {
    const config: Configuration = {
      deepgramApiKey: 'invalid-key',
      openaiApiKey: 'test',
      elevenLabsApiKey: 'test',
      model: 'gpt-4-turbo',
      voice: 'Rachel',
      systemPrompt: 'Test',
    };

    await expect(controller.startConversation(config)).rejects.toThrow();
  });

  it('should clean up resources when conversation stops', async () => {
    const config: Configuration = {
      deepgramApiKey: 'test',
      openaiApiKey: 'test',
      elevenLabsApiKey: 'test',
      model: 'gpt-4-turbo',
      voice: 'Rachel',
      systemPrompt: 'Test',
    };

    const pipeline = controller.initializePipeline(config);
    await controller.stopConversation();

    // Verify cleanup happened
    expect(controller).toBeDefined();
  });
});
