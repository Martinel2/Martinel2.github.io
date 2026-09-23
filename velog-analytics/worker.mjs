import { editor } from './editor.mjs';
const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));
const headers = {
  'Cache-Control': 'no-store, private, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'",
};
export const upsert = `INSERT INTO daily_regions (day, post, country, region, city)
  VALUES (?, ?, ?, ?, ?) ON CONFLICT (day, post, country, region, city)
  DO UPDATE SET requests = requests + 1`;
export const koreaDay = (time = Date.now()) => new Date(time + 9 * 3600000).toISOString().slice(0, 10);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const text = value => typeof value === 'string' && value.trim() ? value.slice(0, 100) : 'Unknown';
const response = (body, status = 200, extra = {}) => new Response(body, { status, headers: { ...headers, ...extra } });

async function authorized(request, secret) {
  if (!secret || secret.length < 32) return false;
  let supplied;
  try {
    const auth = request.headers.get('Authorization') || '';
    if (!auth.startsWith('Basic ')) return false;
    supplied = atob(auth.slice(6));
  } catch { return false; }
  const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([digest(supplied), digest('admin:' + secret)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function dashboard(rows, posts, selected) {
  const total = rows.reduce((sum, row) => sum + row.requests, 0);
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Velog 지역 통계</title><style>body{font:16px/1.6 system-ui;max-width:960px;margin:40px auto;padding:0 20px;color:#182330}table{border-collapse:collapse;width:100%}td,th{padding:10px;text-align:left;border-bottom:1px solid #ddd}select,button{font:inherit;padding:8px}small{color:#526070}.scroll{overflow:auto}</style>
  <h1>Velog 지역 통계</h1><p>최근 30일 · 한국 시간 기준 · 이미지 요청 ${total.toLocaleString()}회</p>
  <form><label for="post">글 선택 </label><select id="post" name="post"><option value="">전체</option>${posts.map(p => `<option ${p === selected ? 'selected' : ''} value="${escape(p)}">${escape(p)}</option>`).join('')}</select> <button>조회</button></form>
  <p><small>접속 IP로 추정한 지역입니다. 실제 독자 수나 정확한 위치가 아닙니다. VPN·모바일망·이미지 중계 서버·캐시·자동 요청에 따라 달라질 수 있습니다.</small></p>
  <div class="scroll"><table><thead><tr><th>글</th><th>국가</th><th>지역</th><th>도시</th><th>요청</th></tr></thead><tbody>${rows.map(r => `<tr>${[r.post, r.country, r.region, r.city, r.requests].map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="5">아직 기록이 없습니다.</td></tr>'}</tbody></table></div>
  <p><small>원본 IP·방문자 ID·정확한 좌표는 저장하지 않습니다. 날짜별 지역 집계는 90일 보관합니다. Unknown은 지역 정보가 없는 요청입니다.</small></p></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      if (!await authorized(request, env.ADMIN_PASSWORD)) return response('Authentication required', 401, { 'WWW-Authenticate': 'Basic realm="Velog stats", charset="UTF-8"' });
      return editor(request, env);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return response('Method not allowed', 405, { Allow: 'GET, HEAD' });
    const posts = (env.POST_IDS || '').split(',').filter(p => /^[a-z0-9][a-z0-9-]{0,63}$/.test(p));
    const pixel = url.pathname.match(/^\/p\/([a-z0-9][a-z0-9-]{0,63})\.gif$/);
    if (pixel && posts.includes(pixel[1])) {
      const cf = request.cf || {};
      const bot = /bot|crawler|spider|preview|headless/i.test(request.headers.get('User-Agent') || '');
      const optedOut = request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1';
      // Counts requests, not people: no IP/cookie fingerprint or deduplication.
      if (request.method === 'GET' && !bot && !optedOut) {
        ctx.waitUntil(env.DB.prepare(upsert).bind(koreaDay(), pixel[1], text(cf.country), text(cf.region), text(cf.city)).run().catch(() => {
          console.error('Region aggregate write failed');
        }));
      }
      return response(request.method === 'HEAD' ? null : GIF, 200, { 'Content-Type': 'image/gif', 'Cross-Origin-Resource-Policy': 'cross-origin' });
    }
    if (url.pathname !== '/stats') return response('Not found', 404);
    if (!await authorized(request, env.ADMIN_PASSWORD)) return response('Authentication required', 401, { 'WWW-Authenticate': 'Basic realm="Velog stats", charset="UTF-8"' });
    const post = url.searchParams.get('post') || '';
    if (post && !posts.includes(post)) return response('Unknown post', 400);
    try {
      const since = koreaDay(Date.now() - 29 * 86400000);
      const { results } = await env.DB.prepare(`SELECT post, country, region, city, SUM(requests) AS requests
        FROM daily_regions WHERE day >= ? AND (? = '' OR post = ?)
        GROUP BY post, country, region, city ORDER BY requests DESC, post, country, region, city`)
        .bind(since, post, post).all();
      return response(request.method === 'HEAD' ? null : dashboard(results, posts, post), 200, { 'Content-Type': 'text/html; charset=utf-8' });
    } catch { return response('Statistics temporarily unavailable', 503); }
  },
  async scheduled(controller, env) {
    await env.DB.prepare('DELETE FROM daily_regions WHERE day < ?').bind(koreaDay(Date.now() - 89 * 86400000)).run();
  },
};
