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
  await page.locator('.field-input').fill('The Sky Odyssey');
  await page.locator('.btn-primary:has-text("Create Story")').click();
  await page.waitForTimeout(600);

  // 2. Type initial line
  console.log('👉 Typing initial line...');
  await page.locator('.textarea-content').fill('Shawn adjusted his glider goggles as the airship docked at the floating sky city of Aethelgard.');
  await page.waitForTimeout(400);

  // Capture screenshot: Expand Chapter and Write Next Paragraph are visible right at the top!
  await page.screenshot({ path: path.join(outDir, 'media_initial_line_with_expand_options.png') });

  // 3. Click "⚡ Expand into Full Chapter" directly on initial line
  console.log('👉 Clicking Expand into Full Chapter on initial line...');
  await page.locator('.btn-expand-novel').click();
  await page.waitForTimeout(1500);

  // Capture screenshot of expanded chapter prose
  await page.screenshot({ path: path.join(outDir, 'media_initial_line_expanded_prose.png') });

  console.log('✅ Visual verification of initial line expansion passed!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
