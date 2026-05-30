import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER ERROR] ${err.message}`);
  });

  console.log('Navigating to http://localhost:3000 ...');
  try {
    await page.goto('http://localhost:3000', { timeout: 10000 });
    console.log('Page loaded, waiting 5 seconds...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/Users/nguyenduydo/Montessori/playwright_screenshot.png' });
    console.log('Screenshot taken at playwright_screenshot.png');
  } catch (err) {
    console.error('Error during navigation/wait:', err);
  } finally {
    await browser.close();
  }
})();
