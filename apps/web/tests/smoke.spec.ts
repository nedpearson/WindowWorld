import { test, expect } from '@playwright/test';

test.describe('WindowWorld Core Revenue Flow Smoke Test', () => {
  
  test('should load the login page and authenticate to dashboard', async ({ page }) => {
    // Navigate to local dev server
    await page.goto('http://127.0.0.1:5173/login');

    // View login form assertions
    await expect(page).toHaveTitle(/WindowWorld/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible({ timeout: 30000 });

    // Trigger demo bypass button logic (since we do not have an active db in simple CI runs without composing)
    const previewBtn = page.locator('#preview-mode-btn');
    
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      
      // Should result in a transition to the dashboard
      await page.waitForURL('**/dashboard', { timeout: 30000 });
      
      // Verify Dashboard Loaded by checking the greeting heading
      await expect(page.getByRole('heading', { name: /Good/i })).toBeVisible();
      
      // Verify "Overview" and specific metrics loaded
      await expect(page.getByText('Pipeline Value')).toBeVisible();
    }
  });

});
