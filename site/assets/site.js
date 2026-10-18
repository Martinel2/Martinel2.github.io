// Keep the current section and referral query when changing language.
const languageSwitch = document.querySelector('.language-switch');
if (languageSwitch) {
  const syncLanguageLink = () => {
    const target = new URL(languageSwitch.href);
    target.hash = location.hash;
    target.search = location.search;
    languageSwitch.href = target.href;
  };
  syncLanguageLink();
  window.addEventListener('hashchange', syncLanguageLink);
}
// Preserve previously shared case links after the homepage split.
if ((location.pathname === '/' || location.pathname === '/en/' || location.pathname.endsWith('/index.html')) && /^#(?:fruition-|pilltip-)/.test(location.hash)) location.replace('portfolio.html' + location.search + location.hash);
// The dashboard is private in Google Analytics; no analytics credentials live here.
const measurementId = document.querySelector('meta[name="ga-measurement-id"]')?.content;
if (/^G-[A-Z0-9]+$/.test(measurementId || '')) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  const params = new URLSearchParams(location.search);
  // Keep only well-formed UTM parameters in the reported URL: GA4 reads campaigns from
  // page_location, while any other query values stay out of analytics.
  const utm = new URLSearchParams();
  for (const [key, value] of params) {
    if (/^utm_(source|medium|campaign|term|content)$/.test(key) && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) utm.append(key, value);
  }
  const config = {
    page_location: location.origin + location.pathname + (utm.size ? `?${utm}` : ''),
    page_referrer: document.referrer.split(/[?#]/)[0],
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  };
  for (const field of ['source', 'medium', 'campaign']) {
    const value = params.get(`utm_${field}`);
    if (value && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) {
      config[field === 'campaign' ? 'campaign_name' : `campaign_${field}`] = value;
    }
  }
  window.gtag('js', new Date());
  window.gtag('config', measurementId, config);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(script);
}

document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link?.matches('.resume-download')) window.gtag?.('event', 'resume_download');
  if (link?.getAttribute('href')?.startsWith('mailto:')) window.gtag?.('event', 'contact_click');
  if (link?.closest('.project-figure')) window.gtag?.('event', 'project_image_open', { image: link.getAttribute('href').split('/').pop() });
});

// Links shared before each case got its own page (portfolio.html#<case>) open that case's page.
if (document.body.classList.contains('portfolio-index') && /^#(?:fruition|pilltip)-[a-z0-9-]+$/.test(location.hash) && document.getElementById(location.hash.slice(1))?.matches('.case-item')) {
  location.replace('portfolio/' + location.hash.slice(1) + '.html' + location.search);
}

// The contents marks where the reader is: a case on the combined page, a section or step on a case page.
const tocLinks = [...document.querySelectorAll('.toc a[href^="#"]')];
const tocTargets = tocLinks.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean);
// Analytics: count a case once it has been on screen.
const shownCases = [...document.querySelectorAll('.case')];
if (shownCases.length) {
  const viewed = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || viewed.has(entry.target.id)) continue;
      window.gtag?.('event', 'view_case', { case_id: entry.target.id });
      viewed.add(entry.target.id);
    }
  }, { rootMargin: '-5% 0px -65% 0px' });
  shownCases.forEach(target => observer.observe(target));
}
// The contents marks the last section whose top has passed a line a third down the screen;
// at the very bottom, the last section, which can never scroll that far up.
if (tocTargets.length) {
  const markCurrent = () => {
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    const passed = tocTargets.filter(t => t.getBoundingClientRect().top <= innerHeight * 0.35);
    const current = atBottom ? tocTargets.at(-1) : passed.at(-1);
    for (const link of tocLinks) {
      if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  let queued = false;
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; markCurrent(); }); } }, { passive: true });
  addEventListener('resize', markCurrent);
  markCurrent();
}

async function renderDiagrams() {
  const diagrams = [...document.querySelectorAll('.mermaid')];
  if (!diagrams.length) return;
  // Read the sources first: Mermaid can render the blocks on its own once loaded, replacing their text.
  const sources = diagrams.map(d => d.textContent);
  try {
    const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.esm.min.mjs');
    await document.fonts.ready;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base',
      themeVariables: { fontFamily: 'sans-serif', fontSize: '13px', primaryColor: '#ffffff',
        primaryTextColor: '#243650', primaryBorderColor: '#c0cde3', lineColor: '#8b9ab4',
        secondaryColor: '#eef3ff', tertiaryColor: '#f7f9fd' },
      flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: true, nodeSpacing: 20, rankSpacing: 30 }
    });
    for (let i = 0; i < diagrams.length; i++) {
      const { svg } = await mermaid.render(`diagram-${i}`, sources[i]);
      diagrams[i].innerHTML = svg;
      const rendered = diagrams[i].querySelector('svg');
      rendered.setAttribute('role', 'img');
      rendered.setAttribute('aria-label', diagrams[i].closest('figure').querySelector('.diagram-caption').textContent);
    }
    document.documentElement.dataset.diagrams = 'ready';
  } catch (error) {
    // Keep the Mermaid source and prose readable when the CDN is unavailable.
    document.documentElement.dataset.diagrams = 'fallback';
    console.warn('구조도 원문을 표시합니다.', error);
  }
}
renderDiagrams();

// Keep ordinary resume links as the fallback when JavaScript is unavailable.
for (const link of document.querySelectorAll('.home-project a[href^="resume.html#"]')) {
  const dialog = document.getElementById(link.hash.slice(1) + '-dialog');
  if (!dialog) continue;
  link.setAttribute('aria-haspopup', 'dialog');
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dialog.showModal();
    dialog.scrollTop = 0;
  });
}
for (const dialog of document.querySelectorAll('.project-dialog')) {
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
}

const resumeTrigger = document.querySelector('.home-actions a[href^="resume.pdf"]');
if (resumeTrigger) {
  resumeTrigger.setAttribute('aria-haspopup', 'dialog');
  resumeTrigger.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    document.getElementById('resume-format-dialog').showModal();
  });
}

// Diagrams and lazy images can grow the page while an index link scrolls, leaving the view short
// of its target. Once scrolling stops, move on to the target again until it is in place.
document.querySelector('.toc nav')?.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  const target = link && document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!target) return;
  let tries = 0;
  const settle = () => {
    const margin = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    if (Math.abs(target.getBoundingClientRect().top - margin) > 40 && !atBottom && tries++ < 3) {
      target.scrollIntoView({ behavior: 'smooth' });
      wait();
    }
  };
  const wait = () => {
    if ('onscrollend' in window) window.addEventListener('scrollend', settle, { once: true });
    else setTimeout(settle, 1200);
  };
  wait();
});


// Wiki graph in the home hero: hovering or focusing a node lights it, its neighbours and the edges between them.
const graph = document.querySelector('.wiki-graph');
if (graph) {
  const nodes = [...graph.querySelectorAll('.node')];
  const lines = [...graph.querySelectorAll('line')];
  // Hovering me lights everything I built; any other node lights itself and its direct neighbours.
  const light = id => {
    const near = new Set(id === 'me' ? nodes.map(n => n.dataset.id) : id ? [id, ...lines.flatMap(l => l.dataset.a === id ? [l.dataset.b] : l.dataset.b === id ? [l.dataset.a] : [])] : []);
    for (const n of nodes) { n.classList.toggle('active', n.dataset.id === id); n.classList.toggle('lit', near.has(n.dataset.id)); }
    for (const l of lines) l.classList.toggle('lit', id === 'me' ? true : l.dataset.a === id || l.dataset.b === id);
  };
  for (const n of nodes) {
    n.addEventListener('pointerenter', () => light(n.dataset.id));
    n.addEventListener('focus', () => light(n.dataset.id));
    n.addEventListener('pointerleave', () => light(null));
    n.addEventListener('blur', () => light(null));
  }
}

// The companion stays hidden on the first screen, sits at a desk in the corner while the visitor reads
// on phones too, small, since its lines hold the easter egg's first clue.
const companion = document.querySelector('.companion');
if (companion) {
  const hero = document.querySelector('.home-hero');
  const update = () => {
    const end = innerHeight + scrollY >= document.documentElement.scrollHeight - 60;
    const past = scrollY > hero.offsetHeight * 0.6;
    // At the very bottom it steps aside for the one hanging from the clouds.
    companion.dataset.state = !end && past ? 'sit' : 'away';
  };
  update();
  addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  addEventListener('resize', update);
}

// Characters speak in a small bubble when clicked.
const say = (who, text, ms = 2600) => {
  const bubble = who.querySelector('.bubble');
  bubble.textContent = text; bubble.classList.add('on');
  clearTimeout(who.sayTimer); who.sayTimer = setTimeout(() => bubble.classList.remove('on'), ms);
};
const standing = document.querySelector('.hero-character');
const quest = document.querySelector('.graph-quest');
const questText = quest ? JSON.parse(quest.dataset.texts) : {};
// Easter egg, in order: clicking the role line in the greeting ("AI application developer") asks a question,
// and the logo answers it, which wakes it up; until then no character reacts. Then hear out every line of the
// character at the desk (bottom right while reading), which points to the one hanging from the clouds at the
// bottom; that one opens a puzzle in the graph; joining the two projects' path adds me to the graph and the
// character on the hills gives a V-sign. Progress is kept in this browser, so a visitor picks up where they left.
const ASKED = 1, AWAKE = 2, TALKED = 3, UNLOCKED = 4, SOLVED = 5;
let eggLevel = 0;
try { eggLevel = Number(localStorage.getItem('egg-progress')) || 0; } catch {}
const reach = level => {
  if (eggLevel >= level) return;
  eggLevel = level;
  try { localStorage.setItem('egg-progress', level); } catch {}
};
let stage = 0; // 0 not started, 1 puzzle open, 2 solved
standing?.addEventListener('click', () => { if (stage) say(standing, stage === 2 ? questText.questSolvedHint : questText.questHint); });

const meNode = document.querySelector('.me-node');
const cooking = document.getElementById('cooking-dialog');
const buddy = document.querySelector('.companion-figure');
const trigger = document.querySelector('.egg-trigger');
if (meNode && cooking && buddy && quest && trigger) {
  const wiki = meNode.closest('.wiki-graph');
  const whisper = document.querySelector('.egg-whisper');
  const ask = whisper.textContent;
  const flash = text => {
    whisper.textContent = text;
    whisper.classList.remove('on'); void whisper.offsetWidth; whisper.classList.add('on');
    clearTimeout(whisper.hideTimer); whisper.hideTimer = setTimeout(() => whisper.classList.remove('on'), 3300);
  };
  // Each line stops showing once the visitor has found the step after it.
  const question = () => {
    if (eggLevel >= AWAKE) return;
    flash(ask);
    reach(ASKED);
  };
  trigger.addEventListener('click', question);
  trigger.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); question(); } });
  if (eggLevel >= AWAKE) document.body.classList.add('egg-awake');
  document.querySelector('.identity')?.addEventListener('click', e => {
    if (eggLevel < ASKED || eggLevel >= TALKED) return;
    e.preventDefault();
    flash(whisper.dataset.human);
    if (eggLevel >= AWAKE) return;
    reach(AWAKE);
    document.body.classList.add('egg-awake');
    window.gtag?.('event', 'easter_egg_wake');
  });
  const path = ['fruition', 'rag', 'chatbot', 'pilltip'];
  let step = 0;
  const node = id => wiki.querySelector(`.node[data-id="${id}"]`);
  const edge = (a, b) => wiki.querySelector(`line[data-a="${a}"][data-b="${b}"], line[data-a="${b}"][data-b="${a}"]`);
  const show = text => { quest.hidden = false; quest.textContent = text; };
  const progress = () => show(questText.questProgress);
  const busy = JSON.parse(buddy.dataset.busy);
  // A pose for each busy line, in the same order; the last one sends it back to thinking.
  const poses = ['cushion', 'think', 'stuck', 'coffee', 'think'];
  const pose = buddy.querySelector('img');
  let line = eggLevel >= UNLOCKED ? busy.length : 0;
  buddy.addEventListener('click', () => {
    if (eggLevel < AWAKE) return;
    reach(TALKED);
    pose.src = pose.src.replace(/[^/]+\.webp$/, `${poses[Math.min(line, busy.length)]}.webp`);
    if (line < busy.length) { say(buddy, busy[line++]); return; }
    reach(UNLOCKED);
    say(buddy, buddy.dataset.done, 3600);
  });
  const hanger = document.querySelector('.hanging');
  hanger?.addEventListener('click', () => {
    if (eggLevel < UNLOCKED) return;
    if (stage > 0) { say(hanger, stage === 1 ? questText.questHint : questText.questSolvedHint); return; }
    stage = 1;
    say(hanger, hanger.dataset.reveal, 1800);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => {
      scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
      wiki.classList.add('puzzle');
      progress();
      setTimeout(() => say(standing, questText.questHint, 4000), still ? 0 : 900);
      window.gtag?.('event', 'easter_egg_quest');
    }, still ? 0 : 1000);
  });
  // Light what a node connects to and keep it lit: the next step is one of those.
  const glowFrom = id => {
    wiki.querySelectorAll('.near').forEach(el => el.classList.remove('near'));
    if (!id) return;
    for (const l of wiki.querySelectorAll('line')) {
      if (l.dataset.a !== id && l.dataset.b !== id) continue;
      l.classList.add('near');
      node(l.dataset.a === id ? l.dataset.b : l.dataset.a)?.classList.add('near');
    }
  };
  // Once solved, the graph makes room: I sit between the two projects and the other nodes drift apart.
  const relayout = instant => {
    const pos = {}, home = {};
    for (const n of wiki.querySelectorAll('.node[data-id]')) {
      if (n === meNode) continue;
      const c = n.querySelector('circle');
      pos[n.dataset.id] = { x: c.cx.baseVal.value, y: c.cy.baseVal.value, vx: 0, vy: 0 };
      home[n.dataset.id] = { ...pos[n.dataset.id] };
    }
    const meCircle = meNode.querySelector('.me-ring');
    const me = { x: meCircle.cx.baseVal.value, y: meCircle.cy.baseVal.value };
    const lines = [...wiki.querySelectorAll('line')];
    const springs = lines.filter(l => l.dataset.a !== 'me').map(l => [l.dataset.a, l.dataset.b, Math.hypot(home[l.dataset.a].x - home[l.dataset.b].x, home[l.dataset.a].y - home[l.dataset.b].y)]);
    const ids = Object.keys(pos);
    const tick = () => {
      for (const id of ids) {
        const p = pos[id];
        let fx = (home[id].x - p.x) * 0.02, fy = (home[id].y - p.y) * 0.02;
        const dx = p.x - me.x, dy = p.y - me.y, d = Math.hypot(dx, dy) || 1;
        if (d < 110) { fx += dx / d * (110 - d) * 0.25; fy += dy / d * (110 - d) * 0.25; }
        for (const other of ids) {
          if (other === id) continue;
          const ox = p.x - pos[other].x, oy = p.y - pos[other].y, od = Math.hypot(ox, oy) || 1;
          if (od < 55) { fx += ox / od * (55 - od) * 0.15; fy += oy / od * (55 - od) * 0.15; }
        }
        for (const [a, b, rest] of springs) {
          if (a !== id && b !== id) continue;
          const o = pos[a === id ? b : a], sx = o.x - p.x, sy = o.y - p.y, sd = Math.hypot(sx, sy) || 1;
          fx += sx / sd * (sd - rest) * 0.05; fy += sy / sd * (sd - rest) * 0.05;
        }
        p.vx = (p.vx + fx) * 0.8; p.vy = (p.vy + fy) * 0.8;
      }
      for (const id of ids) {
        const p = pos[id];
        p.x = Math.min(545, Math.max(25, p.x + p.vx)); p.y = Math.min(425, Math.max(15, p.y + p.vy));
      }
    };
    const draw = () => {
      for (const id of ids) {
        const n = node(id), c = n.querySelector('circle'), t = n.querySelector('text');
        const lift = c.cy.baseVal.value - t.y.baseVal[0].value;
        c.setAttribute('cx', pos[id].x.toFixed(1)); c.setAttribute('cy', pos[id].y.toFixed(1));
        t.setAttribute('x', pos[id].x.toFixed(1)); t.setAttribute('y', (pos[id].y - lift).toFixed(1));
      }
      for (const l of lines) {
        const a = l.dataset.a === 'me' ? me : pos[l.dataset.a], b = pos[l.dataset.b];
        l.setAttribute('x1', a.x.toFixed(1)); l.setAttribute('y1', a.y.toFixed(1));
        l.setAttribute('x2', b.x.toFixed(1)); l.setAttribute('y2', b.y.toFixed(1));
      }
    };
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) { for (let i = 0; i < 90; i++) tick(); draw(); return; }
    let frame = 0;
    const run = () => { tick(); draw(); if (++frame < 90) requestAnimationFrame(run); };
    requestAnimationFrame(run);
  };
  // While the puzzle is open, node clicks walk the path instead of opening the case.
  wiki.addEventListener('click', event => {
    if (stage !== 1) return;
    const hit = event.target.closest('.node[data-id]');
    if (!hit || hit === meNode) return;
    event.preventDefault();
    const id = hit.dataset.id;
    if (id === path[step]) {
      hit.classList.add('found');
      if (step > 0) edge(path[step - 1], id)?.classList.add('found');
      step++;
      progress();
      glowFrom(step < path.length ? id : null);
      if (step === path.length) {
        stage = 2;
        reach(SOLVED);
        wiki.classList.remove('puzzle');
        // Light spreads out from the path, hop by hop, until the whole graph is lit; only then do I appear.
        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const all = [...wiki.querySelectorAll('line')].filter(l => l.dataset.a !== 'me');
        const seen = new Set(path);
        let wave = [...path], hop = 0;
        while (wave.length) {
          const next = [];
          for (const id of wave) for (const l of all) {
            const other = l.dataset.a === id ? l.dataset.b : l.dataset.b === id ? l.dataset.a : null;
            if (other === null) continue;
            setTimeout(() => l.classList.add('near'), still ? 0 : hop * 140);
            if (!seen.has(other)) { seen.add(other); next.push(other); setTimeout(() => node(other)?.classList.add('near'), still ? 0 : hop * 140 + 70); }
          }
          wave = next; hop++;
        }
        const lit = still ? 0 : hop * 140 + 500;
        setTimeout(() => {
          // The whole graph stays lit in yellow from here on, the path included.
          wiki.classList.add('solved');
          show(questText.questDone);
          relayout();
          setTimeout(() => { wiki.classList.add('with-me'); meNode.tabIndex = 0; standing.classList.add('cheer'); say(standing, questText.questDone, 3000); window.gtag?.('event', 'easter_egg_me'); }, still ? 0 : 400);
        }, lit);
      }
      return;
    }
    step = 0;
    glowFrom(null);
    wiki.querySelectorAll('.found').forEach(el => el.classList.remove('found'));
    wiki.classList.remove('wrong'); void wiki.getBoundingClientRect(); wiki.classList.add('wrong');
    show(questText.questWrong);
    say(standing, questText.questWrong);
  });
  // A visitor who solved it before comes back to the finished graph, without replaying the light.
  if (eggLevel >= SOLVED) {
    stage = 2;
    for (const id of path) node(id)?.classList.add('found');
    path.slice(1).forEach((id, i) => edge(path[i], id)?.classList.add('found'));
    wiki.querySelectorAll('line:not([data-a="me"]), .node[data-id]').forEach(el => { if (el !== meNode && !path.includes(el.dataset.id)) el.classList.add('near'); });
    wiki.classList.add('solved', 'with-me');
    relayout(true);
    meNode.tabIndex = 0;
    standing.classList.add('cheer');
  }
  const open = () => { cooking.showModal(); window.gtag?.('event', 'easter_egg_open'); };
  meNode.addEventListener('click', open);
  meNode.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  const topics = [...cooking.querySelectorAll('.cooking-graph .node[data-cat]')];
  const pick = t => {
    for (const n of topics) { const on = n === t; n.classList.toggle('active', on); n.setAttribute('aria-pressed', String(on)); }
    for (const g of cooking.querySelectorAll('.cooking-grid')) g.hidden = g.dataset.cat !== t.dataset.cat;
  };
  for (const t of topics) {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(t); } });
  }
}
