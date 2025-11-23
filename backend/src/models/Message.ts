/**
 * Message - A single conversational turn in the transcript
 *
 * Represents both user speech (from STT) and assistant responses (from LLM+TTS)
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  audioData?: Buffer; // Only populated for assistant messages (TTS output)
}
