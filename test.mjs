import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import puppeteer from 'puppeteer';
import { execFileSync } from 'node:child_process';

execFileSync('python3', ['scripts/test-resume-docx.py'], {stdio:'inherit'});
const root = resolve('site');
const content = JSON.parse(await readFile('content.json', 'utf8'));
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (!file.startsWith(`${root}/`)) throw new Error('Invalid path');
    const data = await readFile(file);
    res.setHeader('Content-Type', { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.png': 'image/png', '.jpg': 'image/jpeg' }[extname(file)] || 'application/octet-stream');
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
    for (const route of ['/', '/portfolio.html', '/resume.html']) {
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle2' });
      assert.equal(response.status(), 200);
      assert.equal(await page.$$eval('h1', els => els.length), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow: ${width} ${route}`);
      const broken = await page.$$eval('a[href^="#"]', links => links.filter(a => !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a => a.hash));
      assert.deepEqual(broken, []);
      assert.equal(await page.$('.activity-gallery'),null);
      const evidence=await page.$$eval('.evidence-thumb img',async imgs=>{for(const i of imgs)i.loading='eager';await Promise.all(imgs.map(i=>i.decode()));return imgs.map(i=>({width:i.naturalWidth,height:i.getBoundingClientRect().height}));});
      assert.equal(evidence.length,route==='/portfolio.html'?1:6);
      assert.ok(evidence.every(i=>i.width>0&&i.height<=120),'Evidence thumbnails must load at compact sizes');

      if (route === '/') {
        assert.equal(await page.$$eval('.case', els=>els.length),0);
        assert.equal(await page.$$eval('.home-project', els=>els.length),2);
        assert.equal(await page.$$eval('.home-highlights,.home-hero .profile-list',els=>els.length),0);
        assert.equal(await page.$('.home-profile,.home-portrait'),null);
        for (const id of ['fruition', 'pilltip']) {
          const trigger = `.project-cover[href="resume.html#${id}"]`;
          await page.click(trigger);
          assert.equal(new URL(page.url()).pathname, '/');
          assert.ok(await page.$eval(`#${id}-dialog`, el=>el.open));
          assert.ok(await page.$(`#${id}-dialog a[href^="portfolio.html#"]`));
          assert.ok(await page.$eval(`#${id}-dialog`, el=>el.scrollWidth<=el.clientWidth+1));
          await page.screenshot({path:`artifacts/${id}-dialog-${width}.png`});
          await page.keyboard.press('Escape');
          assert.equal(await page.$eval(`#${id}-dialog`, el=>el.open),false);
          assert.equal(await page.$eval(trigger,el=>document.activeElement===el),true);
          await page.click(trigger);
          await page.click(`#${id}-dialog button`);
          assert.equal(await page.$eval(`#${id}-dialog`,el=>el.open),false);
        }
        await page.evaluate(()=>window.scrollTo(0,0));
        const covers=await page.$$eval('.project-cover img',async imgs=>{for(const i of imgs)i.loading='eager';await Promise.all(imgs.map(i=>i.decode()));return imgs.length;});
        assert.equal(covers,2);
        const targets=await page.$$eval('nav a[href^="./#"]',links=>links.map(a=>a.hash.slice(1)));
        assert.ok(await page.evaluate(ids=>ids.every(id=>document.getElementById(id)),targets));
        assert.equal(await page.$('nav a[href="#contact"]'),null);

        assert.equal(await page.$('header nav a[href^="resume.pdf"]'),null);
        assert.equal(await page.$eval('.home-actions a[href^="resume.pdf"]',el=>el.target),'_blank');
        await page.click('.home-actions a[href^="resume.pdf"]');
        assert.ok(await page.$eval('#resume-format-dialog',el=>el.open));
        assert.equal(await page.$eval('#resume-format-dialog a[href^="resume.pdf"]',el=>el.target),'_blank');
        const word=await page.$eval('#resume-format-dialog a[download]',el=>({href:el.href,name:el.download}));
        assert.equal(word.name,'김재형_이력서.docx');
        assert.equal(new URL(word.href).pathname,'/resume.docx');
        if(width===1440){
          const client=await page.createCDPSession();
          await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve('artifacts/downloads'),eventsEnabled:true});
          const completed=new Promise(resolve=>client.on('Browser.downloadProgress',e=>{if(e.state==='completed')resolve();}));
          await page.click('#resume-format-dialog a[download]');await completed;
          assert.deepEqual(await readFile('artifacts/downloads/김재형_이력서.docx'),await readFile('site/resume.docx'));
          await client.detach();
        }
        await page.screenshot({path:`artifacts/resume-formats-${width}.png`});
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('#resume-format-dialog',el=>el.open),false);
        assert.ok(await page.$eval('.home-actions a[href^="resume.pdf"]',el=>el===document.activeElement));
        await page.click('.home-actions a[href^="resume.pdf"]');
        await page.click('#resume-format-dialog button');
        assert.equal(await page.$eval('#resume-format-dialog',el=>el.open),false);

        await page.screenshot({path:`artifacts/home-${width}.png`});
      } else if (route === '/portfolio.html') {
        await page.waitForFunction(() => document.documentElement.dataset.diagrams === 'ready', { timeout: 60000 });
        assert.equal(await page.$$eval('.mermaid svg', els => els.length), content.cases.length);
        const images = await page.$$eval('.project-figure img', async imgs => {
          for (const img of imgs) img.loading = 'eager';
          await Promise.all(imgs.map(img => img.decode()));
          return imgs.map(img => ({ loaded: img.naturalWidth > 0, alt: img.alt }));
        });
        assert.equal(images.length, 8);
        assert.ok(images.every(img => img.loaded && img.alt.length > 10));
        assert.ok(await page.$('#fruition-jev-evidence'));
        assert.equal(await page.$$eval('.case[id^="fruition-jev-"]', els => els.length), 1);
        assert.equal(await page.$eval('h1', el => el.textContent), content.overview.title);
        assert.equal(await page.$$eval('.experience-index li', els => els.length), 3);
        assert.equal(await page.$$eval('.highlights, .hero', els => els.length), 0);
        assert.equal(await page.$$eval('.project-context', els => els.length), 2);
        const lineBreaks = await page.$eval('.experiment-timeline p', el => {
          const original = el.innerHTML;
          el.textContent = '첫째\n둘째\n\n새문단';
          const y = offset => { const range = document.createRange(); range.setStart(el.firstChild, offset); range.setEnd(el.firstChild, offset + 1); return range.getBoundingClientRect().top; };
          const result = { line: y(3) - y(0), paragraph: y(7) - y(3), height: parseFloat(getComputedStyle(el).lineHeight) };
          el.innerHTML = original;
          return result;
        });
        assert.ok(Math.abs(lineBreaks.line - lineBreaks.height) < 2, 'Enter must preserve a line break');
        assert.ok(Math.abs(lineBreaks.paragraph - 2 * lineBreaks.height) < 2, 'Blank line must preserve paragraph spacing');
        for (const c of content.cases) {
          assert.equal(await page.$$eval(`#${c.id} .experiment-timeline > li`, els => els.length), (c.designSteps || c.experiments).length);
          assert.equal(await page.$$eval(`#${c.id} table`, els => els.length), 0);
          if (c.designSteps) {
            assert.deepEqual(await page.$$eval(`#${c.id} .experiment-timeline li:first-child strong`, els => els.map(el => el.textContent)), ['문제 상황', '판단', '구현', '확인한 결과']);
          } else {
            assert.ok(c.experiments.every(row => row.length === 4));
            assert.deepEqual(await page.$$eval(`#${c.id} .experiment-timeline li:first-child strong`, els => els.map(el => el.textContent)), ['문제 상황', '시도와 결과', '판단']);
          }
          assert.ok(!(await page.$eval(`#${c.id} .experiment-timeline`, el => el.textContent)).includes('다음 개선'));
          assert.equal(await page.$$eval(`#${c.id} .experiment-timeline strong`, els => els.filter(el => el.textContent === '개선').length), 0);
        }
        assert.ok(!(await page.$eval('body', el => el.textContent)).includes('edit_goal'));
        assert.match(await page.$eval('#pilltip-personalization', el => el.textContent), /설계와 구현 과정/);
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
        const skills = await page.$eval('.skill-rows > div', el => {
          const list = el.querySelector('p').getBoundingClientRect();
          const note = el.querySelector('.scope-note').getBoundingClientRect();
          return { aligned: Math.abs(list.left - note.left) < 1, below: note.top >= list.bottom, width: note.width, listWidth: list.width };
        });
        assert.ok(skills.aligned && skills.below && Math.abs(skills.width - skills.listWidth) < 1, 'Skill note must occupy the content column');
        await page.evaluate(() => { window.print = () => { window.printInvoked = true; }; });
        const download=await page.$eval('.resume-download',a=>({href:a.href,name:a.download}));
        assert.equal(download.name,'김재형_이력서.pdf');
        assert.equal(new URL(download.href).pathname,'/resume.pdf');
        if(width===1440){
          const client=await page.createCDPSession();
          await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve('artifacts/downloads'),eventsEnabled:true});
          const completed=new Promise(resolve=>client.on('Browser.downloadProgress',e=>{if(e.state==='completed')resolve();}));
          await page.click('.resume-download');await completed;
          assert.deepEqual(await readFile('artifacts/downloads/김재형_이력서.pdf'),await readFile('site/resume.pdf'));
          await client.detach();
        }
        assert.equal(await page.evaluate(() => !!window.printInvoked), false);
        await page.screenshot({ path: `artifacts/resume-${width}.png` });
        if (width === 1440) await page.pdf({ path: 'artifacts/resume.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
      }
    }
  }
  await page.goto(base+'/#fruition-document');
  await page.waitForFunction(()=>location.pathname.endsWith('/portfolio.html'));
  assert.equal(new URL(page.url()).hash,'#fruition-document');
  await page.setJavaScriptEnabled(false);
  await page.goto(base+'/portfolio.html');
  assert.equal(await page.$$eval('.case', els => els.length), content.cases.length, 'Core content must not require JS');
  const context = await browser.createBrowserContext();
  const offline = await context.newPage();
  await offline.setRequestInterception(true);
  offline.on('request', req => req.url().includes('mermaid@') ? req.abort() : req.continue());
  await offline.goto(base+'/portfolio.html');
  await offline.waitForFunction(() => document.documentElement.dataset.diagrams === 'fallback');
  assert.ok(await offline.$eval('.mermaid', el => el.textContent.includes('flowchart TD')));
  await context.close();
  // Exercise the real generated analytics tag without sending test visits to Google.
  const fixtureCode = `import build; print(build.page('Check', 'Check', '<article class="case" id="case-check"><h2>Test case</h2></article><a class="resume-download" href="resume.pdf" download="resume.pdf">Download</a>'))`;
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
  await analyticsPage.evaluate(() => { const a=document.querySelector('.resume-download');a.addEventListener('click',e=>e.preventDefault());a.click(); });
  await analyticsPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await analyticsPage.evaluate(() => window.scrollTo(0, 0));
  events = await analyticsPage.evaluate(() => window.dataLayer.map(args => Array.from(args)));
  assert.equal(events.filter(args => args[1] === 'view_case').length, 1);
  assert.equal(events.filter(args => args[1] === 'resume_download').length, 1);
  await analyticsContext.close();
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile (1440/390/320), Mermaid diagrams for all cases, project and activity images, full-size image links, Jev cases, blog links, anchors, reading index, PDF download, no-JS content, CDN fallback and isolated analytics integration.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
