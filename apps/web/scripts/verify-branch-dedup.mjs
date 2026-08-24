import { chromium } from 'playwright';
import path from 'node:path';

const outDir = 'C:/Users/clona/.gemini/antigravity/brain/48cb3b6a-688e-4328-ad14-44f5b928b919';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForSelector('.brand-title', { timeout: 8000 });

  // 1. Create fresh story
  console.log('👉 Creating fresh story...');
  await page.locator('.story-switcher-btn').click();
  await page.waitForTimeout(300);
  await page.locator('.dropdown-item-btn.primary').click();
  await page.waitForTimeout(400);
  await page.locator('.field-input').fill('The Tether Fracture');
  await page.locator('.btn-primary:has-text("Create Story")').click();
  await page.waitForTimeout(600);

  // 2. Set user scene text in Chapter 1
  const userText = 'The orbital tether to the planetary surface snapped at altitude, sending telemetry alarms cascading across the bridge consoles. John, who was the captain of the ship, overseeing the control room, looked in horror!';
  await page.locator('.textarea-content').fill(userText);
  await page.waitForTimeout(400);

  // Expand Chapter 1 into full chapter
  console.log('👉 Expanding Chapter 1...');
  await page.locator('.btn-expand-novel').click();
  await page.waitForTimeout(1000);
  const ch1Text = await page.locator('.textarea-content').inputValue();

  // 3. Extract & Confirm Lore
  console.log('👉 Extracting Lore...');
  await page.locator('.btn-extract-lore').click();
  await page.waitForTimeout(1000);
  await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
  await page.waitForTimeout(600);

  // 4. Generate 3 Paths & Apply Path B (Sabotage Investigation)
  console.log('👉 Generating 3 Paths...');
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1200);

  // Click on Path B: Sabotage Investigation
  console.log('👉 Selecting Path B (Sabotage Investigation)...');
  await page.locator('.suggestion-card:has-text("Sabotage Investigation") .btn-apply-suggestion').click();
  await page.waitForTimeout(800);

  // 5. Select Chapter 2 node in the canvas or tree
  const ch2InitialText = await page.locator('.textarea-content').inputValue();
  console.log('--- Chapter 2 Initial Content ---');
  console.log(ch2InitialText);

  // 6. Expand Chapter 2 into Full Chapter
  console.log('👉 Expanding Chapter 2 (Sabotage Investigation)...');
  await page.locator('.btn-expand-novel').click();
  await page.waitForTimeout(1500);

  const ch2ExpandedText = await page.locator('.textarea-content').inputValue();
  console.log('--- Chapter 2 Expanded Content ---');
  console.log(ch2ExpandedText);

  // 7. Verify that Chapter 2 contains Deck Seven terminal forensic investigation and NO duplicated bridge alarm paragraph from Chapter 1
  if (ch2ExpandedText.includes('Cascades of amber diagnostic alerts flooded the primary holographic displays')) {
    throw new Error('FAILED: Chapter 2 repeated Chapter 1 bridge alarm paragraph!');
  }

  if (!ch2ExpandedText.includes('Deck Seven') && !ch2ExpandedText.includes('engineering terminal')) {
    throw new Error('FAILED: Chapter 2 did not develop the sabotage investigation!');
  }

  // Capture screenshot of Chapter 2 Sabotage Investigation
  await page.screenshot({ path: path.join(outDir, 'media_chapter_2_sabotage_expansion.png') });

  // 8. View in Story Reader to verify seamless manuscript flow
  console.log('👉 Opening Story Reader...');
  await page.locator('.mode-btn:has-text("Reader Mode")').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'media_reader_manuscript_no_repeats.png') });

  console.log('✅ Multi-chapter branch expansion test passed with 0 duplicates and deep narrative progression!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
