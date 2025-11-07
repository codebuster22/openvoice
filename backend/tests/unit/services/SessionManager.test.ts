import { SessionManager } from '@services/SessionManager';
import { Configuration } from '@models/Configuration';

/** T014: SessionManager lifecycle test */
describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it('should create session with unique ID', () => {
    const config: Configuration = {
      deepgramApiKey: 'test',
      openaiApiKey: 'test',
      elevenLabsApiKey: 'test',
      model: 'gpt-4-turbo',
      voice: 'Rachel',
      systemPrompt: 'You are helpful',
    };

    const session1 = manager.createSession(config);
    const session2 = manager.createSession(config);

    expect(session1.id).not.toBe(session2.id);
  });

  it('should transition states: idle → listening → processing → speaking', () => {
    const config: Configuration = {
      deepgramApiKey: 'test',
      openaiApiKey: 'test',
      elevenLabsApiKey: 'test',
      model: 'gpt-4-turbo',
      voice: 'Rachel',
      systemPrompt: 'Test',
    };

    const session = manager.createSession(config);
    expect(session.state).toBe('idle');

    manager.transitionState(session.id, 'listening');
    expect(manager.getSession(session.id)?.state).toBe('listening');

    manager.transitionState(session.id, 'processing');
    expect(manager.getSession(session.id)?.state).toBe('processing');
  });

  it('should destroy session and clean up resources', () => {
    const config: Configuration = {
      deepgramApiKey: 'test',
      openaiApiKey: 'test',
      elevenLabsApiKey: 'test',
      model: 'gpt-4-turbo',
      voice: 'Rachel',
      systemPrompt: 'Test',
    };

    const session = manager.createSession(config);
    manager.destroySession(session.id);

    expect(manager.getSession(session.id)).toBeUndefined();
  });
});
