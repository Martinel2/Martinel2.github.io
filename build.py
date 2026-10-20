# -*- coding: utf-8 -*-
"""Generate static, readable pages. Run: python3 build.py"""
import json
import hashlib
import os
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"
ASSETS = SITE / "assets"
LANG = "ko"
UI_EN = json.loads((ROOT / "ui.en.json").read_text())

def localize_ui(html):
    # Translate only text and descriptive attributes, never URLs or identifiers.
    def translated(match):
        value = match[0]
        for ko, en in sorted(UI_EN.items(), key=lambda item: -len(item[0])):
            value = value.replace(ko, en)
        return value
    return re.sub(r'>[^<>]*<|(?:alt|aria-label|download|content)="[^"]*"', translated, html)

DATA = json.loads((ROOT / "content.json").read_text())
CONTENT_VERSION = hashlib.sha256((ROOT / "content.json").read_bytes() + (ROOT / "templates/resume-pdf.css").read_bytes() + (ROOT / "scripts/build-resume-pdf.mjs").read_bytes() + (ROOT / "scripts/build-resume-docx.mjs").read_bytes()).hexdigest()[:10]


def resume_text(value):
    text = escape(value)
    return re.sub(r'(?m)^(문제|해결|성과|판단|Problem|Solution|Result|Decision):[ \t]*', r'<strong class="field-label" data-label="\1">\1:</strong> ', text)


# Layered hills that close the dark sky band at the top of home and portfolio.
HILLS = ('<svg class="hills" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
         '<path class="hill-back" d="M0 92C120 40 250 30 380 70S600 140 760 96 1010 18 1170 52 1360 96 1440 70V200H0Z"/>'
         '<path class="hill-mid" d="M0 140C160 96 300 104 470 132S760 168 930 128 1210 92 1440 128V200H0Z"/>'
         '<path class="hill-front" d="M0 178C210 150 420 160 640 170S1080 146 1440 168V200H0Z"/></svg>')


# The hero's live part: a small Wiki graph of my projects and the tools behind them.
# Hovering a node lights it and the nodes it connects to.
GRAPH_NODES = [
    ('fruition', 'Fruition', 'Fruition', 170, 150, 1), ('wiki', 'LLM Wiki', 'LLM Wiki', 100, 85, 0), ('pdf', 'PDF 변환', 'PDF conversion', 45, 40, 0),
    ('anydoc', 'AnyDoc', 'AnyDoc', 40, 135, 0), ('skill', 'Agent Skill', 'Agent Skill', 95, 220, 0), ('langgraph', 'LangGraph', 'LangGraph', 40, 275, 0),
    ('postgres', 'PostgreSQL', 'PostgreSQL', 115, 305, 0), ('rollback', '작업 취소', 'Undo', 185, 290, 0), ('kafka', 'Kafka', 'Kafka', 245, 75, 0),
    ('worker', 'Worker', 'Worker', 320, 35, 0), ('msa', 'MSA', 'MSA', 175, 40, 0), ('eks', 'EKS', 'EKS', 100, 20, 0),
    ('rag', 'RAG', 'RAG', 300, 190, 0), ('bge', 'BGE-M3', 'BGE-M3', 380, 120, 0), ('bm25', 'BM25', 'BM25', 450, 160, 0), ('jev', 'Jev', 'Jev', 395, 205, 0),
    ('chatbot', '복약 챗봇', 'Med chatbot', 365, 285, 0), ('springai', 'Spring AI', 'Spring AI', 480, 245, 0), ('weaviate', 'Weaviate', 'Weaviate', 300, 350, 0),
    ('pilltip', 'Pilltip', 'Pilltip', 450, 335, 1), ('data', '의약품 정제', 'Drug data', 500, 400, 0), ('batch', 'Batch API', 'Batch API', 410, 420, 0),
    ('pyspark', 'PySpark', 'PySpark', 545, 335, 0),
]
# Fruition's answers and Pilltip's chatbot both run on RAG, so RAG sits between the two projects.
GRAPH_EDGES = [('fruition', 'wiki'), ('wiki', 'pdf'), ('pdf', 'anydoc'), ('fruition', 'skill'), ('skill', 'langgraph'), ('skill', 'postgres'),
               ('skill', 'rollback'), ('fruition', 'kafka'), ('kafka', 'worker'), ('fruition', 'msa'), ('msa', 'eks'), ('fruition', 'rag'),
               ('rag', 'bge'), ('rag', 'bm25'), ('rag', 'jev'), ('rag', 'chatbot'), ('chatbot', 'springai'), ('chatbot', 'weaviate'),
               ('pilltip', 'chatbot'), ('pilltip', 'data'), ('data', 'batch'), ('data', 'pyspark')]

# Where each node leads: the portfolio case where that tool or feature does its work.
NODE_LINKS = {'fruition': 'project-fruition', 'pilltip': 'project-pilltip',
              'wiki': 'fruition-ingest', 'kafka': 'fruition-ingest', 'worker': 'fruition-ingest',
              'pdf': 'fruition-document', 'anydoc': 'fruition-document',
              'rag': 'fruition-jev-evidence', 'bge': 'fruition-jev-evidence', 'bm25': 'fruition-jev-evidence', 'jev': 'fruition-jev-evidence',
              'skill': 'fruition-agent', 'langgraph': 'fruition-agent', 'postgres': 'fruition-agent', 'rollback': 'fruition-rollback',
              'msa': 'fruition-agent-loop', 'eks': 'fruition-agent-loop',
              'chatbot': 'pilltip-personalization', 'springai': 'pilltip-personalization', 'weaviate': 'pilltip-personalization',
              'data': 'pilltip-data', 'batch': 'pilltip-data', 'pyspark': 'pilltip-data'}


def graph_svg():
    pos = {n[0]: n for n in GRAPH_NODES}
    edges = ''.join(f'<line data-a="{a}" data-b="{b}" x1="{pos[a][3]}" y1="{pos[a][4]}" x2="{pos[b][3]}" y2="{pos[b][4]}"/>' for a, b in GRAPH_EDGES)
    nodes = ''.join(f'<a class="node{" hub" if hub else ""}" data-id="{i}" href="portfolio/{NODE_LINKS[i].removeprefix("project-")}.html"><circle cx="{x}" cy="{y}" r="{12 if hub else 7}"/><text x="{x}" y="{y - (20 if hub else 14)}">{escape(en if LANG == "en" else ko)}</text></a>' for i, ko, en, x, y, hub in GRAPH_NODES)
    label = 'Graph of my projects and tools' if LANG == 'en' else '프로젝트와 기술의 관계 그래프'
    # Easter egg: solving the puzzle adds me in the middle, wired to both projects.
    egg = DATA['home']['easterEgg']
    # I take the spot between the two projects; site.js moves the other nodes to make room.
    hubs = [(x, y) for i, _, _, x, y, hub in GRAPH_NODES if hub]
    mx, my = (hubs[0][0] + hubs[1][0]) // 2, (hubs[0][1] + hubs[1][1]) // 2
    me_edges = ''.join(f'<line data-a="me" data-b="{i}" x1="{mx}" y1="{my}" x2="{x}" y2="{y}" pathLength="1"/>' for i, _, _, x, y, hub in GRAPH_NODES if hub)
    me = (f'<g class="node hub me-node" data-id="me" tabindex="-1" role="button" aria-label="{escape(egg["meLabel"])}, {escape(egg["buttonLabel"])}">'
          f'<clipPath id="me-clip"><circle cx="{mx}" cy="{my}" r="24"/></clipPath><circle class="me-ring" cx="{mx}" cy="{my}" r="27"/>'
          f'<image href="assets/character/face.webp" x="{mx - 24}" y="{my - 24}" width="48" height="48" clip-path="url(#me-clip)"/>'
          f'<text x="{mx}" y="{my + 44}">{escape(egg["meLabel"])}</text></g>')
    return f'<svg class="wiki-graph" viewBox="0 -10 570 445" role="group" aria-label="{label}"><g class="edges me-edges">{me_edges}</g><g class="edges">{edges}</g>{nodes}{me}</svg>'


# Cloud tops that open the sky at the bottom of the home page.
CLOUDS = ('<svg class="clouds" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
          '<path class="cloud-back" d="M0 70C70 30 150 34 210 66 260 22 360 14 420 58 500 6 640 10 690 62 760 30 860 36 910 70 990 16 1120 12 1180 60 1250 30 1350 34 1440 64V140H0Z"/>'
          '<path class="cloud-front" d="M0 104C90 70 190 74 250 100 320 66 430 60 500 96 580 58 700 56 770 94 850 64 960 62 1030 96 1110 60 1230 58 1300 92 1360 76 1410 78 1440 88V140H0Z"/></svg>')


def hanging():
    """Me hanging upside down from the clouds at the end of the home page: clicking starts the easter egg."""
    egg = DATA['home']['easterEgg']
    label = 'Jaehyeong, hanging from the clouds' if LANG == 'en' else '구름에 매달린 김재형'
    return (f'<div class="sky-end">{CLOUDS}<button type="button" class="hanging" aria-label="{label}" data-reveal="{escape(egg["reveal"])}" data-start="{escape(egg["hangStart"])}" data-name="{escape(egg["hangName"])}" data-desk="{escape(egg["hangDesk"])}">'
            f'<span class="bubble" aria-live="polite"></span><img src="assets/character/stand.webp" alt="" width="285" height="480" loading="lazy"></button></div>')


def greeting_html():
    """The greeting, with its role line as the easter egg's hidden switch: plain text until someone clicks it."""
    first, _, role = home_text('hero', 'greeting').partition('\n')
    return f'{first}<br><span class="egg-trigger" role="button" tabindex="0">{role}</span>' if role else first


def quest():
    """The easter egg puzzle's progress line under the graph, filled in by site.js once the puzzle starts."""
    egg = DATA['home']['easterEgg']
    texts = {k: egg[k] for k in ('questHint', 'questProgress', 'questWrong', 'questDone', 'questSolvedHint')}
    return f'<p class="graph-quest" aria-live="polite" hidden data-texts="{escape(json.dumps(texts, ensure_ascii=False))}"></p>'


def character():
    """Illustrated me standing on the hills; a click gets a hint about the bottom of the page."""
    label = 'Jaehyeong, illustrated' if LANG == 'en' else '김재형 캐릭터'
    return f'<button type="button" class="hero-character" aria-label="{label}"><span class="bubble" aria-live="polite"></span><img class="pose-stand" src="assets/character/stand.webp" alt="" width="285" height="480"><img class="pose-peace" src="assets/character/peace.webp" alt="" width="264" height="480" loading="lazy"></button>'


def companion():
    """The same character keeps the visitor company at a desk while they read; a click gets a line about its work."""
    egg = DATA['home']['easterEgg']
    label = 'Jaehyeong, illustrated' if LANG == 'en' else '김재형 캐릭터'
    busy = escape(json.dumps(egg['busy'], ensure_ascii=False))
    poses = '<img class="pose-think" src="assets/character/think.webp" alt="" width="262" height="480" loading="lazy">'
    return f'<div class="companion" data-state="away"><button type="button" class="companion-figure" aria-label="{label}" data-busy="{busy}" data-done="{escape(egg["busyDone"])}" data-listened="{escape(egg["listenDone"])}"><span class="bubble" aria-live="polite"></span>{poses}</button></div>'


def cooking_dialog():
    """The easter egg itself: a small graph of what I cook, each topic opening its photos."""
    egg = DATA['home']['easterEgg']
    cats = egg['categories']
    cx, cy, spots = 210, 105, [(70, 40), (350, 40), (55, 165), (365, 165), (210, 200)]
    lines = ''.join(f'<line x1="{cx}" y1="{cy}" x2="{x}" y2="{y}"/>' for x, y in spots[:len(cats)])
    nodes = ''.join(f'<g class="node{" active" if n == 0 else ""}" data-cat="{n}" tabindex="0" role="button" aria-pressed="{"true" if n == 0 else "false"}"><circle cx="{x}" cy="{y}" r="9"/><text x="{x}" y="{y - 16}">{escape(c["name"])} {len(c["photos"])}</text></g>' for n, (c, (x, y)) in enumerate(zip(cats, spots)))
    graph = f'<svg class="wiki-graph cooking-graph" viewBox="0 0 420 225" role="group" aria-label="{escape(egg["topic"])}"><g class="edges">{lines}</g>{nodes}<g class="node hub lit"><circle cx="{cx}" cy="{cy}" r="16"/><text x="{cx}" y="{cy - 26}">{escape(egg["topic"])}</text></g></svg>'
    grids = ''.join(f'<div class="cooking-grid" data-cat="{n}"{"" if n == 0 else " hidden"}>' + ''.join(f'<img src="{escape(src)}" alt="{escape(next((ph["alt"] for ph in egg["photos"] if ph["src"] == src), c["name"]))}" loading="lazy">' for src in c['photos']) + '</div>' for n, c in enumerate(cats))
    poses = ''.join(f'<img src="assets/character/{name}.webp" alt="" loading="lazy">' for name in ('stand', 'peace', 'think', 'cushion', 'coffee', 'stuck', 'broke', 'boxes', 'camera', 'sweep'))
    return f'<dialog class="project-dialog cooking-dialog" id="cooking-dialog" aria-label="{escape(egg["title"])}"><form method="dialog"><button class="button" autofocus>닫기 ×</button></form><p>{escape(egg["text"])}</p><div class="pose-strip" aria-hidden="true">{poses}</div>{graph}{grids}</dialog>'


def home_text(group, key):
    return escape(DATA['home'][group][key])


def tags(items):
    return '<div class="tags">' + ''.join(f'<span>{escape(x)}</span>' for x in items) + '</div>'


def picture(item):
    return f'''<figure class="project-figure"><a href="{escape(item['src'])}" target="_blank" rel="noopener" aria-label="{escape(item['alt'])}, 원본 크기로 보기, 새 탭">
<img src="{escape(item['src'])}" alt="{escape(item['alt'])}" width="{item['width']}" height="{item['height']}" loading="lazy" decoding="async"><span class="image-expand">원본 크기로 보기 ↗</span></a>
<figcaption>{escape(item['caption'])}</figcaption></figure>'''


def page(title, description, body, resume=False, path=None, body_class=''):
    if path is None:
        path = 'resume.html' if resume else ('portfolio.html' if title == '포트폴리오' else '')
    measurement_id = os.environ.get('GA_MEASUREMENT_ID', '')
    if measurement_id and not re.fullmatch(r'G-[A-Z0-9]+', measurement_id):
        raise ValueError('GA_MEASUREMENT_ID must be a G- measurement ID')
    analytics_meta = f'<meta name="ga-measurement-id" content="{measurement_id}">' if measurement_id else ''
    switch_path = ('../' if LANG == 'en' else 'en/') + path
    language_switch = f'<a class="language-switch" href="{switch_path}" hreflang="{"ko" if LANG == "en" else "en"}" lang="{"ko" if LANG == "en" else "en"}" aria-label="{"한국어로 보기" if LANG == "en" else "View in English"}">{"한국어" if LANG == "en" else "EN"}</a>'
    html = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | 김재형</title><meta name="description" content="{description}">
<meta name="theme-color" content="#0d0f12"><meta property="og:title" content="{title} | 김재형">
<meta property="og:description" content="{description}"><meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR"><meta property="og:image" content="https://Martinel2.github.io/assets/og.png">
<link rel="canonical" href="https://Martinel2.github.io/{path}"><link rel="icon" href="assets/favicon-32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
{analytics_meta}<link rel="stylesheet" href="assets/style.css?v={hashlib.sha256((ASSETS / 'style.css').read_bytes()).hexdigest()[:10]}"><script defer src="assets/site.js?v={hashlib.sha256((ASSETS / 'site.js').read_bytes()).hexdigest()[:10]}"></script>
</head><body id="top" class="{'resume-page' if resume else ('portfolio-page' if path else 'home-page')}{' ' + body_class if body_class else ''}">
<a class="skip" href="#main">본문으로 바로가기</a>
<header class="header"><a class="identity" href="./" aria-label="김재형 홈"><img src="assets/logo/logo.webp" alt="" width="156" height="42"><img class="logo-lit" src="assets/logo/logo-lit.webp" alt="" width="156" height="42"></a>
<nav aria-label="주 메뉴"><a href="./" {'aria-current="page"' if not path else ''}>{home_text('navigation', 'homeLabel')}</a><a href="./#about">{home_text("navigation", "aboutLabel")}</a><a href="./#skills">{home_text("navigation", "skillsLabel")}</a><a href="./#projects">{home_text("navigation", "projectsLabel")}</a><a href="./#activities">{home_text("navigation", "activitiesLabel")}</a></nav>{language_switch}</header>
<main id="main">{body}</main>
<footer class="site-footer"><span>© {DATA['updated'][:4]} 김재형</span><div class="footer-links"><a href="mailto:kkuldangi2@gmail.com">Email ↗</a><a href="https://github.com/Martinel2">GitHub ↗</a><a href="https://velog.io/@kkuldangi3/posts">Blog ↗</a><a href="https://www.linkedin.com/in/%EC%9E%AC%ED%98%95-%EA%B9%80-b75920345/">LinkedIn ↗</a><a href="#top">맨 위로 ↑</a></div></footer>
</body></html>'''.replace('href="resume.pdf"', f'href="resume.pdf?v={CONTENT_VERSION}"').replace('href="resume.docx"', f'href="resume.docx?v={CONTENT_VERSION}"').replace('href="portfolio.pdf"', f'href="portfolio.pdf?v={CONTENT_VERSION}"')
    alternates = f'<link rel="alternate" hreflang="ko" href="https://martinel2.github.io/{path}"><link rel="alternate" hreflang="en" href="https://martinel2.github.io/en/{path}">'
    html = html.replace('</head>', alternates + '</head>')
    if LANG == 'en':
        html = localize_ui(html).replace('<html lang="ko">', '<html lang="en">').replace('content="ko_KR"', 'content="en_US"')
        html = html.replace(f'rel="canonical" href="https://Martinel2.github.io/{path}"', f'rel="canonical" href="https://Martinel2.github.io/en/{path}"')
        html = re.sub(r'(src|href)="assets/', r'\1="../assets/', html)
    # Case pages live one folder down (portfolio/<id>.html): every relative link climbs one level.
    if '/' in path:
        html = re.sub(r'(src|href)="(?!https?:|mailto:|tel:|#|/|data:)', r'\1="../', html)
    return html


def case_html(c, i, fold_steps=True):
    iterative = 'experiments' in c or 'designSteps' in c
    section_title = escape(c.get('processTitle', '실험과 개선 과정' if iterative else '해결 방안 비교와 선택'))
    if 'designSteps' in c:
        steps = ''.join(f'<li id="{escape(c["id"])}-step-{n}"><h4>' + escape(step['title']) + '</h4>' + ''.join(f'<p><strong>{label}</strong> {escape(step[key])}</p>' for key, label in [('problem', '문제 상황'), ('judgment', '판단'), ('implementation', '구현'), ('verification', '확인한 결과')]) + '</li>' for n, step in enumerate(c['designSteps'], 1))
        process = f'<ol class="experiment-timeline">{steps}</ol>'
    elif iterative:
        steps = ''.join(f'<li id="{escape(c["id"])}-step-{n}"><h4>{escape(title)}</h4><p><strong>문제 상황</strong> {escape(problem)}</p><p><strong>시도와 결과</strong> {escape(observed)}</p><p class="step-judgment"><strong>판단</strong> {escape(judgment)}</p></li>' for n, (title, problem, observed, judgment) in enumerate(c['experiments'], 1))
        process = f'<ol class="experiment-timeline">{steps}</ol>'
    else:
        rows = ''.join('<tr>' + ''.join(f'<td>{escape(v)}</td>' for v in row) + '</tr>' for row in c['options'])
        process = f'''<p class="table-note">각 방안의 기대 효과와 확인한 결과를 비교했습니다. 비용 추산과 설계 검토는 실제 실험 결과와 구분했습니다.</p><div class="table-scroll" tabindex="0" role="region" aria-label="{escape(c['short'])} 해결 방안 비교"><table><thead><tr><th scope="col">해결 방안</th><th scope="col">기대 효과</th><th scope="col">실험 결과</th><th scope="col">채택 여부와 이유</th></tr></thead><tbody>{rows}</tbody></table></div><div class="decision"><span class="eyebrow">WHY THIS APPROACH</span><p>{escape(c['decision'])}</p></div>'''
    implementation = '<ul>' + ''.join(f'<li>{escape(x)}</li>' for x in c['implementation']) + '</ul>' if c.get('implementation') else ''
    next_step = f'<p class="next"><strong>다음 검증</strong> {escape(c["next"])}</p>' if c.get('next') else ''
    metrics = ''.join(f'<div><span>{escape(label)}</span><strong>{escape(value)}</strong><small>{escape(note)}</small></div>' for label, value, note in c['metrics'])
    # The steps are the longest part of a case, so they start folded; the numbers sit up front instead.
    steps = len(c.get('designSteps') or c.get('experiments') or [])
    fold = lambda body: body if not fold_steps else f'<details class="process"><summary>{(f"See all {steps} steps" if LANG == "en" else f"과정 {steps}단계 펼쳐 보기")}</summary>{body}</details>' if steps else body
    glance = ''.join(f'<div><strong>{escape(value)}</strong><span>{escape(label)}</span></div>' for label, value, note in c['metrics'])
    links = ''.join(f'<a class="text-link" href="{escape(link["url"])}">{escape(link["label"])} ↗</a>' for link in c.get('links', []))
    source = f'<p class="source">근거: {escape(c["source"])}</p>' if c.get('source') else ''
    comparison = ''
    if 'comparison' in c:
        table = c['comparison']
        headers = ''.join(f'<th scope="col">{escape(label)}</th>' for label in table['columns'])
        values = ''.join('<tr>' + ''.join(f'<td>{escape(value)}</td>' for value in row) + '</tr>' for row in table['rows'])
        comparison = f'<div class="table-scroll comparison" tabindex="0" role="region" aria-label="{escape(c["short"])} 결과 비교"><table><thead><tr>{headers}</tr></thead><tbody>{values}</tbody></table></div><p class="comparison-note">{escape(table["note"])}</p>'
    return f'''<article class="case" id="{escape(c['id'])}" aria-labelledby="{escape(c['id'])}-title">
<header class="case-header"><div class="case-kicker"><span>CASE {i:02d}</span><span>{escape(c['project'])} / {escape(c['category'])}</span></div><h2 id="{escape(c['id'])}-title">{escape(c['title'])}</h2><p class="case-summary">{escape(c['summary'])}</p>{f'<div class="case-glance">{glance}</div>' if glance else ''}<p class="case-meta">{escape(c['period'])}</p>{tags(c['tags'])}</header>
<section class="case-part" id="{escape(c['id'])}-background"><h3><span>01</span> 배경</h3><p>{escape(c['problem'])}</p>{f'<div class="case-expected"><strong>해결하면 얻는 것</strong><p>{escape(c["expected"])}</p></div>' if c.get('expected') else ''}</section>
<section class="case-part" id="{escape(c['id'])}-process"><h3><span>02</span> {section_title}</h3>{fold(process)}</section>
<section class="case-part" id="{escape(c['id'])}-structure"><h3><span>03</span> {'개선한 처리 흐름' if iterative else '구현과 구조'}</h3>{implementation}{picture(c['image']) if 'image' in c else ''}<figure class="diagram"><figcaption><span>ARCHITECTURE</span><span>Mermaid diagram</span></figcaption><div class="diagram-scroll" tabindex="0" role="region" aria-label="{escape(c['short'])} 구조도"><pre class="mermaid">{escape(c['diagram'])}</pre></div><p class="diagram-caption">{escape(c['diagramCaption'])}</p><details><summary>Mermaid 원문 보기</summary><pre class="diagram-source">{escape(c['diagram'])}</pre></details></figure></section>
<section class="case-part" id="{escape(c['id'])}-result"><h3><span>04</span> 결과와 배운 점</h3><h4>{escape(c['resultTitle'])}</h4><p>{escape(c['result'])}</p>{f'<div class="result-metrics">{metrics}</div>' if metrics else ''}{comparison}<div class="limits"><strong>결과의 범위와 트레이드오프</strong><p>{escape(c['tradeoff'])}</p></div>{next_step}{source}{links}</section>
</article>'''


# The headings inside the beyond section below; ui.en.json translates them.
BEYOND_TITLES = ['Rhwp | HWPX 저장 오류 수정', 'APPTIVE | 백엔드 멘토링', '백준 945일 연속 문제 해결']


def toc_subs(titles):
    """The steps inside an entry, so the contents shows what a case holds."""
    if not titles:
        return ''
    items = ''.join(f'<li>{escape(t)}</li>' for t in titles)
    return f'<ul class="toc-subs">{items}</ul>'


def case_item(c, i, link=None):
    """A case as a card in the portfolio index: what it is, the numbers, and a link to its own page."""
    glance = ''.join(f'<div><strong>{escape(value)}</strong><span>{escape(label)}</span></div>' for label, value, note in c['metrics'][:2])
    link = link or f'@@CASE:{c["id"]}@@'
    glance = f'<div class="case-glance">{glance}</div>' if glance else ''
    return (f'<article class="case-item" id="{escape(c["id"])}"><p class="case-item-kicker"><span>CASE {i:02d}</span> {escape(c["category"])}</p>'
            f'<h3><a href="{link}">{escape(c["title"])}</a></h3><p>{escape(c["summary"])}</p>'
            f'{glance}<a class="read-more" href="{link}">사례 읽기 →</a></article>')


def case_page(c, i, prev, nxt):
    """One case per page, laid out like an article: the header on a sky, the body beside its own contents."""
    article = case_html(c, i, fold_steps=False)
    head = re.search(r'<header class="case-header">(.*?)</header>', article, re.S)
    body = article.replace(head[0], '')
    title = head[1].replace('<h2 ', '<h1 ', 1).replace('</h2>', '</h1>', 1)
    steps = re.findall(r'<li id="([^"]+-step-\d+)"><h4>(.*?)</h4>', body)
    toc = ''
    for sid, label in re.findall(r'<section class="case-part" id="([^"]+)"><h3><span>\d+</span> (.*?)</h3>', body):
        toc += f'<a href="#{sid}">{label}</a>'
        if sid.endswith('-process') and steps:
            toc += '<ul class="toc-subs">' + ''.join(f'<li><a href="#{step}">{name}</a></li>' for step, name in steps) + '</ul>'
    pager = ''.join(f'<a class="{cls}" href="portfolio/{other["id"]}.html"><span>{label}</span><strong>{escape(other["short"])}</strong></a>' for cls, label, other in (('prev', '← 이전 사례', prev), ('next', '다음 사례 →', nxt)) if other)
    return (f'<div class="sky"><header class="case-hero case-header">{title}</header>{HILLS}</div>'
            f'<div class="work-layout"><aside class="toc"><div class="toc-inner"><p class="eyebrow">목차</p><nav aria-label="사례 목차">{toc}</nav>'
            f'<a class="toc-back" href="portfolio.html">← 전체 사례 보기</a></div></aside><div class="cases">{body}</div></div>'
            f'<nav class="case-pager" aria-label="다른 사례">{pager}</nav>')


def portfolio():
    contents = ''
    for i, c in enumerate(DATA['cases'], 1):
        if i == 1 or DATA['cases'][i - 2]['project'] != c['project']:
            contents += f'<p class="toc-group">{escape(c["project"])}</p>'
        contents += f'<a href="@@CASE:{c["id"]}@@"><span>{i:02d}</span><span><small>{escape(c["project"])}</small>{escape(c["short"])}</span><span class="toc-arrow">↗</span></a>'
    project_sections, index_sections = [], []
    seen = set()
    for i, c in enumerate(DATA['cases'], 1):
        if c['project'] not in seen:
            project = next(p for p in DATA['projects'] if p['name'] == c['project'])
            contributions = ''.join(f'<div><dt>{escape(title)}</dt><dd>{escape(description)}</dd></div>' for title, description in project['contributions'])
            # My own row stands out; the rest of the team reads as supporting context.
            is_me = lambda role: '본인' in role or '(me)' in role
            my_work = '<ul class="me-work">' + ''.join(f'<li><b>{escape(title)}</b><span>{escape(description)}</span></li>' for title, description in project['contributions']) + '</ul>'
            team = ''.join(f'<div class="me"><dt><span class="me-badge">MY ROLE</span>{escape(role.replace(" (본인)", "").replace(" (me)", ""))}</dt><dd><p class="me-summary">{escape(work)}</p>{my_work}</dd></div>' if is_me(role) else f'<div><dt>{escape(role)}</dt><dd>{escape(work)}</dd></div>' for role, work in project['team'])
            links = ''.join(f'<a class="text-link" href="{escape(link["url"])}">{escape(link["label"])} ↗</a>' for link in project.get('links', []))
            gallery = ''.join(picture(item) for item in project['gallery'])
            project_section = (f'<section class="project-context" id="project-{project["name"].lower()}" aria-label="{escape(project["name"]) } 프로젝트 소개"><header class="project-head"><p class="eyebrow">PROJECT OVERVIEW</p><h2>{escape(project["name"]) }</h2><p>{escape(project["description"]) }</p></header><h3>시작 계기</h3><p class="project-origin">{escape(project["origin"])} {escape(project["goal"])}</p><h3>팀 구성과 내 역할</h3><dl class="contribution-list team-list">{team}</dl>{links}<h3>담당 기능과 서비스 화면</h3><p class="gallery-note">팀 발표 자료의 서비스 화면과 구조입니다. 각 설명에 제 담당 범위를 표시했습니다. 이미지를 누르면 원본 크기로 볼 수 있습니다.</p><div class="project-gallery">{gallery}</div></section>')
            project_sections.append(project_section)
            index_sections.append(project_section)
            seen.add(c['project'])
        project_sections.append(case_html(c, i, fold_steps=False))
        index_sections.append(case_item(c, i))
    writings = ''.join(f'<a href="{escape(w["url"])}"><span>{escape(w["label"])} ↗</span><h3>{escape(w["title"])}</h3><p>{escape(w["description"])}</p></a>' for w in DATA['writings'])
    body = f'''<div class="sky"><section class="portfolio-overview" aria-labelledby="portfolio-title">
<div class="overview-main"><p class="eyebrow">{escape(DATA['overview']['eyebrow'])}</p><h1 id="portfolio-title">{escape(DATA['overview']['title']).replace(chr(10), '<br>')}</h1>
<p class="overview-description">{escape(DATA['overview']['description'])}</p>
<h2 class="overview-label">주요 경험</h2><ul class="experience-index">
<li><a href="@@CASE:fruition-document@@"><strong>{escape(DATA['overview']['experience1Title'])}</strong><span>{escape(DATA['overview']['experience1Description'])}</span></a></li>
<li><a href="@@CASE:fruition-jev-evidence@@"><strong>{escape(DATA['overview']['experience2Title'])}</strong><span>{escape(DATA['overview']['experience2Description'])}</span></a></li>
<li><a href="@@CASE:pilltip-data@@"><strong>{escape(DATA['overview']['experience3Title'])}</strong><span>{escape(DATA['overview']['experience3Description'])}</span></a></li>
</ul></div>
<aside class="engineering-profile" aria-label="개발자 프로필"><p class="eyebrow">ENGINEERING PROFILE</p><h2>김재형</h2><p class="profile-role">{escape(DATA['overview']['profileRole'])}</p><a class="profile-email" href="mailto:kkuldangi2@gmail.com">kkuldangi2@gmail.com</a>
<p class="profile-summary">{escape(DATA['overview']['profileLine1'])}<br>{escape(DATA['overview']['profileLine2'])}</p><div class="pdf-buttons"><a class="button pdf-button" href="resume.pdf" target="_blank" rel="noopener"><img src="assets/icons/file-text.svg" alt="" width="18" height="18">이력서 PDF</a><a class="button pdf-button" href="portfolio.pdf" target="_blank" rel="noopener"><img src="assets/icons/briefcase.svg" alt="" width="18" height="18">포트폴리오 PDF</a></div></aside></section>{HILLS}</div>
<div id="work" class="work-anchor"></div>
<div class="work-layout"><aside class="toc"><div class="toc-inner"><p class="eyebrow">목차 <span>{len(DATA['cases']):02d}</span></p><p class="toc-guide">{escape(DATA['overview']['readingOrder'])}</p><nav aria-label="프로젝트 목차">{contents}<p class="toc-group">MORE</p><a class="toc-extra" href="#beyond"><span>{len(DATA["cases"]) + 1:02d}</span><span>코드 밖에서도 이어지는 경험</span><span class="toc-arrow">↗</span></a>{toc_subs(BEYOND_TITLES)}<a class="toc-extra" href="#writings"><span>{len(DATA["cases"]) + 2:02d}</span><span>{home_text("sections", "writingsTitle")}</span><span class="toc-arrow">↗</span></a></nav><div class="toc-foot pdf-buttons"><a class="button pdf-button" href="resume.pdf" target="_blank" rel="noopener"><img src="assets/icons/file-text.svg" alt="" width="18" height="18">이력서 PDF</a><a class="button pdf-button" href="portfolio.pdf" target="_blank" rel="noopener"><img src="assets/icons/briefcase.svg" alt="" width="18" height="18">포트폴리오 PDF</a></div></div></aside><div class="cases">@@SECTIONS@@</div></div>
<section class="more-work" id="beyond"><span class="eyebrow">BEYOND THE PROJECTS</span><h2>코드 밖에서도 이어지는 경험</h2><div class="more-grid">
<div><a href="https://github.com/edwardkim/rhwp/pull/1213"><span>OPEN SOURCE ↗</span><h3>Rhwp | HWPX 저장 오류 수정</h3><p>Claude Code에 작업 계획과 기여 규칙을 주고 이슈 분석부터 PR까지 자동화해, textFlow 보존 오류 수정(PR #1213) 등 PR 7건이 병합되고 Contributor로 등재됐습니다.</p></a><a class="text-link" href="https://github.com/edwardkim/rhwp">GitHub 저장소 ↗</a></div>
<div><h3>APPTIVE | 백엔드 멘토링</h3><div class="evidence-row"><a class="evidence-thumb" href="assets/evidence/apptive-merit.jpeg" target="_blank" rel="noopener"><img src="assets/evidence/apptive-merit.jpeg" alt="APPTIVE 백엔드 멘토 공로상" loading="lazy"><span>크게 보기 ↗</span></a><div><p>멘티 경험을 교육 개선으로 연결했습니다. 멘티 12명을 대상으로 6회의 멘토링과 코드 리뷰를 진행했습니다.</p><a class="text-link" href="./#activities">활동 내용 ↗</a></div></div></div><div><h3>백준 945일 연속 문제 해결</h3><div class="evidence-row"><a class="evidence-thumb" href="assets/evidence/baekjoon-streak.png" target="_blank" rel="noopener"><img src="assets/evidence/baekjoon-streak.png" alt="백준 solved.ac 2022년부터 2025년까지의 연도별 스트릭" loading="lazy"><span>크게 보기 ↗</span></a><div><p>하루 한 문제를 목표로 solved.ac 기준 최장 945일 연속 문제를 해결했습니다. 누적 1,659문제, solved.ac Platinum IV.</p><a class="text-link" href="https://github.com/Martinel2/BaekJoon">풀이 저장소 ↗</a></div></div></div></div></section>
<section class="more-work writings" id="writings"><span class="eyebrow">{home_text("sections", "writingsEyebrow")}</span><div class="writings-heading"><h2>{home_text("sections", "writingsTitle")}</h2><a class="button" href="{home_text("sections", "writingsUrl")}">{home_text("sections", "writingsLinkLabel")} ↗</a></div><div class="more-grid">{writings}</div></section>'''
    description = '김재형의 AI 응용 개발 포트폴리오. Fruition과 Pilltip의 문제, 기술 선택, Mermaid 구조도, 평가 결과를 소개합니다.'
    fill = lambda sections, href: re.sub(r'@@CASE:([a-z0-9-]+)@@', lambda m: href(m[1]), body.replace('@@SECTIONS@@', ''.join(sections)))
    # Every case on one page feeds the PDF deck; visitors get an index and one page per case.
    (SITE / 'portfolio-print.html').write_text(page('포트폴리오', description, fill(project_sections, lambda cid: '#' + cid), path='portfolio-print.html'))
    # The index reads like a category page: the overview, then per project a short grid of cards.
    cases = DATA['cases']
    groups = ''
    for project in DATA['projects']:
        own = [(n, c) for n, c in enumerate(cases, 1) if c['project'] == project['name']]
        slug = project['name'].lower()
        intro = (f'<article class="case-item project-card"><p class="case-item-kicker"><span>PROJECT</span> {escape(project["name"])}</p>'
                 f'<h3><a href="portfolio/{slug}.html">{escape(project["name"])} 프로젝트 소개</a></h3><p>{escape(project["description"])}</p>'
                 f'<a class="read-more" href="portfolio/{slug}.html">시작 계기, 팀, 서비스 화면 보기 →</a></article>')
        cards = ''.join(case_item(c, n, f'portfolio/{c["id"]}.html') for n, c in own)
        groups += f'<section class="case-group" id="project-{slug}"><div class="group-head"><h2>{escape(project["name"])}</h2><span>{f"{len(own)} cases" if LANG == "en" else f"사례 {len(own)}개"}</span></div><div class="case-grid">{intro}{cards}</div></section>'
    overview = body[:body.index('<div id="work"')]
    more = body[body.index('<section class="more-work" id="beyond"'):]
    index_body = re.sub(r'@@CASE:([a-z0-9-]+)@@', lambda m: f'portfolio/{m[1]}.html', overview + f'<div class="case-groups">{groups}</div>' + more)
    (SITE / 'portfolio.html').write_text(page('포트폴리오', description, index_body, body_class='portfolio-index'))
    (SITE / 'portfolio').mkdir(exist_ok=True)
    for project, section in zip(DATA['projects'], [x for x in project_sections if x.startswith('<section class="project-context"')]):
        slug = project['name'].lower()
        head = re.search(r'<header class="project-head">(.*?)</header>', section, re.S)
        rest = section.replace(head[0], '')
        title = head[1].replace('<h2>', '<h1>', 1).replace('</h2>', '</h1>', 1)
        cards = ''.join(case_item(c, n, f'portfolio/{c["id"]}.html') for n, c in enumerate(cases, 1) if c['project'] == project['name'])
        project_body = (f'<div class="sky"><header class="case-hero project-hero">{title}</header>{HILLS}</div>'
                        f'<div class="project-page">{rest}<section class="case-group"><div class="group-head"><h2>{"Cases" if LANG == "en" else "사례"}</h2></div><div class="case-grid">{cards}</div></section></div>')
        (SITE / 'portfolio' / f'{slug}.html').write_text(page(project['name'], project['description'], project_body, path=f'portfolio/{slug}.html', body_class='project-page-body'))
    for i, c in enumerate(cases, 1):
        (SITE / 'portfolio' / f'{c["id"]}.html').write_text(page(c['short'], c['summary'], case_page(c, i, cases[i - 2] if i > 1 else None, cases[i] if i < len(cases) else None), path=f'portfolio/{c["id"]}.html', body_class='case-page'))


def resume():
    fields = {key: value for section in DATA['resume'] for key, value in section['fields'].items()}
    body = re.sub(r'@@(text\d+)@@', lambda match: resume_text(fields[match[1]]), (ROOT / 'templates/resume.html').read_text())
    (SITE / 'resume.html').write_text(page('이력서', '김재형 | AI Application Developer / Backend Engineer. 프로젝트, 기술, 오픈소스 기여, 수상과 학력.', body, True))



def home():
    fields = {key: value for section in DATA['resume'] for key, value in section['fields'].items()}
    t = lambda n: escape(fields['text' + str(n)])
    projects = ''
    for project in DATA['projects']:
        links = ''.join(f'<a class="text-link" href="{escape(link["url"])}">{escape(link["label"])} ↗</a>' for link in project.get('links', []))
        target = 'resume.html#' + project['name'].lower()
        role_key = 24 if project['name'] == 'Fruition' else 47
        affiliation = escape(project['affiliation'])
        role = escape(fields['text' + str(role_key)].split(' / ', 1)[-1])
        details = f'<a class="read-more" href="{target}">{home_text("projectLabels", "detailsLabel")}</a>'
        cover = project['cover']
        projects += f'<article class="home-project"><h3><a href="{escape(target)}">{escape(project["name"])}</a></h3><dl class="project-meta"><div><dt>{home_text("projectLabels", "affiliationLabel")}</dt><dd>{affiliation}</dd></div><div><dt>{home_text("projectLabels", "roleLabel")}</dt><dd>{role}</dd></div></dl><p>{escape(project["description"])}</p><a class="project-cover" href="{escape(target)}"><img src="{escape(cover["src"])}" alt="{escape(cover["alt"])}" width="{cover["width"]}" height="{cover["height"]}" loading="lazy"></a><div class="project-links">{links}</div>{details}</article>'
    resume_body = re.sub(r'@@(text\d+)@@', lambda match: resume_text(fields[match[1]]), (ROOT / 'templates/resume.html').read_text())
    dialogs = ''
    for match in re.finditer(r'<article class="resume-project" id="([^"]+)">.*?</article>', resume_body, re.S):
        project_id, article = match[1], match[0]
        article = article.replace('<h3>', f'<h3 id="{project_id}-title">', 1)
        dialogs += f'<dialog class="project-dialog" id="{project_id}-dialog" aria-labelledby="{project_id}-title"><form method="dialog"><button class="button" autofocus>닫기 ×</button></form>{article}</dialog>'
    sections = re.findall(r'<section class="resume-section".*?</section>', resume_body, re.S)
    # Skills become tag pills in the sidebar, one group per resume row.
    skill_groups = ''.join(f'<div class="skill-group"><p>{m[1]}</p><div class="tags">' + ''.join(f'<span>{x.strip()}</span>' for x in re.split(r',|<br>', m[2]) if x.strip()) + '</div></div>' for m in re.finditer(r'<strong>(.*?)</strong>\s*<p>(.*?)</p>', sections[2], re.S))
    skills_title = re.search(r'<h2>(.*?)<span>', sections[2], re.S)[1].strip()
    skills = f'<section class="side-section" id="skills"><p class="eyebrow">{home_text("sections", "skillsEyebrow")}</p><h2 class="visually-hidden">{skills_title}</h2>{skill_groups}</section>'
    core = [c for c in DATA['cases'] if c['id'] in ('fruition-jev-evidence', 'fruition-agent', 'fruition-document', 'pilltip-data', 'pilltip-personalization')]
    core_list = '<section class="side-section"><p class="eyebrow">핵심 사례</p><ul class="arrow-list">' + ''.join(f'<li><a href="portfolio/{c["id"]}.html">{escape(c["short"])}</a></li>' for c in core) + '</ul></section>'
    background = ''.join(sections[3:6]).replace('class="resume-section"', 'class="home-section home-background-section"')
    background = re.sub(r'<h2>(.*?)<span>.*?</span>\s*</h2>', r'<h2>\1</h2>', background, flags=re.S)
    portfolio_html = (SITE / 'portfolio.html').read_text()
    writings = re.search(r'<section class="more-work writings"[^>]*>.*?</section>', portfolio_html, re.S)[0].replace(' id="writings"', '')
    actions = ''
    for key, icon in (('resume', 'file-text'), ('portfolio', 'briefcase'), ('github', 'github'), ('linkedin', 'linkedin')):
        action = DATA['home']['actions'][key]
        url = {'resume': 'resume.pdf', 'portfolio': 'portfolio.html'}.get(key, action.get('url'))
        target = '' if key == 'portfolio' else ' target="_blank" rel="noopener"'
        actions += f'<a class="{"button primary" if key == "resume" else "button"}" href="{escape(url)}"{target}><img src="assets/icons/{icon}.svg" alt="" width="18" height="18">{escape(action["label"])}</a>'
    resume_action = DATA['home']['actions']['resume']
    body = f'''<section class="home-hero sky"><div class="hero-inner"><div class="home-intro"><p class="eyebrow">{home_text("hero", "eyebrow")}</p><h1>{greeting_html()}<br>{home_text("hero", "nameLine")}</h1><p class="home-lead">{t(2)}<br>{t(3)}</p><div class="home-actions">{actions}</div></div><div class="hero-visual">{quest()}{graph_svg()}{character()}</div></div><p class="egg-whisper" aria-live="polite" data-console="{escape(DATA["home"]["easterEgg"]["console"])}" data-human="{escape(DATA["home"]["easterEgg"]["human"])}">{escape(DATA["home"]["easterEgg"]["whisper"])}</p>{HILLS}</section>
<div class="home-layout"><div class="home-main">
<section class="home-about home-section" id="about"><p class="eyebrow">{home_text("about", "eyebrow")}</p><h2>{home_text("about", "title")}</h2><p>{t(5)}</p><p>{t(6)}</p><p>{home_text("about", "description")}</p></section>
<section class="home-section" id="projects"><p class="eyebrow">{home_text("sections", "projectsEyebrow")}</p><h2>{home_text("sections", "projectsTitle")}</h2><div class="home-projects">{projects}</div></section>
<div class="home-background">{background}</div>{writings}</div>
<aside class="home-side">{skills}{core_list}</aside></div>{hanging()}{companion()}{cooking_dialog()}{dialogs}
<dialog class="project-dialog resume-format-dialog" id="resume-format-dialog" aria-labelledby="resume-format-title"><form method="dialog"><button class="button" autofocus>닫기 ×</button></form><h2 id="resume-format-title">{escape(resume_action['dialogTitle'])}</h2><div class="resume-formats"><a class="button" href="resume.pdf" target="_blank" rel="noopener">{escape(resume_action['pdfLabel'])}</a><a class="button resume-download" href="resume.docx" download="김재형_이력서.docx">{escape(resume_action['docxLabel'])}</a></div></dialog>'''
    (SITE / 'index.html').write_text(page('소개', '김재형의 개발 경험, 프로젝트, 활동과 이력서.', body))

if __name__ == '__main__':
    SITE.mkdir(exist_ok=True)
    for language in ('ko', 'en'):
        LANG = language
        source = ROOT / ('content.en.json' if LANG == 'en' else 'content.json')
        DATA = json.loads(source.read_text())
        CONTENT_VERSION = hashlib.sha256(source.read_bytes() + (ROOT / 'templates/resume.html').read_bytes() + (ROOT / 'templates/resume-pdf.css').read_bytes() + (ROOT / 'scripts/build-resume-pdf.mjs').read_bytes() + (ROOT / 'scripts/build-resume-docx.mjs').read_bytes() + (ROOT / 'ui.en.json').read_bytes() + (ROOT / 'build.py').read_bytes() + (ROOT / 'site/assets/style.css').read_bytes() + (ROOT / 'scripts/build-portfolio-pdf.mjs').read_bytes() + (ROOT / 'templates/portfolio-deck.css').read_bytes()).hexdigest()[:10]
        SITE = ROOT / 'site' / ('en' if LANG == 'en' else '')
        SITE.mkdir(exist_ok=True)
        portfolio()
        resume()
        home()
    print('Built Korean and English home, portfolio and resume pages')
