import { test, expect } from '@playwright/test';

/** T018: Playwright E2E conversation test */
test.describe('Voice Conversation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
  });

  test('should complete full conversation workflow', async ({ page }) => {
    // Fill configuration
    await page.fill('[data-testid="deepgram-api-key"]', 'test-key');
    await page.fill('[data-testid="openai-api-key"]', 'test-key');
    await page.fill('[data-testid="elevenlabs-api-key"]', 'test-key');

    // Select model and voice
    await page.selectOption('[data-testid="model-select"]', 'gpt-4-turbo');
    await page.selectOption('[data-testid="voice-select"]', 'Rachel');

    // System prompt
    await page.fill('[data-testid="system-prompt"]', 'You are a helpful assistant');

    // Start conversation
    await page.click('[data-testid="start-button"]');

    // Check status indicator
    await expect(page.locator('[data-testid="status"]')).toContainText('Listening');

    // Stop conversation
    await page.click('[data-testid="stop-button"]');

    // Verify transcript exists
    const transcript = page.locator('[data-testid="transcript"]');
    await expect(transcript).toBeVisible();
  });

  test('should show transcript messages', async ({ page }) => {
    // This will be implemented when frontend exists
    expect(true).toBe(true);
  });
});
