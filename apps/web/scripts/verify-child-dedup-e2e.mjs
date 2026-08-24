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

  // 2. Set scene text and extract lore
  const userText = 'The orbital tether to the planetary surface snapped at altitude, sending telemetry alarms cascading across the bridge consoles. John, who was the captain of the ship, overseeing the control room, looked in horror!';
  await page.locator('.textarea-content').fill(userText);
  await page.waitForTimeout(400);
  await page.locator('.btn-extract-lore').click();
  await page.waitForTimeout(1000);
  await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
  await page.waitForTimeout(600);

  // 3. Generate 3 paths for Chapter 1 and add Path A (Emergency Thruster Burn)
  console.log('👉 2. Generating Chapter 1 paths and adding Path A...');
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1000);
  await page.locator('.suggestion-card:has-text("Emergency Thruster Burn") .btn-apply-suggestion').click();
  await page.waitForTimeout(800);

  // 4. On Chapter 2 (Emergency Thruster Burn), suggest 3 paths and add Path A (Atmospheric Re-entry Skim)
  console.log('👉 3. Generating Depth 3 paths from Chapter 2 and adding Atmospheric Re-entry Skim...');
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1000);
  await page.locator('.suggestion-card:has-text("Atmospheric Re-entry Skim") .btn-apply-suggestion').click();
  await page.waitForTimeout(800);

  // 5. Navigate BACK to Chapter 2 (Emergency Thruster Burn) via breadcrumb
  console.log('👉 4. Navigating back to parent (Emergency Thruster Burn) and requesting new branches...');
  await page.locator('.crumb-link:has-text("Emergency Thruster Burn")').click();
  await page.waitForTimeout(600);

  // 6. Click Suggest 3 Paths again on the parent chapter
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1000);

  // 7. Extract suggestion titles
  const suggestionCards = await page.locator('.suggestion-card .suggestion-title').allInnerTexts();
  console.log('New Suggestions on Parent Chapter:', suggestionCards);

  // ASSERTION: Atmospheric Re-entry Skim MUST NOT be present in suggestions!
  const hasDuplicateChild = suggestionCards.some(title => title.toLowerCase().includes('atmospheric re-entry skim'));
  if (hasDuplicateChild) {
    throw new Error('FAILED: Existing child "Atmospheric Re-entry Skim" was re-suggested!');
  }

  // ASSERTION: Suggestions should contain fresh options
  const hasSpire = suggestionCards.some(title => title.toLowerCase().includes('docking spire'));
  const hasDrift = suggestionCards.some(title => title.toLowerCase().includes('drift mode'));
  const hasHarpoon = suggestionCards.some(title => title.toLowerCase().includes('harpoon'));

  if (!hasSpire || !hasDrift || !hasHarpoon) {
    throw new Error('FAILED: Expected fresh candidate pool options (Spire, Drift, Harpoon)!');
  }

  await page.screenshot({ path: path.join(outDir, 'media_existing_child_dedup_verified.png') });
  console.log('✅ Existing-child deduplication verified with 100% precision!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
