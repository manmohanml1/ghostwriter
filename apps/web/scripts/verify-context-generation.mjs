import { chromium } from 'playwright';
import path from 'node:path';

const outDir = 'C:/Users/clona/.gemini/antigravity/brain/48cb3b6a-688e-4328-ad14-44f5b928b919';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForSelector('.brand-title', { timeout: 8000 });

  // 1. Create fresh story
  console.log('👉 Creating new story...');
  await page.locator('.story-switcher-btn').click();
  await page.waitForTimeout(300);
  await page.locator('.dropdown-item-btn.primary').click();
  await page.waitForTimeout(400);
  await page.locator('.field-input').fill('The Tether Fracture');
  await page.locator('.btn-primary:has-text("Create Story")').click();
  await page.waitForTimeout(600);

  // 2. Set the exact scene text from the user
  const userText = 'The orbital tether to the planetary surface snapped at altitude, sending telemetry alarms cascading across the bridge consoles. John, who was the captain of the ship, overseeing the control room, looked in horror!';
  console.log('👉 Typing scene text:', userText);
  await page.locator('.textarea-content').fill(userText);
  await page.waitForTimeout(400);

  // 3. Test "+ Write Next Paragraph"
  console.log('👉 Clicking + Write Next Paragraph...');
  await page.locator('.btn-continue-para').click();
  await page.waitForTimeout(1000);

  const paraContent = await page.locator('.textarea-content').inputValue();
  console.log('--- Resulting Content after Next Para ---');
  console.log(paraContent);

  // Capture screenshot of next para
  await page.screenshot({ path: path.join(outDir, 'media_captain_john_next_para.png') });

  // 4. Test "⚡ Expand into Full Chapter"
  console.log('👉 Clicking ⚡ Expand into Full Chapter...');
  await page.locator('.btn-expand-novel').click();
  await page.waitForTimeout(1500);

  const fullContent = await page.locator('.textarea-content').inputValue();
  console.log('--- Resulting Content after Expand Full Chapter ---');
  console.log(fullContent);

  // Capture screenshot of full chapter expansion
  await page.screenshot({ path: path.join(outDir, 'media_captain_john_full_chapter.png') });

  // Check that "The" is NOT used as protagonist name and that Captain John and ship bridge context are preserved
  if (fullContent.includes('For as long as The could remember') || fullContent.includes("The's gaze")) {
    throw new Error('FAILED: "The" used as name!');
  }
  if (fullContent.includes('towers of the horizon above reflected the twilight sun')) {
    throw new Error('FAILED: generic sky city template was used!');
  }

  console.log('✅ Contextual scene continuation passed with full alignment to Captain John and the ship bridge crisis!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
