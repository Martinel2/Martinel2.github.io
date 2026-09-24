const endpoint = 'https://api.github.com/repos/Martinel2/Martinel2.github.io/contents/content.json';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const immutable = new Set(['id', 'project', 'name', 'src', 'width', 'height']);
export function validate(next, previous, key = '') {
  if (typeof next !== typeof previous || next === null || previous === null) throw Error('내용 형식이 달라졌습니다. 다시 불러온 뒤 수정해 주세요.');
  if (immutable.has(key) && next !== previous) throw Error('이미지 경로와 연결 식별자는 이 화면에서 변경할 수 없습니다.');
  if (Array.isArray(previous)) {
    if (!Array.isArray(next) || next.length !== previous.length) throw Error('항목 수가 달라졌습니다. 기존 항목의 내용을 수정해 주세요.');
    previous.forEach((value, i) => validate(next[i], value));
  } else if (typeof previous === 'object') {
    if (Array.isArray(next) || Object.keys(next).sort().join('|') !== Object.keys(previous).sort().join('|')) throw Error('필수 항목이 누락되거나 추가됐습니다.');
    Object.entries(previous).forEach(([k, value]) => validate(next[k], value, k));
  } else if (typeof previous === 'string') {
    if (next.length > 30000 || next.includes('\u0000')) throw Error('입력 내용이 너무 길거나 올바르지 않습니다.');
    if (key === 'url' || key === 'href') {
      if (!/^(https:\/\/[^\s]+|#[a-z0-9-]+)$/.test(next)) throw Error('링크는 https:// 주소 또는 페이지 내 연결이어야 합니다.');
      if (next.startsWith('https://')) { const u = new URL(next); if (u.username || u.password) throw Error('로그인 정보가 포함된 URL은 사용할 수 없습니다.'); }
    }
  } else if (next !== previous) throw Error('문자 내용만 수정할 수 있습니다.');
}
async function github(env, method = 'GET', data) {
  if (method === 'GET' && !env.GITHUB_TOKEN) {
    // Public read remains available before the repository-scoped token is connected.
    const raw = await fetch('https://raw.githubusercontent.com/Martinel2/Martinel2.github.io/main/content.json', { signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
    if (!raw.ok) return raw;
    const bytes = new Uint8Array(await raw.arrayBuffer());
    const prefix = new TextEncoder().encode(`blob ${bytes.length}\0`);
    const blob = new Uint8Array(prefix.length + bytes.length); blob.set(prefix); blob.set(bytes, prefix.length);
    const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', blob)), b => b.toString(16).padStart(2, '0')).join('');
    let binary = ''; for (const b of bytes) binary += String.fromCharCode(b);
    return Response.json({ sha, content: btoa(binary) });
  }
  return fetch(endpoint + (method === 'GET' ? '?ref=main' : ''), {
    method, signal: AbortSignal.timeout(15000), headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'jaehyeong-portfolio-editor', 'X-GitHub-Api-Version': '2022-11-28',
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
export async function editor(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/admin/api/content') {
    if (!['GET', 'HEAD'].includes(request.method)) return json({ error: '허용하지 않는 요청입니다.' }, 405);
    if (!['/admin', '/admin/', '/admin/index.html', '/admin/editor.js'].includes(url.pathname)) return json({ error: '페이지를 찾을 수 없습니다.' }, 404);
    const path = url.pathname === '/admin' || url.pathname === '/admin/' ? '/admin/index.html' : url.pathname;
    const asset = await env.ASSETS.fetch(new Request(new URL(path, url), request));
    const result = new Response(asset.body, asset);
    result.headers.set('Cache-Control', 'no-store');
    result.headers.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src https://martinel2.github.io; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    result.headers.set('X-Content-Type-Options', 'nosniff');
    result.headers.set('Referrer-Policy', 'no-referrer');
    return result;
  }
  if (!['GET', 'POST'].includes(request.method)) return json({ error: '허용하지 않는 요청입니다.' }, 405);
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== url.origin || request.headers.get('X-Editor-Action') !== 'save' || !request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: '잘못된 저장 요청입니다.' }, 403);
    if (!env.GITHUB_TOKEN) return json({ error: 'GitHub 저장 연결이 필요합니다. 입력한 내용은 그대로 유지됩니다.' }, 503);
  }
  try {
    const currentResponse = await github(env);
    if (!currentResponse.ok) return json({ error: `GitHub에서 내용을 읽지 못했습니다 (${currentResponse.status}). 잠시 후 다시 시도해 주세요.` }, 502);
    const current = await currentResponse.json();
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(current.content.replace(/\s/g, '')), c => c.charCodeAt(0))));
    if (request.method === 'GET') return json({ sha: current.sha, data, canSave: Boolean(env.GITHUB_TOKEN) });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 500000) return json({ error: '내용은 500KB 이하여야 합니다.' }, 413);
    let submitted;
    try { submitted = JSON.parse(raw); } catch { return json({ error: '저장 요청 형식이 올바르지 않습니다.' }, 400); }
    if (submitted.sha !== current.sha) return json({ error: '다른 곳에서 내용이 바뀌었습니다. 입력 내용을 백업한 뒤 최신 내용을 다시 불러와 주세요. 덮어쓰지 않았습니다.' }, 409);
    try { validate(submitted.data, data); } catch (error) { return json({ error: error.message }, 400); }
    if (JSON.stringify(submitted.data) === JSON.stringify(data)) return json({ sha: current.sha, unchanged: true });
    const bytes = new TextEncoder().encode(JSON.stringify(submitted.data, null, 2) + '\n');
    let binary = ''; for (const b of bytes) binary += String.fromCharCode(b);
    const saved = await github(env, 'PUT', { message: '관리자 페이지에서 포트폴리오 내용 수정', branch: 'main', sha: current.sha, content: btoa(binary) });
    if (!saved.ok) return json({ error: saved.status === 409 || saved.status === 422 ? '저장 중 충돌이 발생했습니다. 최신 내용을 확인해 주세요. 입력 내용은 유지됩니다.' : `GitHub 저장에 실패했습니다 (${saved.status}). 토큰 권한·만료 여부를 확인해 주세요.` }, saved.status === 409 || saved.status === 422 ? 409 : 502);
    const commit = await saved.json();
    return json({ sha: commit.content.sha, commit: commit.commit.html_url, deployment: 'https://github.com/Martinel2/Martinel2.github.io/actions' });
  } catch { return json({ error: '연결 중 오류가 발생했습니다. 입력 내용은 유지됩니다. 저장 여부는 GitHub 변경 이력에서 확인해 주세요.' }, 502); }
}
