import { test, expect } from '@playwright/test';

test.describe('Ghostwriter Studio End-to-End Workflow', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.canvas-viewport', { timeout: 10000 });
  });

  test('1. Studio Canvas renders with default tree and nodes', async ({ page }) => {
    const nodes = page.locator('.node-card');
    await expect(nodes).toHaveCount(4);
    await expect(page.locator('.brand-title')).toContainText('GHOSTWRITER');
  });

  test('2. Fresh Story creation provides an empty, clean Lore Bible', async ({ page }) => {
    // Click New Story button
    await page.locator('button.btn-new-story').click();
    await page.waitForTimeout(400);

    // Node count should reset to 1
    const nodes = page.locator('.node-card');
    await expect(nodes).toHaveCount(1);

    // Inspector should show 0 lore entities
    const loreTab = page.locator('.tab-btn:has-text("Lore Bible")');
    await expect(loreTab).toContainText('Lore Bible (0)');

    // Click Lore Bible tab to verify empty state prompt
    await loreTab.click();
    await expect(page.locator('.lore-empty-card')).toBeVisible();
    await expect(page.locator('.lore-empty-card h5')).toHaveText('No Lore Entities Yet');
  });

  test('3. AI Lore Extraction discovers characters and saves to Lore Bible', async ({ page }) => {
    // Create new story
    await page.locator('button.btn-new-story').click();
    await page.waitForTimeout(400);

    // Type opening scene
    const editor = page.locator('.textarea-content');
    await editor.fill('Shawn adjusted his glider goggles as the airship docked at the floating sky city of Aethelgard.');

    // Click extract lore
    await page.locator('.btn-extract-lore').click();
    await expect(page.locator('.lore-modal-card')).toBeVisible();
    await expect(page.locator('.modal-header h2')).toContainText('AI World Lore & Character Bible');

    // Confirm addition
    await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
    await page.waitForTimeout(400);

    // Verify lore bible has the extracted entities
    const loreTab = page.locator('.tab-btn:has-text("Lore Bible")');
    await expect(loreTab).toContainText('Lore Bible (2)');
  });

  test('4. Reader Mode supports theme switching and reading controls', async ({ page }) => {
    // Switch to Reader Mode
    await page.locator('button:has-text("📖 Reader")').click();
    await expect(page.locator('.reader-viewport')).toBeVisible();

    // Check default dark slate theme
    await expect(page.locator('.reader-viewport')).toHaveAttribute('data-theme', 'DARK_SLATE');

    // Switch to Warm Sepia theme
    await page.locator('.dot-sepia').click();
    await expect(page.locator('.reader-viewport')).toHaveAttribute('data-theme', 'WARM_SEPIA');

    // Switch to OLED Black theme
    await page.locator('.dot-oled').click();
    await expect(page.locator('.reader-viewport')).toHaveAttribute('data-theme', 'OLED_BLACK');

    // Open Table of Contents
    await page.locator('.btn-toc').click();
    await expect(page.locator('.toc-drawer')).toBeVisible();

    // Close Table of Contents
    await page.locator('.btn-close-toc').click();
    await expect(page.locator('.toc-drawer')).not.toBeVisible();

    // Return to Studio Canvas
    await page.locator('.btn-back').click();
    await expect(page.locator('.canvas-viewport')).toBeVisible();
  });
});
