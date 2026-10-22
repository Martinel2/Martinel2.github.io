import { editor } from './editor.mjs';
const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));
const headers = {
  'Cache-Control': 'no-store, private, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'",
};
export const insert = 'INSERT INTO visits (time, post, country, region, city, kind) VALUES (?, ?, ?, ?, ?, ?)';
export const koreaTime = (time = Date.now()) => new Date(time + 9 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
export const koreaDay = (time = Date.now()) => koreaTime(time).slice(0, 10);
// 무료 플랜에는 Cloudflare 봇 점수가 없어 UA 키워드와 데이터센터 네트워크로 추정한다.
const DATACENTER = /amazon|google|microsoft|digitalocean|ovh|hetzner|linode|akamai|oracle|alibaba|tencent|vultr|choopa/i;
export const kindOf = (userAgent, asOrganization) =>
  /bot|crawler|spider|preview|headless/i.test(userAgent || '') ? 'bot' : DATACENTER.test(asOrganization || '') ? 'datacenter' : 'human';
const KIND = { human: '사람', bot: '봇 (UA)', datacenter: '봇 의심 (데이터센터)' };
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

function dashboard(rows, kinds, recent, posts, selected) {
  const count = kind => kinds.find(k => k.kind === kind)?.n || 0;
  const bots = count('bot') + count('datacenter');
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Velog 지역 통계</title><style>body{font:16px/1.6 system-ui;max-width:960px;margin:40px auto;padding:0 20px;color:#182330}table{border-collapse:collapse;width:100%}td,th{padding:10px;text-align:left;border-bottom:1px solid #ddd}select,button{font:inherit;padding:8px}small{color:#526070}.scroll{overflow:auto}</style>
  <h1>Velog 지역 통계</h1><p>최근 30일, 한국 시간 기준. 사람 요청 ${count('human').toLocaleString()}회, 봇 요청 ${bots.toLocaleString()}회</p>
  <form><label for="post">글 선택 </label><select id="post" name="post"><option value="">전체</option>${posts.map(p => `<option ${p === selected ? 'selected' : ''} value="${escape(p)}">${escape(p)}</option>`).join('')}</select> <button>조회</button></form>
  <p><small>접속 IP로 추정한 지역입니다. 실제 독자 수나 정확한 위치가 아닙니다. VPN·모바일망·이미지 중계 서버·캐시·자동 요청에 따라 달라질 수 있습니다.</small></p>
  <div class="scroll"><table><thead><tr><th>글</th><th>국가</th><th>지역</th><th>도시</th><th>요청</th></tr></thead><tbody>${rows.map(r => `<tr>${[r.post, r.country, r.region, r.city, r.requests].map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="5">아직 기록이 없습니다.</td></tr>'}</tbody></table></div>
  <h2>최근 방문 100건</h2><div class="scroll"><table><thead><tr><th>시각</th><th>글</th><th>지역</th><th>판정</th></tr></thead><tbody>${recent.map(r => `<tr>${[r.time, r.post, `${r.country} ${r.region} ${r.city}`, KIND[r.kind] || r.kind].map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="4">아직 기록이 없습니다.</td></tr>'}</tbody></table></div>
  <p><small>위 지역 표는 사람으로 판정된 요청만 셉니다. 봇 판정은 User-Agent 키워드와 접속 네트워크(AWS, Google Cloud 등 데이터센터)로 추정한 값입니다.</small></p>
  <p><small>원본 IP·방문자 ID·정확한 좌표는 저장하지 않습니다. 방문 기록(분 단위 시각, 지역, 판정)은 90일 보관합니다. Unknown은 지역 정보가 없는 요청입니다.</small></p></html>`;
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
      const optedOut = request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1';
      // Counts requests, not people: no IP/cookie fingerprint or deduplication.
      if (request.method === 'GET' && !optedOut) {
        const kind = kindOf(request.headers.get('User-Agent'), cf.asOrganization);
        ctx.waitUntil(env.DB.prepare(insert).bind(koreaTime(), pixel[1], text(cf.country), text(cf.region), text(cf.city), kind).run().catch(() => {
          console.error('Visit write failed');
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
      const scope = `FROM visits WHERE time >= ? AND (? = '' OR post = ?)`;
      const query = sql => env.DB.prepare(sql).bind(since, post, post).all().then(r => r.results);
      const [rows, kinds, recent] = await Promise.all([
        query(`SELECT post, country, region, city, COUNT(*) AS requests ${scope} AND kind = 'human'
          GROUP BY post, country, region, city ORDER BY requests DESC, post, country, region, city`),
        query(`SELECT kind, COUNT(*) AS n ${scope} GROUP BY kind`),
        query(`SELECT time, post, country, region, city, kind ${scope} ORDER BY time DESC LIMIT 100`),
      ]);
      return response(request.method === 'HEAD' ? null : dashboard(rows, kinds, recent, posts, post), 200, { 'Content-Type': 'text/html; charset=utf-8' });
    } catch { return response('Statistics temporarily unavailable', 503); }
  },
  async scheduled(controller, env) {
    await env.DB.prepare('DELETE FROM visits WHERE time < ?').bind(koreaDay(Date.now() - 89 * 86400000)).run();
  },
};
