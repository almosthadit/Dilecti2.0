const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3001/zone/movies...");
  await page.goto('http://localhost:3001/zone/movies', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.error("Navigation error:", e));

  // Wait a bit
  await page.waitForTimeout(5000);

  console.log("Testing search for 'the dink'...");
  const searchInput = await page.waitForSelector('input[type="text"]', { timeout: 30000 }).catch(() => null);
  if (searchInput) {
    await searchInput.fill('the dink');
    await page.keyboard.press('Enter');
    
    // Wait for the results to load (API call)
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: 'search_screenshot.png' });
    console.log("Saved search_screenshot.png");
  } else {
    console.log("Search input not found!");
  }

  console.log("Navigating to http://localhost:3001/discover...");
  await page.goto('http://localhost:3001/discover', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.error("Navigation error:", e));
  
  // Wait for the discover page query
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'discover_screenshot.png' });
  console.log("Saved discover_screenshot.png");

  await browser.close();
  console.log("Done!");
})();
