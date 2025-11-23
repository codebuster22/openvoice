/**
 * TextChunk - A piece of streamed text from LLM completion
 *
 * @property text - The generated text content
 * @property isDone - Whether this is the final chunk (completion finished)
 */
export interface TextChunk {
  text: string;
  isDone: boolean;
}
