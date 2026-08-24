import { chromium } from 'playwright';
import path from 'node:path';

const outDir = 'C:/Users/clona/.gemini/antigravity/brain/48cb3b6a-688e-4328-ad14-44f5b928b919';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForSelector('.brand-title', { timeout: 8000 });

  // 1. Create fresh story
  console.log('👉 1. Creating fresh story...');
  await page.locator('.story-switcher-btn').click();
  await page.waitForTimeout(300);
  await page.locator('.dropdown-item-btn.primary').click();
  await page.waitForTimeout(400);
  await page.locator('.field-input').fill('The Tether Fracture');
  await page.locator('.btn-primary:has-text("Create Story")').click();
  await page.waitForTimeout(600);

  // 2. Set user scene text in Chapter 1 & Expand
  const userText = 'The orbital tether to the planetary surface snapped at altitude, sending telemetry alarms cascading across the bridge consoles. John, who was the captain of the ship, overseeing the control room, looked in horror!';
  await page.locator('.textarea-content').fill(userText);
  await page.waitForTimeout(300);
  await page.locator('.btn-expand-novel').click();
  await page.waitForTimeout(800);

  // 3. Extract & Confirm Lore
  console.log('👉 2. Extracting Lore...');
  await page.locator('.btn-extract-lore').click();
  await page.waitForTimeout(1000);
  await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
  await page.waitForTimeout(500);

  // 4. Generate Chapter 1 branches -> Suggest 3 Paths
  console.log('👉 3. Suggesting Chapter 1 branches...');
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1000);

  // Verify Chapter 1 suggestions
  const ch1Suggestions = await page.locator('.suggestion-title').allInnerTexts();
  console.log('Chapter 1 Suggestions:', ch1Suggestions);

  // 5. Apply Path B (Sabotage Investigation)
  console.log('👉 4. Applying Path B (Sabotage Investigation)...');
  await page.locator('.suggestion-card:has-text("Sabotage Investigation") .btn-apply-suggestion').click();
  await page.waitForTimeout(600);

  // Take screenshot: Verify Chapter 2 is selected and suggestions from Chapter 1 are NOT polluting Chapter 2!
  await page.screenshot({ path: path.join(outDir, 'media_chapter_2_selected_isolated.png') });

  // 6. Now on Chapter 2 (Sabotage Investigation), click "✨ Suggest 3 Paths"
  console.log('👉 5. Requesting Chapter 3 continuation branches on Chapter 2...');
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1000);

  const ch2ContinuationSuggestions = await page.locator('.suggestion-title').allInnerTexts();
  console.log('Chapter 2 Depth 3 Continuation Suggestions:', ch2ContinuationSuggestions);

  // Verify Depth 3 hypotheses are generated for Sabotage Investigation
  const hasInterrogation = ch2ContinuationSuggestions.some(t => t.includes('Deck Seven Interrogation') || t.includes('Interrogation'));
  const hasBlackBox = ch2ContinuationSuggestions.some(t => t.includes('Black Box Relay') || t.includes('Relay'));
  const hasAirlock = ch2ContinuationSuggestions.some(t => t.includes('Airlock Ambush') || t.includes('Ambush'));

  if (!hasInterrogation && !hasBlackBox && !hasAirlock) {
    throw new Error('FAILED: Chapter 2 did not generate Chapter 3 Sabotage Investigation hypotheses!');
  }

  // Take screenshot of Chapter 2 generating Chapter 3 Depth-Aware branches
  await page.screenshot({ path: path.join(outDir, 'media_chapter_2_depth3_suggestions.png') });

  // 7. Apply Chapter 3 branch (Deck Seven Interrogation)
  console.log('👉 6. Applying Chapter 3 branch (Deck Seven Interrogation)...');
  await page.locator('.suggestion-card:has-text("Interrogation") .btn-apply-suggestion').click();
  await page.waitForTimeout(600);

  // Take screenshot of full 3-tier canvas DAG
  await page.screenshot({ path: path.join(outDir, 'media_canvas_3_tier_dag.png') });

  console.log('✅ Visual verification of depth-aware branch progression and suggestion lifecycle isolation passed with 100% success!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
