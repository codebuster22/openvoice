/**
 * Configuration - User's API credentials and preferences for a session
 *
 * Provided by user via web UI at conversation start.
 * Validated before creating session.
 */
export interface Configuration {
  // Provider API Keys
  deepgramApiKey: string;
  openaiApiKey: string;
  elevenLabsApiKey: string;

  // Model Selection
  model: 'gpt-4-turbo' | 'gpt-4' | 'gpt-3.5-turbo';

  // Voice Selection
  voice: string; // ElevenLabs voice ID or name

  // System Prompt
  systemPrompt: string;
}

/**
 * Validate configuration has all required fields
 */
export function validateConfiguration(config: Partial<Configuration>): string[] {
  const errors: string[] = [];

  if (!config.deepgramApiKey || config.deepgramApiKey.trim() === '') {
    errors.push('Deepgram API key is required');
  }

  if (!config.openaiApiKey || config.openaiApiKey.trim() === '') {
    errors.push('OpenAI API key is required');
  }

  if (!config.elevenLabsApiKey || config.elevenLabsApiKey.trim() === '') {
    errors.push('ElevenLabs API key is required');
  }

  if (!config.model) {
    errors.push('Model selection is required');
  } else if (!['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'].includes(config.model)) {
    errors.push('Invalid model selection');
  }

  if (!config.voice || config.voice.trim() === '') {
    errors.push('Voice selection is required');
  }

  if (!config.systemPrompt || config.systemPrompt.trim() === '') {
    errors.push('System prompt is required');
  }

  return errors;
}
