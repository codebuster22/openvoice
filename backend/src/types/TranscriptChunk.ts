/**
 * TranscriptChunk - A piece of transcribed text from speech recognition
 *
 * @property text - The transcribed text content
 * @property isFinal - Whether this is the final transcription (vs. interim/partial)
 * @property timestamp - Unix timestamp (ms) when this chunk was generated
 */
export interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  timestamp: number;
}
