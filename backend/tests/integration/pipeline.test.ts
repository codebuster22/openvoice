import { ConversationPipeline } from '@domain/ConversationPipeline';
import { DeepgramAdapter } from '@adapters/stt/DeepgramAdapter';
import { OpenAIAdapter } from '@adapters/llm/OpenAIAdapter';
import { ElevenLabsAdapter } from '@adapters/tts/ElevenLabsAdapter';
import * as fs from 'fs';
import * as path from 'path';

/** T017: End-to-end pipeline integration test with fixtures */
describe('Full Pipeline Integration', () => {
  it.skip('should process pre-recorded audio through full STT → LLM → TTS flow', async () => {
    // Load test fixture
    const audioFixture = fs.readFileSync(path.join(__dirname, '../fixtures/hello.pcm'));

    const stt = new DeepgramAdapter(process.env.DEEPGRAM_API_KEY || 'test');
    const llm = new OpenAIAdapter(process.env.OPENAI_API_KEY || 'test');
    const tts = new ElevenLabsAdapter(process.env.ELEVENLABS_API_KEY || 'test');

    const pipeline = new ConversationPipeline(stt, llm, tts);

    const audioOutputChunks = [];
    for await (const chunk of pipeline.process(audioFixture)) {
      audioOutputChunks.push(chunk);
      if (audioOutputChunks.length >= 5) break; // Get first 5 chunks
    }

    expect(audioOutputChunks.length).toBeGreaterThan(0);
    expect(audioOutputChunks[0].data).toBeInstanceOf(Buffer);
  });
});
