import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log("Navigating to localhost:3000");
  await page.goto('http://localhost:3000');
  
  console.log("Typing 'the dink'");
  // Type into search bar
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  await page.click('button:has-text("Movies")'); 
  await page.fill('input[type="text"]', 'The Dink');
  
  console.log("Waiting for results");
  await page.waitForTimeout(4000); // Give it time to debounce and fetch
  
  console.log("Taking screenshot");
  await page.screenshot({ path: '/Users/justinplappert/.gemini/antigravity/brain/950b95f4-75f1-494e-8c60-d55e22d65545/screenshot.png' });
  await browser.close();
  console.log("Screenshot saved.");
  process.exit(0);
})();
