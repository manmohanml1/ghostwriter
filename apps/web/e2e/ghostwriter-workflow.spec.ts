import { test, expect } from '@playwright/test';

test.describe('Ghostwriter Studio browser integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.canvas-viewport')).toBeVisible();
  });

  test('renders the real starter narrative graph', async ({ page }) => {
    await expect(page.locator('.brand-title')).toHaveText('Ghostwriter');
    await expect(page.locator('.node-card')).toHaveCount(3);
    await expect(page.locator('.textarea-content')).toBeVisible();
  });

  test('creates, branches, and persists a local story through a reload', async ({ page }) => {
    const title = 'Integration Test Universe';

    await page.locator('.logo-icon').click();
    await page.getByRole('button', { name: /new story from scratch/i }).click();
    await expect(page.getByRole('heading', { name: /create new story universe/i })).toBeVisible();

    await page.locator('.new-story-card .field-input').first().fill(title);
    await page.getByRole('button', { name: /create story with/i }).click();

    await expect(page.locator('.story-title-text')).toHaveText(title);
    await expect(page.locator('.node-card')).toHaveCount(1);

    await page.locator('.btn-add-branch').click();
    await page.locator('.input-branch-title').fill('A deliberate alternate path');
    await page.locator('.textarea-branch-content').fill('The protagonist chooses the unfamiliar road.');
    await page.getByRole('button', { name: 'Create Branch' }).click();
    await expect(page.locator('.node-card')).toHaveCount(2);

    await page.reload();
    await expect(page.locator('.story-title-text')).toHaveText(title);
    await expect(page.locator('.node-card')).toHaveCount(2);
  });

  test('switches between studio canvas and reader mode', async ({ page }) => {
    await page.getByRole('button', { name: /reader mode/i }).click();
    await expect(page.locator('.reader-viewport')).toBeVisible();

    await page.locator('.btn-back').click();
    await expect(page.locator('.canvas-viewport')).toBeVisible();
  });
});
