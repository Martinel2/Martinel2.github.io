// Preserve previously shared case links after the homepage split.
if ((location.pathname === '/' || location.pathname.endsWith('/index.html')) && /^#(?:fruition-|pilltip-)/.test(location.hash)) location.replace('portfolio.html' + location.search + location.hash);
// The dashboard is private in Google Analytics; no analytics credentials live here.
const measurementId = document.querySelector('meta[name="ga-measurement-id"]')?.content;
if (/^G-[A-Z0-9]+$/.test(measurementId || '')) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  const params = new URLSearchParams(location.search);
  const config = {
    page_location: location.origin + location.pathname,
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

const cases = [...document.querySelectorAll('.case')];
if (cases.length) {
  const links = [...document.querySelectorAll('.toc nav a')];
  const viewed = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (!viewed.has(entry.target.id)) {
        window.gtag?.('event', 'view_case', { case_id: entry.target.id });
        viewed.add(entry.target.id);
      }
      for (const link of links) {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-5% 0px -65% 0px' });
  cases.forEach(section => observer.observe(section));
}

async function renderDiagrams() {
  const diagrams = [...document.querySelectorAll('.mermaid')];
  if (!diagrams.length) return;
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
      const { svg } = await mermaid.render(`diagram-${i}`, diagrams[i].textContent);
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
