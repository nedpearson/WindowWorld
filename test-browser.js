const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR STACK:', error.stack || error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Loading page...');
  await page.goto('http://localhost:5174/map', { waitUntil: 'networkidle2' });
  
  console.log('Page loaded. Checking HTML...');
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log('Body HTML length:', bodyHTML.length);
  
  await browser.close();
  process.exit(0);
})();
