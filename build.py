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
    return re.sub(r'(?m)^(문제|해결|성과|판단|Problem|Solution|Result):[ \t]*', r'<strong class="field-label" data-label="\1">\1:</strong> ', text)


def home_text(group, key):
    return escape(DATA['home'][group][key])


def tags(items):
    return '<div class="tags">' + ''.join(f'<span>{escape(x)}</span>' for x in items) + '</div>'


def picture(item):
    return f'''<figure class="project-figure"><a href="{escape(item['src'])}" target="_blank" rel="noopener" aria-label="{escape(item['alt'])} · 원본 크기로 보기, 새 탭">
<img src="{escape(item['src'])}" alt="{escape(item['alt'])}" width="{item['width']}" height="{item['height']}" loading="lazy" decoding="async"><span class="image-expand">원본 크기로 보기 ↗</span></a>
<figcaption>{escape(item['caption'])}</figcaption></figure>'''


def page(title, description, body, resume=False):
    path = 'resume.html' if resume else ('portfolio.html' if title == '포트폴리오' else '')
    measurement_id = os.environ.get('GA_MEASUREMENT_ID', '')
    if measurement_id and not re.fullmatch(r'G-[A-Z0-9]+', measurement_id):
        raise ValueError('GA_MEASUREMENT_ID must be a G- measurement ID')
    analytics_meta = f'<meta name="ga-measurement-id" content="{measurement_id}">' if measurement_id else ''
    switch_path = ('../' if LANG == 'en' else 'en/') + path
    language_switch = f'<a class="language-switch" href="{switch_path}" hreflang="{"ko" if LANG == "en" else "en"}" lang="{"ko" if LANG == "en" else "en"}" aria-label="{"한국어로 보기" if LANG == "en" else "View in English"}">{"한국어" if LANG == "en" else "EN"}</a>'
    html = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · 김재형</title><meta name="description" content="{description}">
<meta name="theme-color" content="#f6f7f9"><meta property="og:title" content="{title} · 김재형">
<meta property="og:description" content="{description}"><meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR"><meta property="og:image" content="https://Martinel2.github.io/assets/og.png">
<link rel="canonical" href="https://Martinel2.github.io/{path}"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
{analytics_meta}<link rel="stylesheet" href="assets/style.css?v={hashlib.sha256((ASSETS / 'style.css').read_bytes()).hexdigest()[:10]}"><script defer src="assets/site.js?v={hashlib.sha256((ASSETS / 'site.js').read_bytes()).hexdigest()[:10]}"></script>
</head><body id="top" class="{'resume-page' if resume else 'portfolio-page'}">
<a class="skip" href="#main">본문으로 바로가기</a>
<header class="header"><a class="identity" href="./"><span class="monogram">JH<span>.</span></span><span>김재형 <small>JAEHYEONG KIM</small></span></a>
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
    return html


def case_html(c, i):
    iterative = 'experiments' in c or 'designSteps' in c
    section_title = escape(c.get('processTitle', '실험과 개선 과정' if iterative else '해결 방안 비교와 선택'))
    if 'designSteps' in c:
        steps = ''.join('<li><h4>' + escape(step['title']) + '</h4>' + ''.join(f'<p><strong>{label}</strong> {escape(step[key])}</p>' for key, label in [('problem', '문제 상황'), ('judgment', '판단'), ('implementation', '구현'), ('verification', '확인한 결과')]) + '</li>' for step in c['designSteps'])
        process = f'<ol class="experiment-timeline">{steps}</ol>'
    elif iterative:
        steps = ''.join(f'<li><h4>{escape(title)}</h4><p><strong>문제 상황</strong> {escape(problem)}</p><p><strong>시도와 결과</strong> {escape(observed)}</p><p class="step-judgment"><strong>판단</strong> {escape(judgment)}</p></li>' for title, problem, observed, judgment in c['experiments'])
        process = f'<ol class="experiment-timeline">{steps}</ol>'
    else:
        rows = ''.join('<tr>' + ''.join(f'<td>{escape(v)}</td>' for v in row) + '</tr>' for row in c['options'])
        process = f'''<p class="table-note">각 방안의 기대 효과와 확인한 결과를 비교했습니다. 비용 추산·설계 검토는 실제 실험 결과와 구분했습니다.</p><div class="table-scroll" tabindex="0" role="region" aria-label="{escape(c['short'])} 해결 방안 비교"><table><thead><tr><th scope="col">해결 방안</th><th scope="col">기대 효과</th><th scope="col">실험 결과</th><th scope="col">채택 여부와 이유</th></tr></thead><tbody>{rows}</tbody></table></div><div class="decision"><span class="eyebrow">WHY THIS APPROACH</span><p>{escape(c['decision'])}</p></div>'''
    implementation = '<ul>' + ''.join(f'<li>{escape(x)}</li>' for x in c['implementation']) + '</ul>' if c.get('implementation') else ''
    next_step = f'<p class="next"><strong>다음 검증</strong> {escape(c["next"])}</p>' if c.get('next') else ''
    metrics = ''.join(f'<div><span>{escape(label)}</span><strong>{escape(value)}</strong><small>{escape(note)}</small></div>' for label, value, note in c['metrics'])
    links = ''.join(f'<a class="text-link" href="{escape(link["url"])}">{escape(link["label"])} ↗</a>' for link in c.get('links', []))
    source = f'<p class="source">근거 · {escape(c["source"])}</p>' if c.get('source') else ''
    comparison = ''
    if 'comparison' in c:
        table = c['comparison']
        headers = ''.join(f'<th scope="col">{escape(label)}</th>' for label in table['columns'])
        values = ''.join('<tr>' + ''.join(f'<td>{escape(value)}</td>' for value in row) + '</tr>' for row in table['rows'])
        comparison = f'<div class="table-scroll comparison" tabindex="0" role="region" aria-label="{escape(c["short"])} 결과 비교"><table><thead><tr>{headers}</tr></thead><tbody>{values}</tbody></table></div><p class="comparison-note">{escape(table["note"])}</p>'
    return f'''<article class="case" id="{escape(c['id'])}" aria-labelledby="{escape(c['id'])}-title">
<header class="case-header"><div class="case-kicker"><span>CASE {i:02d}</span><span>{escape(c['project'])} / {escape(c['category'])}</span></div><h2 id="{escape(c['id'])}-title">{escape(c['title'])}</h2><p class="case-summary">{escape(c['summary'])}</p><p class="case-meta">{escape(c['period'])}</p>{tags(c['tags'])}</header>
<section class="case-part"><h3><span>01</span> 배경</h3><p>{escape(c['problem'])}</p></section>
<section class="case-part"><h3><span>02</span> {section_title}</h3>{process}</section>
<section class="case-part"><h3><span>03</span> {'개선한 처리 흐름' if iterative else '구현과 구조'}</h3>{implementation}{picture(c['image']) if 'image' in c else ''}<figure class="diagram"><figcaption><span>ARCHITECTURE</span><span>Mermaid diagram</span></figcaption><div class="diagram-scroll" tabindex="0" role="region" aria-label="{escape(c['short'])} 구조도"><pre class="mermaid">{escape(c['diagram'])}</pre></div><p class="diagram-caption">{escape(c['diagramCaption'])}</p><details><summary>Mermaid 원문 보기</summary><pre class="diagram-source">{escape(c['diagram'])}</pre></details></figure></section>
<section class="case-part"><h3><span>04</span> 결과와 배운 점</h3><h4>{escape(c['resultTitle'])}</h4><p>{escape(c['result'])}</p>{f'<div class="result-metrics">{metrics}</div>' if metrics else ''}{comparison}<div class="limits"><strong>결과의 범위 · 트레이드오프</strong><p>{escape(c['tradeoff'])}</p></div>{next_step}{source}{links}</section>
</article>'''


def portfolio():
    contents = ''
    for i, c in enumerate(DATA['cases'], 1):
        if i == 1 or DATA['cases'][i - 2]['project'] != c['project']:
            contents += f'<p class="toc-group">{escape(c["project"])}</p>'
        contents += f'<a href="#{c["id"]}"><span>{i:02d}</span><span><small>{escape(c["project"])}</small>{escape(c["short"])}</span><span class="toc-arrow">↗</span></a>'
    project_sections = []
    seen = set()
    for i, c in enumerate(DATA['cases'], 1):
        if c['project'] not in seen:
            project = next(p for p in DATA['projects'] if p['name'] == c['project'])
            contributions = ''.join(f'<div><dt>{escape(title)}</dt><dd>{escape(description)}</dd></div>' for title, description in project['contributions'])
            team = ''.join(f'<div><dt>{escape(role)}</dt><dd>{escape(work)}</dd></div>' for role, work in project['team'])
            links = ''.join(f'<a class="text-link" href="{escape(link["url"])}">{escape(link["label"])} ↗</a>' for link in project.get('links', []))
            gallery = ''.join(picture(item) for item in project['gallery'])
            project_sections.append(f'<section class="project-context" aria-label="{escape(project["name"]) } 프로젝트 소개"><p class="eyebrow">PROJECT OVERVIEW</p><h2>{escape(project["name"]) }</h2><p>{escape(project["description"]) }</p><h3>시작 계기</h3><p class="project-origin">{escape(project["origin"])} {escape(project["goal"])}</p><h3>팀 구성</h3><p class="project-role"><strong>내 역할</strong> {escape(project["myRole"])}</p><dl class="contribution-list team-list">{team}</dl><h3>내 주요 개발</h3><dl class="contribution-list work-list">{contributions}</dl>{links}<h3>담당 기능과 서비스 화면</h3><p class="gallery-note">팀 발표 자료의 서비스 화면과 구조입니다. 각 설명에 제 담당 범위를 표시했습니다. 이미지를 누르면 원본 크기로 볼 수 있습니다.</p><div class="project-gallery">{gallery}</div></section>')
            seen.add(c['project'])
        project_sections.append(case_html(c, i))
    writings = ''.join(f'<a href="{escape(w["url"])}"><span>{escape(w["label"])} ↗</span><h3>{escape(w["title"])}</h3><p>{escape(w["description"])}</p></a>' for w in DATA['writings'])
    body = f'''<section class="portfolio-overview" aria-labelledby="portfolio-title">
<div class="overview-main"><p class="eyebrow">{escape(DATA['overview']['eyebrow'])}</p><h1 id="portfolio-title">{escape(DATA['overview']['title'])}</h1>
<p class="overview-description">{escape(DATA['overview']['description'])}</p>
<h2 class="overview-label">주요 경험</h2><ul class="experience-index">
<li><a href="#fruition-document"><strong>{escape(DATA['overview']['experience1Title'])}</strong><span>{escape(DATA['overview']['experience1Description'])}</span></a></li>
<li><a href="#fruition-jev-evidence"><strong>{escape(DATA['overview']['experience2Title'])}</strong><span>{escape(DATA['overview']['experience2Description'])}</span></a></li>
<li><a href="#pilltip-data"><strong>{escape(DATA['overview']['experience3Title'])}</strong><span>{escape(DATA['overview']['experience3Description'])}</span></a></li>
</ul></div>
<aside class="engineering-profile" aria-label="개발자 프로필"><p class="eyebrow">ENGINEERING PROFILE</p><h2>김재형</h2><p class="profile-role">{escape(DATA['overview']['profileRole'])}</p><a class="profile-email" href="mailto:kkuldangi2@gmail.com">kkuldangi2@gmail.com</a>
<p class="profile-summary">{escape(DATA['overview']['profileLine1'])}<br>{escape(DATA['overview']['profileLine2'])}</p><a class="profile-resume" href="resume.pdf" target="_blank" rel="noopener">이력서 PDF ↗</a> <a class="profile-resume" href="portfolio.pdf" target="_blank" rel="noopener">포트폴리오 PDF ↗</a></aside></section>
<div id="work" class="work-anchor"></div>
<div class="work-layout"><aside class="toc"><div class="toc-inner"><p class="eyebrow">목차 <span>{len(DATA['cases']):02d}</span></p><nav aria-label="프로젝트 목차">{contents}</nav><div class="toc-foot"><span>READING GUIDE</span><p>문제 상황<br>실험과 개선 · 해결 방안 비교<br>구현과 구조<br>결과와 배운 점</p><a href="resume.pdf" target="_blank" rel="noopener">이력서 PDF ↗</a><a href="portfolio.pdf" target="_blank" rel="noopener">포트폴리오 PDF ↗</a></div></div></aside><div class="cases">{''.join(project_sections)}</div></div>
<section class="more-work"><span class="eyebrow">BEYOND THE PROJECTS</span><h2>코드 밖에서도 이어지는 경험</h2><div class="more-grid"><div><h3>백준 945일 연속 문제 해결</h3><div class="evidence-row"><a class="evidence-thumb" href="assets/evidence/baekjoon-streak.png" target="_blank" rel="noopener"><img src="assets/evidence/baekjoon-streak.png" alt="백준 solved.ac 2022년부터 2025년까지의 연도별 스트릭" loading="lazy"><span>크게 보기 ↗</span></a><div><p>하루 한 문제를 목표로 solved.ac 기준 최장 945일 연속 문제를 해결했습니다. 누적 1,659문제, solved.ac Platinum IV.</p><a class="text-link" href="https://github.com/Martinel2/BaekJoon">풀이 저장소 ↗</a></div></div></div>
<div><a href="https://github.com/edwardkim/rhwp/pull/1213"><span>OPEN SOURCE ↗</span><h3>Rhwp · HWPX 저장 오류 수정</h3><p>textFlow 속성 보존 오류를 수정한 PR #1213 병합. 이슈 분석부터 구현, 테스트와 CI 대응까지 기여했습니다.</p></a><a class="text-link" href="https://github.com/edwardkim/rhwp">GitHub 저장소 ↗</a></div>
<div><h3>APPTIVE · 백엔드 멘토링</h3><div class="evidence-row"><a class="evidence-thumb" href="assets/evidence/apptive-merit.jpeg" target="_blank" rel="noopener"><img src="assets/evidence/apptive-merit.jpeg" alt="APPTIVE 백엔드 멘토 공로상" loading="lazy"><span>크게 보기 ↗</span></a><div><p>멘티 경험을 교육 개선으로 연결했습니다. 멘티 12명을 대상으로 6회의 멘토링과 코드 리뷰를 진행했습니다.</p><a class="text-link" href="./#activities">활동 내용 ↗</a></div></div></div></div></section>
<section class="more-work writings"><span class="eyebrow">{home_text("sections", "writingsEyebrow")}</span><div class="writings-heading"><h2>{home_text("sections", "writingsTitle")}</h2><a class="button" href="{home_text("sections", "writingsUrl")}">{home_text("sections", "writingsLinkLabel")} ↗</a></div><div class="more-grid">{writings}</div></section>'''
    (SITE / 'portfolio.html').write_text(page('포트폴리오', '김재형의 Backend · AI 응용 개발 포트폴리오. Fruition과 Pilltip의 문제, 기술 선택, Mermaid 구조도, 평가 결과를 소개합니다.', body))


def resume():
    fields = {key: value for section in DATA['resume'] for key, value in section['fields'].items()}
    body = re.sub(r'@@(text\d+)@@', lambda match: resume_text(fields[match[1]]), (ROOT / 'templates/resume.html').read_text())
    (SITE / 'resume.html').write_text(page('이력서', '김재형 · Backend Engineer / AI Application Developer. 프로젝트, 기술, 오픈소스 기여, 수상과 학력.', body, True))



def home():
    fields = {key: value for section in DATA['resume'] for key, value in section['fields'].items()}
    t = lambda n: escape(fields['text' + str(n)])
    projects = ''
    for project in DATA['projects']:
        links = ''.join(f'<a class="text-link" href="{escape(link["url"])}">{escape(link["label"])} ↗</a>' for link in project.get('links', []))
        target = 'resume.html#' + project['name'].lower()
        affiliation_key, role_key = (23, 24) if project['name'] == 'Fruition' else (46, 47)
        affiliation = escape(fields['text' + str(affiliation_key)].rsplit(' · ', 1)[-1])
        role = escape(fields['text' + str(role_key)].split(' / ', 1)[-1])
        details = f'<a class="text-link" href="{target}">{home_text("projectLabels", "detailsLabel")} ↗</a>'
        cover = project['cover']
        projects += f'<article class="home-project"><a class="project-cover" href="{escape(target)}"><img src="{escape(cover["src"])}" alt="{escape(cover["alt"])}" width="{cover["width"]}" height="{cover["height"]}" loading="lazy"></a><div class="project-card-body"><h3><a href="{escape(target)}">{escape(project["name"])}</a></h3><dl class="project-meta"><div><dt>{home_text("projectLabels", "affiliationLabel")}</dt><dd>{affiliation}</dd></div><div><dt>{home_text("projectLabels", "roleLabel")}</dt><dd>{role}</dd></div></dl><p>{escape(project["description"])}</p>{links}<div>{details}</div></div></article>'
    resume_body = re.sub(r'@@(text\d+)@@', lambda match: resume_text(fields[match[1]]), (ROOT / 'templates/resume.html').read_text())
    dialogs = ''
    for match in re.finditer(r'<article class="resume-project" id="([^"]+)">.*?</article>', resume_body, re.S):
        project_id, article = match[1], match[0]
        article = article.replace('<h3>', f'<h3 id="{project_id}-title">', 1)
        dialogs += f'<dialog class="project-dialog" id="{project_id}-dialog" aria-labelledby="{project_id}-title"><form method="dialog"><button class="button" autofocus>닫기 ×</button></form>{article}</dialog>'
    sections = re.findall(r'<section class="resume-section".*?</section>', resume_body, re.S)
    skills = sections[2].replace('class="resume-section"', 'class="home-section home-skills" id="skills"')
    skills = re.sub(r'<h2>(.*?)<span>.*?</span>\s*</h2>', lambda m: '<p class="eyebrow">' + home_text('sections', 'skillsEyebrow') + '</p><h2>' + m[1] + '</h2>', skills, flags=re.S)
    background = ''.join(sections[3:5]).replace('class="resume-section"', 'class="home-section home-background-section"')
    background = re.sub(r'<h2>(.*?)<span>.*?</span>\s*</h2>', r'<h2>\1</h2>', background, flags=re.S)
    portfolio_html = (SITE / 'portfolio.html').read_text()
    writings = re.search(r'<section class="more-work writings">.*?</section>', portfolio_html, re.S)[0]
    actions = ''
    for key, icon in [('resume', 'file-text'), ('portfolio', 'briefcase'), ('linkedin', 'linkedin'), ('github', 'github')]:
        action = DATA['home']['actions'][key]
        url = {'resume': 'resume.pdf', 'portfolio': 'portfolio.html'}.get(key, action.get('url'))
        target = '' if key == 'portfolio' else ' target="_blank" rel="noopener"'
        actions += f'<a class="button" href="{escape(url)}"{target}><img src="assets/icons/{icon}.svg" alt="" width="20" height="20">{escape(action["label"])}</a>'
    resume_action = DATA['home']['actions']['resume']
    body = f'''<section class="home-hero"><div class="home-intro"><p class="eyebrow">{home_text("hero", "eyebrow")}</p><h1>{home_text("hero", "greeting")}<br>{home_text("hero", "nameLine")}</h1><h2>{t(2)}<br>{t(3)}</h2><div class="home-actions">{actions}</div></div></section>
<section class="home-about home-section" id="about"><p class="eyebrow">{home_text("about", "eyebrow")}</p><h2>{home_text("about", "title")}</h2><p>{t(5)}</p><p>{t(6)}</p><p>{home_text("about", "description")}</p></section>
{skills}<section class="home-section" id="projects"><p class="eyebrow">{home_text("sections", "projectsEyebrow")}</p><h2>{home_text("sections", "projectsTitle")}</h2><div class="home-projects">{projects}</div></section>
<div class="home-background">{background}</div>{writings}{dialogs}
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
