import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { koreaDay } from './worker.mjs';

const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const env = {
  POST_IDS: 'test,article', ADMIN_PASSWORD: 'test-password-only-32-characters-long',
  DB: { prepare(sql) { return { bind(...args) { return {
    async run() { return db.prepare(sql).run(...args); },
    async all() { return { results: db.prepare(sql).all(...args) }; },
  }; } }; } },
};
const pending = [];
async function visit(path, { cf, ...options } = {}) {
  const req = new Request('https://example.test' + path, options);
  if (cf) Object.defineProperty(req, 'cf', { value: cf });
  const res = await worker.fetch(req, env, { waitUntil(p) { pending.push(p); } });
  await Promise.all(pending.splice(0));
  return res;
}
const auth = { Authorization: 'Basic ' + btoa('admin:' + env.ADMIN_PASSWORD) };
assert.equal(koreaDay(Date.parse('2026-09-22T15:00:00Z')), '2026-09-23');
assert.equal((await visit('/stats')).status, 401);
assert.equal((await visit('/stats', { headers: { Authorization: 'Basic invalid!' } })).status, 401);
const geo = { country: 'KR', region: 'Seoul', city: 'Seoul', latitude: '37.5' };
for (let i = 0; i < 2; i++) {
  const res = await visit('/p/test.gif', { cf: geo, headers: { 'CF-Connecting-IP': '192.0.2.1' } });
  assert.equal(res.headers.get('Content-Type'), 'image/gif');
  assert.match(res.headers.get('Cache-Control'), /no-store/);
  assert.equal(new TextDecoder().decode((await res.arrayBuffer()).slice(0, 6)), 'GIF89a');
}
await visit('/p/test.gif', { cf: geo, method: 'HEAD' });
await visit('/p/test.gif', { cf: geo, headers: { DNT: '1' } });
await visit('/p/test.gif', { cf: geo, headers: { 'Sec-GPC': '1' } });
await visit('/p/test.gif', { cf: geo, headers: { 'User-Agent': 'Googlebot' } });
assert.equal(db.prepare('SELECT requests FROM daily_regions').get().requests, 2);
assert.equal((await visit('/p/not-allowed.gif')).status, 404);
assert.equal((await visit('/p/test.gif', { method: 'POST' })).status, 405);
await visit('/p/article.gif');
await visit('/p/article.gif', { cf: { country: 'US', city: '<script>alert(1)</script>' } });
const page = await (await visit('/stats', { headers: auth })).text();
assert.match(page, /Seoul/);
assert.match(page, /Unknown/);
assert.match(page, /&lt;script&gt;/);
assert.doesNotMatch(page, /192\.0\.2\.1|37\.5|<script>/);
const filtered = await (await visit('/stats?post=test', { headers: auth })).text();
assert.match(filtered, /요청 2회/);
assert.equal((await visit('/stats?post=bad', { headers: auth })).status, 400);
db.prepare('INSERT INTO daily_regions VALUES (?, ?, ?, ?, ?, ?)').run('2000-01-01', 'test', 'KR', 'Old', 'Old', 1);
await worker.scheduled({}, env);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM daily_regions WHERE day='2000-01-01'").get().n, 0);
assert.deepEqual(db.prepare('PRAGMA table_info(daily_regions)').all().map(c => c.name), ['day', 'post', 'country', 'region', 'city', 'requests']);
env.ADMIN_PASSWORD = '';
assert.equal((await visit('/stats', { headers: auth })).status, 401);
db.close();
console.log('PASS: real SQLite aggregation, private dashboard, geography-only storage, opt-out/bot/HEAD exclusion, validation, HTML escaping, retention');
