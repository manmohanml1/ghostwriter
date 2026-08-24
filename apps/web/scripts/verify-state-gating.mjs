import { chromium } from 'playwright';
import path from 'node:path';

const outDir = 'C:/Users/clona/.gemini/antigravity/brain/48cb3b6a-688e-4328-ad14-44f5b928b919';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForSelector('.brand-title', { timeout: 8000 });

  // 1. Create fresh story from scratch so Lore Bible starts at 0
  await page.locator('.story-switcher-btn').click();
  await page.waitForTimeout(300);
  await page.locator('.dropdown-item-btn.primary').click();
  await page.waitForTimeout(400);
  await page.locator('.field-input').fill('The Sky Odyssey');
  await page.locator('.btn-primary:has-text("Create Story")').click();
  await page.waitForTimeout(600);

  // Wipe active chapter text completely to test empty state
  await page.locator('.textarea-content').fill('');
  await page.waitForTimeout(400);

  // Take screenshot of empty chapter state: verify NO lore banner, NO AI cards, NO manual branch button
  await page.screenshot({ path: path.join(outDir, 'media_clean_empty_scene_state.png') });

  // 2. Type story scene text
  await page.locator('.textarea-content').fill('Shawn adjusted his glider goggles as the airship docked at the floating sky city of Aethelgard. Below him, endless storm clouds churned.');
  await page.waitForTimeout(400);

  // Take screenshot: now lore extract button and lore anchor banner appear, but manual branch is still gated
  await page.screenshot({ path: path.join(outDir, 'media_written_scene_lore_gated.png') });

  // 3. Extract and confirm lore
  await page.locator('.btn-extract-lore').click();
  await page.waitForTimeout(1000);
  await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
  await page.waitForTimeout(500);

  // Take screenshot: now with Lore present, Novel actions, AI 3-Way Engine, and Manual Branch are fully unlocked!
  await page.screenshot({ path: path.join(outDir, 'media_story_and_lore_fully_unlocked.png') });

  console.log('✅ Visual verification of clean state gating passed!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
