const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('pageerror', error => console.log('BROWSER ERROR STACK:', error.stack || error.message));
  const routes = ['/', '/dashboard'];
  for (const route of routes) {
    console.log(`Loading ${route}...`);
    try {
      await page.goto(`https://windowworld.bridgebox.ai${route}`, { waitUntil: 'networkidle2' });
      const html = await page.evaluate(() => document.body.innerHTML);
      console.log(`${route} OK, length: ${html.length}`);
    } catch (e) {
      console.log(`${route} FAILED: ${e.message}`);
    }
  }
  
  await browser.close();
  process.exit(0);
})();
