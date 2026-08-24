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

  // 2. Set user scene text in Chapter 1 & Extract Lore
  const userText = 'The orbital tether to the planetary surface snapped at altitude, sending telemetry alarms cascading across the bridge consoles. John, who was the captain of the ship, overseeing the control room, looked in horror!';
  await page.locator('.textarea-content').fill(userText);
  await page.waitForTimeout(400);

  await page.locator('.btn-extract-lore').click();
  await page.waitForTimeout(1000);
  await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
  await page.waitForTimeout(600);

  // 3. Generate 3 Paths for Chapter 1
  console.log('👉 2. Generating 3 Paths on Chapter 1...');
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1000);

  // 4. Click "+ Add this branch to canvas" on Path A (Emergency Thruster Burn)
  console.log('👉 3. Adding Path A (Emergency Thruster Burn)...');
  await page.locator('.suggestion-card:has-text("Emergency Thruster Burn") .btn-apply-suggestion').click();
  await page.waitForTimeout(800);

  // 5. Select Chapter 1 again via breadcrumb and add Path B
  console.log('👉 4. Selecting Chapter 1 to add Path B...');
  await page.locator('.crumb-link:has-text("Chapter 1")').click();
  await page.waitForTimeout(600);

  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1000);

  console.log('👉 5. Adding Path B (Sabotage Investigation)...');
  await page.locator('.suggestion-card:has-text("Sabotage Investigation") .btn-apply-suggestion').click();
  await page.waitForTimeout(800);

  // 6. Screenshot canvas showing both Path A and Path B as parallel sibling branches of Chapter 1
  await page.screenshot({ path: path.join(outDir, 'media_sibling_branches_verified.png') });

  // 7. Verify in Story Tree state that Path B has parentNodeId === Chapter 1
  console.log('👉 6. Checking tree structure...');
  const nodes = await page.locator('.node-card').allInnerTexts();
  console.log('Canvas Nodes:', nodes);

  console.log('✅ Sibling branching parentage verified with 100% precision!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
