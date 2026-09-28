// Build a local résumé that carries a 지원동기 section, for forms with no text field.
// The source text and the built files stay in local/, which .gitignore keeps out of the repo.
import {readFile, writeFile, mkdir, rm, symlink, rename, access} from 'node:fs/promises';
import {watch} from 'node:fs';
import {resolve, basename} from 'node:path';
import {spawn} from 'node:child_process';

const args = process.argv.slice(2);
const watching = args.includes('--watch');
const source = resolve(args.find(a => !a.startsWith('--')) || 'local/지원동기.md');
const label = basename(source).replace(/\.md$/, '');
const stage = resolve('local/.build');
const outDir = resolve('local');

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
    ? `<div class="resume-topic"><ul>${block.split('\n').map(l => l.replace(/^-\s*/, '').trim())
        .filter(Boolean).map(l => `<li>${inline(l)}</li>`).join('')}</ul></div>`
    : `<p>${inline(block.replace(/\s*\n\s*/g, ' '))}</p>`;
  return `<section class="resume-section resume-lead"><h2>${escape(heading)}<span>MOTIVATION</span></h2>`
    + `<div class="resume-content">${blocks.map(render).join('')}</div></section>`;
}

const run = (cmd, argv, env) => new Promise((done, fail) => {
  const child = spawn(cmd, argv, {stdio: ['ignore', 'pipe', 'inherit'], env: {...process.env, ...env}});
  child.stdout.on('data', () => {});
  child.on('exit', code => code ? fail(new Error(`${cmd} exited with ${code}`)) : done());
});

async function build() {
  const html = await readFile(resolve('site/resume.html'), 'utf8');
  if (!html.includes('class="resume-shell"')) throw new Error('site/resume.html을 먼저 빌드하세요 (python3 build.py)');
  // The résumé keeps its three pages; the letter follows as the last section.
  const withLetter = html.replace('<div class="resume-end">', await sectionHtml() + '<div class="resume-end">');

  await rm(stage, {recursive: true, force: true});
  await mkdir(stage, {recursive: true});
  await writeFile(resolve(stage, 'resume.html'), withLetter);
  await symlink(resolve('site/assets'), resolve(stage, 'assets'), 'dir');

  await run('node', ['scripts/build-resume-pdf.mjs'], {RESUME_DIR: stage, RESUME_LANGS: 'ko'});

  await mkdir(outDir, {recursive: true});
  for (const ext of ['pdf', 'docx']) {
    await rename(resolve(stage, `resume.${ext}`), resolve(outDir, `이력서_${label}.${ext}`));
  }
  await rm(stage, {recursive: true, force: true});
  console.log(`Built local/이력서_${label}.pdf and .docx from ${basename(source)}`);
}

await access(source).catch(() => {
  throw new Error(`${source}가 없습니다. 지원동기 본문을 담은 markdown을 먼저 만들어 주세요.`);
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
