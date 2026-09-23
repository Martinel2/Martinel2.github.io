import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import puppeteer from 'puppeteer';
import { execFileSync } from 'node:child_process';

const root = resolve('site');
const content = JSON.parse(await readFile('content.json', 'utf8'));
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (!file.startsWith(`${root}/`)) throw new Error('Invalid path');
    const data = await readFile(file);
    res.setHeader('Content-Type', { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' }[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.TEST_URL || `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true });
await mkdir('artifacts', { recursive: true });
try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
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
        assert.equal(await page.$$eval('.mermaid svg', els => els.length), 9);
        const images = await page.$$eval('.project-figure img', async imgs => {
          for (const img of imgs) img.loading = 'eager';
          await Promise.all(imgs.map(img => img.decode()));
          return imgs.map(img => ({ loaded: img.naturalWidth > 0, alt: img.alt }));
        });
        assert.equal(images.length, 8);
        assert.ok(images.every(img => img.loaded && img.alt.length > 10));
        assert.ok(await page.$('#fruition-jev-routing'));
        assert.equal(await page.$eval('h1', el => el.textContent), content.overview.title);
        assert.equal(await page.$$eval('.experience-index li', els => els.length), 3);
        assert.equal(await page.$$eval('.highlights, .hero', els => els.length), 0);
        assert.equal(await page.$$eval('.project-context', els => els.length), 2);
        for (const id of ['fruition-document', 'fruition-jev-decisions', 'fruition-ingest']) assert.ok(await page.$(`#${id} .comparison`));
        assert.ok(!(await page.$eval('body', el => el.textContent)).includes('edit_goal'));
        assert.ok(await page.$('#fruition-jev-evidence .comparison'));
        assert.equal(await page.$$eval('.writings a[href*="velog.io"]', els => els.length), 3);
        await page.$eval('.project-context', el => el.scrollIntoView({ behavior: 'instant' }));
        await page.screenshot({ path: `artifacts/projects-${width}.png` });
        if (width === 1440) {
          const popup = new Promise(resolve => page.once('popup', resolve));
          await page.click('.project-figure > a');
          const imagePage = await popup;
          await imagePage.waitForFunction(() => document.querySelector('img')?.naturalWidth > 0);
          assert.ok(imagePage.url().endsWith('fruition-workspace.jpg'));
          await imagePage.close();
        }
        await page.click('.toc a[href="#pilltip-data"]');
        await page.waitForFunction(() => location.hash === '#pilltip-data');
        await page.waitForFunction(() => document.querySelector('.toc a[href="#pilltip-data"]').getAttribute('aria-current') === 'location');
        await page.$eval('.diagram details', el => { el.open = true; });
        assert.ok(await page.$eval('.diagram-source', el => el.textContent.includes('flowchart TD')));
        await page.$eval('.diagram details', el => { el.open = false; });
        await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo({ top: 0, behavior: 'instant' }); });
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
  assert.equal(await page.$$eval('.case', els => els.length), 9, 'Core content must not require JS');
  const context = await browser.createBrowserContext();
  const offline = await context.newPage();
  await offline.setRequestInterception(true);
  offline.on('request', req => req.url().includes('mermaid@') ? req.abort() : req.continue());
  await offline.goto(base);
  await offline.waitForFunction(() => document.documentElement.dataset.diagrams === 'fallback');
  assert.ok(await offline.$eval('.mermaid', el => el.textContent.includes('flowchart TD')));
  await context.close();
  // Exercise the real generated analytics tag without sending test visits to Google.
  const fixtureCode = `import build; print(build.page('Check', 'Check', '<article class="case" id="case-check"><h2>Test case</h2></article><button class="print-button">Print</button>'))`;
  const renderFixture = id => execFileSync('python3', ['-c', fixtureCode], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GA_MEASUREMENT_ID: id } });
  assert.ok(!renderFixture('').includes('ga-measurement-id'));
  assert.throws(() => renderFixture('invalid-id'), /GA_MEASUREMENT_ID/);
  const analyticsContext = await browser.createBrowserContext();
  const analyticsPage = await analyticsContext.newPage();
  await analyticsPage.setViewport({ width: 1000, height: 1000 });
  await analyticsPage.setRequestInterception(true);
  let tagLoads = 0;
  analyticsPage.on('request', req => {
    if (req.url().includes('/analytics-check')) return req.respond({ status: 200, contentType: 'text/html', body: renderFixture('G-TEST123') });
    if (req.url().startsWith('https://www.googletagmanager.com/')) {
      tagLoads++;
      return req.respond({ status: 200, contentType: 'application/javascript', body: '' });
    }
    if (req.url().includes('google-analytics.com')) return req.abort();
    req.continue();
  });
  const localBase = `http://127.0.0.1:${server.address().port}`;
  await analyticsPage.goto(`${localBase}/analytics-check?utm_source=application&utm_medium=resume&utm_campaign=company-a&email=private@example.com#private`, { waitUntil: 'networkidle2' });
  await analyticsPage.waitForFunction(() => window.dataLayer?.some(args => args[1] === 'view_case'));
  let events = await analyticsPage.evaluate(() => window.dataLayer.map(args => Array.from(args)));
  const config = events.find(args => args[0] === 'config')[2];
  assert.equal(config.page_location, `${localBase}/analytics-check`);
  assert.equal(config.campaign_name, 'company-a');
  assert.equal(config.campaign_source, 'application');
  assert.equal(config.allow_google_signals, false);
  assert.ok(!JSON.stringify(events).includes('private'));
  assert.equal(tagLoads, 1);
  await analyticsPage.evaluate(() => { window.print = () => {}; document.querySelector('.print-button').click(); });
  await analyticsPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await analyticsPage.evaluate(() => window.scrollTo(0, 0));
  events = await analyticsPage.evaluate(() => window.dataLayer.map(args => Array.from(args)));
  assert.equal(events.filter(args => args[1] === 'view_case').length, 1);
  assert.equal(events.filter(args => args[1] === 'resume_print').length, 1);
  await analyticsContext.close();
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile (1440/390/320), 9 Mermaid diagrams, 8 project images, full-size image links, Jev cases, blog links, anchors, reading index, print, no-JS content, CDN fallback and isolated analytics integration.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
