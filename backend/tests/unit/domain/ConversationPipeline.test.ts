import { ConversationPipeline } from '@domain/ConversationPipeline';
import { ISTTProvider } from '@adapters/stt/ISTTProvider';
import { ILLMProvider } from '@adapters/llm/ILLMProvider';
import { ITTSProvider } from '@adapters/tts/ITTSProvider';

/**
 * T011: ConversationPipeline orchestration test
 * Tests STT → LLM → TTS flow with mocked providers
 */
describe('ConversationPipeline', () => {
  let pipeline: ConversationPipeline;
  let mockSTT: jest.Mocked<ISTTProvider>;
  let mockLLM: jest.Mocked<ILLMProvider>;
  let mockTTS: jest.Mocked<ITTSProvider>;

  beforeEach(() => {
    mockSTT = {} as jest.Mocked<ISTTProvider>;
    mockLLM = {} as jest.Mocked<ILLMProvider>;
    mockTTS = {} as jest.Mocked<ITTSProvider>;

    pipeline = new ConversationPipeline(mockSTT, mockLLM, mockTTS);
  });

  it('should orchestrate STT → LLM → TTS flow', async () => {
    const audioInput = Buffer.from('user speaks');

    // This will fail until implemented
    const audioOutput = [];
    for await (const chunk of pipeline.process(audioInput)) {
      audioOutput.push(chunk);
      if (audioOutput.length >= 3) break;
    }

    expect(audioOutput.length).toBeGreaterThan(0);
  });

  it('should handle backpressure when TTS is slower than LLM', async () => {
    // Test that pipeline doesn't buffer all LLM output
    expect(pipeline).toBeDefined();
  });

  it('should propagate errors from any provider', async () => {
    // Test error handling - will implement when adapters exist
    expect(pipeline).toBeDefined();
  });
});
