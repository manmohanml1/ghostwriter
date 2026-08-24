import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist/web/browser');
const port = 4200;
const outDir = 'C:/Users/clona/.gemini/antigravity/brain/48cb3b6a-688e-4328-ad14-44f5b928b919';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let cleanUrl = req.url.split('?')[0].split('#')[0];
      if (cleanUrl === '/') cleanUrl = '/index.html';
      let filePath = path.join(distDir, cleanUrl);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      } catch (err) {
        res.writeHead(500);
        res.end('Error');
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function main() {
  console.log('🚀 Launching test runner...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('🌐 Opening http://localhost:4200 ...');
  await page.goto(`http://localhost:${port}`);
  await page.waitForSelector('.brand-title', { timeout: 8000 });

  // 1. Open New Story Modal
  console.log('👉 Opening New Story modal...');
  await page.locator('.story-switcher-btn').click();
  await page.waitForTimeout(300);
  await page.locator('.dropdown-item-btn.primary').click();
  await page.waitForTimeout(400);

  // Fill in Gothic Thriller title & genre
  await page.locator('.field-input').fill('The Haunting of Ravenwood');
  await page.locator('select.field-select').first().selectOption('Gothic Thriller');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, 'media_new_story_modal_options.png') });

  // Click Create Story
  console.log('👉 Creating story with dynamic thematic hook...');
  await page.locator('.btn-primary:has-text("Create Story with Thematic Hook")').click();
  await page.waitForTimeout(800);

  // Take screenshot of dynamic seed hook in chapter 1 + Lore Anchor Guard Banner
  await page.screenshot({ path: path.join(outDir, 'media_dynamic_hook_and_lore_guard.png') });

  // 2. Try to click Suggest 3 Paths while lore is empty -> triggers extraction/modal
  console.log('👉 Clicking Suggest 3 Paths (lore gate active)...');
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'media_lore_anchor_prompt_modal.png') });

  // 3. Confirm Lore Entity
  console.log('👉 Confirming Lore Anchor in Bible...');
  await page.locator('.btn-primary:has-text("Confirm & Save to Lore Bible")').click();
  await page.waitForTimeout(600);

  // 4. Now generate 3 branching paths (unlocked)
  console.log('👉 Generating 3 branching paths...');
  await page.locator('.btn-sparkle:has-text("Suggest 3 Paths")').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'media_unlocked_branches_preview.png') });

  console.log('✅ Verification finished successfully!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
