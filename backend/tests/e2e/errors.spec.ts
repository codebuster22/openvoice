import { test, expect } from '@playwright/test';

/** T019: Playwright E2E error handling test */
test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
  });

  test('should show error for missing API keys', async ({ page }) => {
    // Leave fields empty
    await page.click('[data-testid="start-button"]');

    // Check for validation error
    const errorMsg = page.locator('[data-testid="error-message"]');
    await expect(errorMsg).toContainText('Please fill in all required API credentials');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="deepgram-api-key"]', 'invalid-key');
    await page.fill('[data-testid="openai-api-key"]', 'invalid-key');
    await page.fill('[data-testid="elevenlabs-api-key"]', 'invalid-key');

    await page.selectOption('[data-testid="model-select"]', 'gpt-4-turbo');
    await page.selectOption('[data-testid="voice-select"]', 'Rachel');

    await page.click('[data-testid="start-button"]');

    // Should show auth error
    const errorMsg = page.locator('[data-testid="error-message"]');
    await expect(errorMsg).toContainText(/invalid|authentication|credentials/i);
  });
});
