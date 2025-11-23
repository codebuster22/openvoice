/**
 * AudioChunk - A piece of generated audio from text-to-speech
 *
 * @property data - Audio data buffer (format-specific bytes)
 * @property format - Audio format (mp3, pcm, opus)
 * @property sampleRate - Sample rate in Hz (e.g., 24000, 16000)
 */
export interface AudioChunk {
  data: Buffer;
  format: 'mp3' | 'pcm' | 'opus';
  sampleRate: number;
}
