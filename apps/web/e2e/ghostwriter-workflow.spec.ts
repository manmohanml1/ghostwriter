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

  test('rejects an oversized chapter and preserves the last saved draft', async ({ page }) => {
    const editor = page.locator('.textarea-content');
    const savedText = await editor.inputValue();

    await editor.fill('x'.repeat(100_001));
    await expect(page.getByRole('alert')).toContainText('maximum 100,000 characters per node');

    await page.reload();
    await expect(page.locator('.textarea-content')).toHaveValue(savedText);
  });

  test('keeps a large graph keyboard-accessible without mounting every card', async ({ page }) => {
    await page.evaluate(() => {
      const now = new Date().toISOString();
      const nodes: Record<string, unknown> = {};
      for (let index = 0; index < 300; index++) {
        const id = `large-node-${index}`;
        nodes[id] = {
          id,
          treeId: 'large-story',
          parentNodeId: index === 0 ? null : 'large-node-0',
          title: `Large chapter ${index + 1}`,
          content: `Chapter ${index + 1}`,
          authorType: 'HUMAN',
          status: index === 0 ? 'CANON_PATH' : 'ACTIVE',
          coherenceScore: null,
          depth: index === 0 ? 0 : 1,
          wordCount: 2,
          readTimeMinutes: 1,
          createdAt: now,
          updatedAt: now
        };
      }
      localStorage.setItem('ghostwriter_active_story_v1:anonymous', JSON.stringify({
        id: 'large-story',
        title: 'Large Story',
        description: '',
        rootNodeId: 'large-node-0',
        nodes,
        edges: [],
        loreBible: [],
        styleConfig: {},
        createdAt: now,
        updatedAt: now,
        version: 1
      }));
    });

    await page.reload();
    const mountedCount = await page.locator('.node-card').count();
    expect(mountedCount).toBeGreaterThan(0);
    expect(mountedCount).toBeLessThan(200);

    const selectedCard = page.locator('.node-card[aria-pressed="true"]');
    await expect(selectedCard).toHaveAttribute('role', 'button');
    await selectedCard.press('Enter');
    await expect(page.locator('.textarea-content')).toBeVisible();
  });

  test('links an existing chapter as a second parent and prevents a reverse cycle', async ({ page }) => {
    await page.locator('.node-card', { hasText: 'Path A: Trace the Relay Tower' }).click();
    const mergeTarget = await page.locator('#merge-target option', { hasText: 'Path B: Interrogate the Corporate Archive Vault' }).getAttribute('value');
    await page.locator('#merge-target').selectOption(mergeTarget!);
    await page.getByRole('button', { name: 'Merge path' }).click();

    await expect(page.locator('.edge-path')).toHaveCount(3);
    await page.reload();
    await expect(page.locator('.edge-path')).toHaveCount(3);

    await page.locator('.node-card', { hasText: 'Path B: Interrogate the Corporate Archive Vault' }).click();
    await expect(page.locator('#merge-target')).toHaveCount(0);
  });
});
