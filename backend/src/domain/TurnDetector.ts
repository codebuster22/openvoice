/**
 * TurnDetector - Detects when user has finished speaking
 *
 * Uses silence duration to determine turn completion.
 * Principle: If user hasn't spoken for X milliseconds, turn is complete.
 */
export class TurnDetector {
  private lastTranscriptTime: number = 0;
  private silenceThreshold: number;

  constructor(config: { silenceThreshold: number }) {
    this.silenceThreshold = config.silenceThreshold; // milliseconds
  }

  /**
   * Add a transcript chunk to track speech timing
   */
  addTranscript(text: string, isFinal: boolean, timestamp: number): void {
    if (text.trim() !== '') {
      this.lastTranscriptTime = timestamp;
    }
  }

  /**
   * Check if turn is complete (user stopped speaking)
   *
   * @param currentTime - Current timestamp to compare against last speech
   * @returns true if silence duration exceeds threshold
   */
  isComplete(currentTime: number): boolean {
    if (this.lastTranscriptTime === 0) {
      return false; // No speech yet
    }

    const silenceDuration = currentTime - this.lastTranscriptTime;
    return silenceDuration >= this.silenceThreshold;
  }

  /**
   * Reset detector for new turn
   */
  reset(): void {
    this.lastTranscriptTime = 0;
  }
}
