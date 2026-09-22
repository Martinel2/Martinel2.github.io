document.querySelector('.print-button')?.addEventListener('click', () => window.print());

const cases = [...document.querySelectorAll('.case')];
if (cases.length) {
  const links = [...document.querySelectorAll('.toc nav a')];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
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
