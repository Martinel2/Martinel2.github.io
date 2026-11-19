// Build a local résumé that carries a 지원동기 section, for forms with no text field.
// The source text and the built files stay in local/, which .gitignore keeps out of the repo.
import {readFile, writeFile, mkdir, rm, symlink, rename, access, copyFile} from 'node:fs/promises';
import {watch} from 'node:fs';
import {resolve, basename} from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer';

// The PDF builder leaves the exact print HTML behind; measure the letter there.
async function measure() {
  const browser = await puppeteer.launch({headless: true});
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(resolve('artifacts/resume-pdf.html')).href, {waitUntil: 'load'});
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMediaType('print');
    return await page.$eval('.resume-lead p:last-of-type', el => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter(r => r.width > 0);
      const tops = [...new Set(rects.map(r => Math.round(r.top)))].sort((a, b) => a - b);
      const width = el.getBoundingClientRect().width;
      const last = rects.filter(r => Math.round(r.top) === tops.at(-1))
        .reduce((sum, r) => sum + r.width, 0);
      return {lines: tops.length, fill: Math.round(last / width * 100)};
    });
  } finally {
    await browser.close();
  }
}

const args = process.argv.slice(2);
const watching = args.includes('--watch');
const source = resolve(args.find(a => !a.startsWith('--')) || 'local/지원동기.md');
const label = basename(source).replace(/\.md$/, '');
const stage = resolve('local/.build');
const outDir = resolve('local');
// A profile photo this build adds and the public résumé does not carry.
// It lives in local/, which .gitignore keeps out of the repository.
const photo = resolve('local/증명사진.jpg');

const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Only the markdown the letter actually uses: a heading, paragraphs and bold runs.
const inline = s => escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

async function sectionHtml() {
  // <!-- ... --> holds editing notes that must not reach the document.
  const raw = (await readFile(source, 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
  const lines = raw.split('\n');
  const heading = lines.find(l => l.startsWith('# '))?.slice(2).trim() || '지원동기';
  const body = lines.filter(l => !l.startsWith('# ')).join('\n');
  const blocks = body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (!blocks.length) throw new Error(`${source}에 본문이 없습니다`);
  // A block of "- " lines becomes a tight list; anything else is a paragraph.
  const render = block => block.startsWith('- ')
    ? `<ul>${block.split('\n').map(l => l.replace(/^-\s*/, '').trim())
        .filter(Boolean).map(l => `<li>${inline(l)}</li>`).join('')}</ul>`
    : `<p>${inline(block.replace(/\s*\n\s*/g, ' '))}</p>`;
  return `<section class="resume-section resume-lead"><h2>${escape(heading)}</h2>${blocks.map(render).join('')}</section>`;
}

const run = (cmd, argv, env) => new Promise((done, fail) => {
  const child = spawn(cmd, argv, {stdio: ['ignore', 'pipe', 'inherit'], env: {...process.env, ...env}});
  child.stdout.on('data', () => {});
  child.on('exit', code => code ? fail(new Error(`${cmd} exited with ${code}`)) : done());
});

async function build() {
  const html = await readFile(resolve('site/resume.html'), 'utf8');
  if (!html.includes('class="resume-shell')) throw new Error('site/resume.html을 먼저 빌드하세요 (python3 build.py)');
  // The letter reads right after the name and contacts, before the projects.
  const withLetter = html.replace('<section class="resume-section"', await sectionHtml() + '<section class="resume-section"');
  if (withLetter === html) throw new Error('이력서에서 지원동기를 넣을 위치를 찾지 못했습니다');
  // The photo sits left of the name, as in the company résumés. The DOCX builder reads it off disk.
  const withPhoto = withLetter.replace('<div class="resume-hero cv-header">',
    '<div class="resume-hero cv-header"><img class="resume-photo" src="profile.jpg" alt="증명사진">');
  if (withPhoto === withLetter) throw new Error('이력서 머리말에 사진을 넣을 위치를 찾지 못했습니다');

  await rm(stage, {recursive: true, force: true});
  await mkdir(stage, {recursive: true});
  await writeFile(resolve(stage, 'resume.html'), withPhoto);
  await symlink(resolve('site/assets'), resolve(stage, 'assets'), 'dir');
  await copyFile(photo, resolve(stage, 'profile.jpg'));

  const photoCss = '.cv-header{display:flex;gap:16px;align-items:center}'
    + '.resume-photo{flex:none;width:70px;height:93px;object-fit:cover;border-radius:3px}'
    + '.resume-lead p+p,.resume-lead ul{margin-top:4px}.resume-lead ul{padding-left:14px}';
  await run('node', ['scripts/build-resume-pdf.mjs'],
    {RESUME_DIR: stage, RESUME_LANGS: 'ko', RESUME_EXTRA_CSS: photoCss});

  await mkdir(outDir, {recursive: true});
  for (const ext of ['pdf', 'docx']) {
    await rename(resolve(stage, `resume.${ext}`), resolve(outDir, `이력서_${label}.${ext}`));
  }
  await rm(stage, {recursive: true, force: true});
  console.log(`Built local/이력서_${label}.pdf and .docx from ${basename(source)}`);
  // Report how the letter actually wrapped, so a short trailing line is visible without opening the PDF.
  const fit = await measure().catch(() => null);
  if (fit) console.log(`  지원동기 ${fit.lines}줄 · 마지막 줄 채움 ${fit.fill}%`);
}

await access(source).catch(() => {
  throw new Error(`${source}가 없습니다. 지원동기 본문을 담은 markdown을 먼저 만들어 주세요.`);
});
await access(photo).catch(() => {
  throw new Error(`${photo}가 없습니다. 이력서 상단에 넣을 증명사진을 local/에 두세요.`);
});
await build();

if (watching) {
  console.log(`Watching ${basename(source)} — edit and save to rebuild, Ctrl+C to stop.`);
  let pending;
  watch(source, () => {
    clearTimeout(pending);
    pending = setTimeout(() => build().catch(e => console.error(e.message)), 150);
  });
}
