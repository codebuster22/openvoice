import { TranscriptBuffer } from '@domain/TranscriptBuffer';
import { Message } from '@models/Message';

/** T013: TranscriptBuffer state management test */
describe('TranscriptBuffer', () => {
  it('should maintain ordered message history', () => {
    const buffer = new TranscriptBuffer();

    buffer.addMessage('user', 'Hello');
    buffer.addMessage('assistant', 'Hi there!');
    buffer.addMessage('user', 'How are you?');

    const messages = buffer.getMessages();
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
    expect(messages[2].role).toBe('user');
  });

  it('should format messages for LLM API', () => {
    const buffer = new TranscriptBuffer();
    buffer.addMessage('user', 'Test');

    const formatted = buffer.getFormattedForLLM();
    expect(formatted).toEqual([{ role: 'user', content: 'Test' }]);
  });
});
