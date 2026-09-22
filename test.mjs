import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import puppeteer from 'puppeteer';

const root = resolve('site');
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (!file.startsWith(`${root}/`)) throw new Error('Invalid path');
    const data = await readFile(file);
    res.setHeader('Content-Type', { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' }[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.TEST_URL || `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true });
await mkdir('artifacts', { recursive: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [1440, 390, 320]) {
    await page.setViewport({ width, height: 1000 });
    for (const route of ['/', '/resume.html']) {
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle2' });
      assert.equal(response.status(), 200);
      assert.equal(await page.$$eval('h1', els => els.length), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow: ${width} ${route}`);
      const broken = await page.$$eval('a[href^="#"]', links => links.filter(a => !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a => a.hash));
      assert.deepEqual(broken, []);
      if (route === '/') {
        await page.waitForFunction(() => document.documentElement.dataset.diagrams === 'ready', { timeout: 60000 });
        assert.equal(await page.$$eval('.mermaid svg', els => els.length), 4);
        await page.click('.toc a[href="#pilltip-data"]');
        await page.waitForFunction(() => location.hash === '#pilltip-data');
        await page.waitForFunction(() => document.querySelector('.toc a[href="#pilltip-data"]').getAttribute('aria-current') === 'location');
        await page.$eval('.diagram details', el => { el.open = true; });
        assert.ok(await page.$eval('.diagram-source', el => el.textContent.includes('flowchart TD')));
        await page.$eval('.diagram details', el => { el.open = false; });
        await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
        await page.screenshot({ path: `artifacts/portfolio-${width}.png` });
        if (width === 1440) await page.$eval('#fruition-agent', el => el.scrollIntoView({ behavior: 'instant' }));
        if (width === 1440) await page.screenshot({ path: 'artifacts/case-desktop.png', fullPage: false });
      } else {
        await page.evaluate(() => { window.print = () => { window.printInvoked = true; }; });
        await page.click('.print-button');
        assert.equal(await page.evaluate(() => window.printInvoked), true);
        await page.screenshot({ path: `artifacts/resume-${width}.png` });
        if (width === 1440) await page.pdf({ path: 'artifacts/resume.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
      }
    }
  }
  await page.setJavaScriptEnabled(false);
  await page.goto(base);
  assert.equal(await page.$$eval('.case', els => els.length), 4, 'Core content must not require JS');
  const context = await browser.createBrowserContext();
  const offline = await context.newPage();
  await offline.setRequestInterception(true);
  offline.on('request', req => req.url().includes('mermaid@') ? req.abort() : req.continue());
  await offline.goto(base);
  await offline.waitForFunction(() => document.documentElement.dataset.diagrams === 'fallback');
  assert.ok(await offline.$eval('.mermaid', el => el.textContent.includes('flowchart TD')));
  await context.close();
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile (1440/390/320), 4 Mermaid diagrams, anchors, reading index, print, no-JS content and CDN fallback.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
