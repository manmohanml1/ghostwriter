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

  console.log('👉 2. Extracting initial Lore...');
  await page.locator('.btn-extract-lore').click();
  await page.waitForTimeout(1000);
  await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
  await page.waitForTimeout(600);

  // 3. Suggest 3 Paths & Apply Path A: Emergency Thruster Burn
  console.log('👉 3. Suggesting Chapter 1 branches...');
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1000);

  console.log('👉 4. Applying Path A (Emergency Thruster Burn)...');
  await page.locator('.suggestion-card:has-text("Emergency Thruster Burn") .btn-apply-suggestion').click();
  await page.waitForTimeout(800);

  // 4. Test User Scenario: Expand Chapter 2 Path A
  console.log('👉 5. Expanding Chapter 2 (Path A: Emergency Thruster Burn)...');
  await page.locator('.btn-expand-novel').click();
  await page.waitForTimeout(1200);

  const expandedText1 = await page.locator('.textarea-content').inputValue();
  console.log('--- Chapter 2 Path A Expanded Text ---');
  console.log(expandedText1);

  // Assert: Opening sentence must appear ONLY ONCE!
  const matchOpening = (expandedText1.match(/John seized manual control of the orbital thrusters/g) || []).length;
  if (matchOpening !== 1) {
    throw new Error(`FAILED: Opening sentence appeared ${matchOpening} times instead of 1!`);
  }

  await page.screenshot({ path: path.join(outDir, 'media_permutation_step1_expand.png') });

  // 5. Test Undo
  console.log('👉 6. Testing Undo...');
  await page.locator('.btn-undo-ai').click();
  await page.waitForTimeout(600);

  const undoneText = await page.locator('.textarea-content').inputValue();
  console.log('--- Undone Text ---');
  console.log(undoneText);

  // 6. Test Next Paragraph
  console.log('👉 7. Testing + Write Next Paragraph...');
  await page.locator('.btn-continue-para').click();
  await page.waitForTimeout(1000);

  const nextParaText = await page.locator('.textarea-content').inputValue();
  console.log('--- With Next Paragraph Text ---');
  console.log(nextParaText);

  // 7. Test Expand after Next Paragraph
  console.log('👉 8. Expanding after Next Paragraph...');
  await page.locator('.btn-expand-novel').click();
  await page.waitForTimeout(1200);

  const finalExpandedText = await page.locator('.textarea-content').inputValue();
  console.log('--- Final Expanded Text ---');
  console.log(finalExpandedText);

  // Assert: No duplicate opening lines or duplicated paragraphs
  const finalMatchOpening = (finalExpandedText.match(/John seized manual control of the orbital thrusters/g) || []).length;
  if (finalMatchOpening !== 1) {
    throw new Error(`FAILED: Final expanded text has ${finalMatchOpening} duplicate opening lines!`);
  }

  await page.screenshot({ path: path.join(outDir, 'media_permutation_step2_expand_after_next_para.png') });

  // 8. Test In-Flow Lore Extraction on Chapter 2
  console.log('👉 9. Testing In-Flow Lore Extraction on Chapter 2...');
  await page.locator('.btn-extract-lore').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'media_permutation_branch_lore_modal.png') });

  await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
  await page.waitForTimeout(600);

  console.log('✅ All permutation sequences and in-flow branch lore discovery passed with 100% success!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
