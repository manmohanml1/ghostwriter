import { chromium } from 'playwright';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

function createStaticServer(distDir, port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(distDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading file');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function main() {
  const distDir = path.resolve('dist/web/browser');
  console.log(`🚀 Starting built-in static server on ${distDir}...`);
  const server = await createStaticServer(distDir, 4200);
  console.log('✅ Server listening on http://localhost:4200');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log('🌐 Navigating to local preview http://localhost:4200 ...');
  await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });

  // 1. Create a fresh story from scratch
  console.log('👉 Creating fresh story from scratch...');
  await page.click('.story-switcher-btn');
  await page.waitForTimeout(400);
  await page.click('button:has-text("+ New Story from Scratch")');
  await page.waitForTimeout(600);

  // Fill Story Title & Click "Create Story" in New Story Modal
  const titleInput = page.locator('input[placeholder="e.g. Echoes of the Spire"]');
  if (await titleInput.isVisible()) {
    await titleInput.fill('Sky Cities of Aethel');
  }
  await page.click('button:has-text("Create Story")');
  await page.waitForTimeout(800);

  // 2. Type user prompt into editor
  console.log('👉 Typing opening scene text...');
  const textarea = page.locator('textarea.textarea-content');
  await textarea.fill('There was a time when Shawn saw the cities in the sky as the place he would reach someday!');
  await page.waitForTimeout(400);

  const outDir = process.env.ARTIFACT_DIR || 'C:/Users/clona/.gemini/antigravity/brain/48cb3b6a-688e-4328-ad14-44f5b928b919';
  
  // 3. Take screenshot of clean editor + empty lore count
  await page.screenshot({ path: path.join(outDir, 'media_fresh_story_clean.png') });

  // 4. Click "✨ Generate World Lore & Character Bible from Scene"
  console.log('👉 Clicking Generate Lore Bible from Scene button...');
  await page.locator('.btn-extract-lore').click();
  await page.waitForTimeout(1000);

  // 5. Take screenshot of Lore Review Modal
  await page.screenshot({ path: path.join(outDir, 'media_lore_generation_modal.png') });

  // 6. Confirm and apply to Lore Bible
  console.log('👉 Confirming Lore Bible additions...');
  await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
  await page.waitForTimeout(600);

  // 7. Click Expand into Full Chapter
  console.log('👉 Expanding chapter with AI...');
  await page.locator('.btn-expand-novel').click();
  await page.waitForTimeout(1500);

  // 8. Take screenshot of expanded chapter
  await page.screenshot({ path: path.join(outDir, 'media_shawn_expanded_chapter.png') });

  // 9. Switch to Lore Bible tab to capture populated entities
  console.log('👉 Opening Lore Bible tab...');
  await page.locator('.tab-btn:has-text("Lore Bible")').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'media_shawn_lore_bible_tab.png') });

  console.log('✅ Visual verification complete! All screenshots captured.');
  await browser.close();
  server.close();
}

main().catch(err => {
  console.error('Error during visual verification:', err);
  process.exit(1);
});
