import { TurnDetector } from '@domain/TurnDetector';

/** T012: TurnDetector pause detection test */
describe('TurnDetector', () => {
  it('should detect turn complete after 1s silence', () => {
    const detector = new TurnDetector({ silenceThreshold: 1000 });

    detector.addTranscript('Hello', false, Date.now());
    detector.addTranscript('Hello world', false, Date.now() + 500);

    // After 1s silence
    const isComplete = detector.isComplete(Date.now() + 1500);
    expect(isComplete).toBe(true);
  });

  it('should NOT detect turn complete before silence threshold', () => {
    const detector = new TurnDetector({ silenceThreshold: 1000 });

    detector.addTranscript('Hello', false, Date.now());

    // Only 500ms passed
    const isComplete = detector.isComplete(Date.now() + 500);
    expect(isComplete).toBe(false);
  });
});
