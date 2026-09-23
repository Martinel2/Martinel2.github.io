"""Generate static, readable pages. Run: python3 build.py"""
import json
import os
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"
DATA = json.loads((ROOT / "content.json").read_text())


def tags(items):
    return '<div class="tags">' + ''.join(f'<span>{escape(x)}</span>' for x in items) + '</div>'


def picture(item):
    return f'''<figure class="project-figure"><a href="{escape(item['src'])}" target="_blank" rel="noopener" aria-label="{escape(item['alt'])} · 원본 크기로 보기, 새 탭">
<img src="{escape(item['src'])}" alt="{escape(item['alt'])}" width="{item['width']}" height="{item['height']}" loading="lazy" decoding="async"><span class="image-expand">원본 크기로 보기 ↗</span></a>
<figcaption>{escape(item['caption'])}</figcaption></figure>'''


def page(title, description, body, resume=False):
    path = 'resume.html' if resume else ''
    measurement_id = os.environ.get('GA_MEASUREMENT_ID', '')
    if measurement_id and not re.fullmatch(r'G-[A-Z0-9]+', measurement_id):
        raise ValueError('GA_MEASUREMENT_ID must be a G- measurement ID')
    analytics_meta = f'<meta name="ga-measurement-id" content="{measurement_id}">' if measurement_id else ''
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · 김재형</title><meta name="description" content="{description}">
<meta name="theme-color" content="#f6f7f9"><meta property="og:title" content="{title} · 김재형">
<meta property="og:description" content="{description}"><meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR"><meta property="og:image" content="https://Martinel2.github.io/assets/og.png">
<link rel="canonical" href="https://Martinel2.github.io/{path}"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
{analytics_meta}<link rel="stylesheet" href="assets/style.css"><script defer src="assets/site.js"></script>
</head><body id="top" class="{'resume-page' if resume else 'portfolio-page'}">
<a class="skip" href="#main">본문으로 바로가기</a>
<header class="header"><a class="identity" href="./"><span class="monogram">JH<span>.</span></span><span>김재형 <small>JAEHYEONG KIM</small></span></a>
<nav aria-label="주 메뉴"><a href="./" {'aria-current="page"' if not resume else ''}>포트폴리오</a><a href="resume.html" {'aria-current="page"' if resume else ''}>이력서</a><a class="nav-contact" href="#contact">연락하기 <span aria-hidden="true">↗</span></a></nav></header>
<main id="main">{body}</main>
<footer id="contact"><div><span class="eyebrow">LET’S CONNECT</span><h2>김재형 · 연락처</h2><a class="email" href="mailto:kkuldangi2@gmail.com">kkuldangi2@gmail.com <span aria-hidden="true">↗</span></a></div><div class="footer-links"><a href="https://github.com/Martinel2">GitHub ↗</a><a href="https://velog.io/@kkuldangi3/posts">Blog ↗</a><a href="resume.html">이력서 보기 ↗</a><a href="#top">맨 위로 ↑</a></div><div class="footer-bottom"><span>© 2026 김재형</span><span>Backend & AI Application Developer · Updated {DATA['updated']}</span></div></footer>
</body></html>'''


def case_html(c, i):
    rows = ''.join('<tr>' + ''.join(f'<td>{escape(v)}</td>' for v in row) + '</tr>' for row in c['options'])
    metrics = ''.join(f'<div><span>{escape(label)}</span><strong>{escape(value)}</strong><small>{escape(note)}</small></div>' for label, value, note in c['metrics'])
    links = ''.join(f'<a class="text-link" href="{escape(link["url"])}">{escape(link["label"])} ↗</a>' for link in c.get('links', []))
    comparison = ''
    if 'comparison' in c:
        table = c['comparison']
        headers = ''.join(f'<th scope="col">{escape(label)}</th>' for label in table['columns'])
        values = ''.join('<tr>' + ''.join(f'<td>{escape(value)}</td>' for value in row) + '</tr>' for row in table['rows'])
        comparison = f'<div class="table-scroll comparison" tabindex="0" role="region" aria-label="{escape(c["short"])} 결과 비교"><table><thead><tr>{headers}</tr></thead><tbody>{values}</tbody></table></div><p class="comparison-note">{escape(table["note"])}</p>'
    return f'''<article class="case" id="{escape(c['id'])}" aria-labelledby="{escape(c['id'])}-title">
<header class="case-header"><div class="case-kicker"><span>CASE {i:02d}</span><span>{escape(c['project'])} / {escape(c['category'])}</span></div><h2 id="{escape(c['id'])}-title">{escape(c['title'])}</h2><p class="case-summary">{escape(c['summary'])}</p><p class="case-meta">{escape(c['period'])}<br>{escape(c['role'])}</p>{tags(c['tags'])}</header>
<section class="case-part"><h3><span>01</span> 문제 상황</h3><p>{escape(c['problem'])}</p><div class="ownership"><strong>내가 맡은 부분</strong><p>{escape(c['ownership'])}</p></div></section>
<section class="case-part"><h3><span>02</span> 해결 옵션과 선택</h3><p class="table-note">같은 문제를 해결하는 접근들을 비교하고, 선택 또는 추가 검증의 이유를 정리했습니다.</p><div class="table-scroll" tabindex="0" role="region" aria-label="{escape(c['short'])} 해결 옵션 비교"><table><thead><tr><th scope="col">옵션</th><th scope="col">얻는 것</th><th scope="col">감수할 것</th><th scope="col">판단</th></tr></thead><tbody>{rows}</tbody></table></div><div class="decision"><span class="eyebrow">WHY THIS APPROACH</span><p>{escape(c['decision'])}</p></div></section>
<section class="case-part"><h3><span>03</span> 구현과 구조</h3><ul>{''.join(f'<li>{escape(x)}</li>' for x in c['implementation'])}</ul>{picture(c['image']) if 'image' in c else ''}<figure class="diagram"><figcaption><span>ARCHITECTURE</span><span>Mermaid diagram</span></figcaption><div class="diagram-scroll" tabindex="0" role="region" aria-label="{escape(c['short'])} 구조도"><pre class="mermaid">{escape(c['diagram'])}</pre></div><p class="diagram-caption">{escape(c['diagramCaption'])}</p><details><summary>Mermaid 원문 보기</summary><pre class="diagram-source">{escape(c['diagram'])}</pre></details></figure></section>
<section class="case-part"><h3><span>04</span> 결과와 배운 점</h3><h4>{escape(c['resultTitle'])}</h4><p>{escape(c['result'])}</p>{f'<div class="result-metrics">{metrics}</div>' if metrics else ''}{comparison}<div class="limits"><strong>결과의 범위 · 트레이드오프</strong><p>{escape(c['tradeoff'])}</p></div><p class="next"><strong>다음 검증</strong> {escape(c['next'])}</p><p class="source">근거 · {escape(c['source'])}</p>{links}</section>
</article>'''


def portfolio():
    contents = ''.join(f'<a href="#{c["id"]}"><span>{i:02d}</span><span><small>{escape(c["project"])}</small>{escape(c["short"])}</span><span class="toc-arrow">↗</span></a>' for i, c in enumerate(DATA['cases'], 1))
    project_sections = []
    seen = set()
    for i, c in enumerate(DATA['cases'], 1):
        if c['project'] not in seen:
            project = next(p for p in DATA['projects'] if p['name'] == c['project'])
            contributions = ''.join(f'<div><dt>{escape(title)}</dt><dd>{escape(description)}</dd></div>' for title, description in project['contributions'])
            links = ''.join(f'<a class="text-link" href="{escape(link["url"])}">{escape(link["label"])} ↗</a>' for link in project.get('links', []))
            gallery = ''.join(picture(item) for item in project['gallery'])
            project_sections.append(f'<section class="project-context" aria-label="{escape(project["name"]) } 프로젝트 소개"><p class="eyebrow">PROJECT OVERVIEW</p><h2>{escape(project["name"]) }</h2><p>{escape(project["description"]) }</p><h3>담당 범위와 협업</h3><dl class="contribution-list">{contributions}</dl>{links}<h3>담당 기능과 서비스 화면</h3><p class="gallery-note">팀 발표 자료의 서비스 화면과 구조입니다. 각 설명에 제 담당 범위를 표시했습니다. 이미지를 누르면 원본 크기로 볼 수 있습니다.</p><div class="project-gallery">{gallery}</div></section>')
            seen.add(c['project'])
        project_sections.append(case_html(c, i))
    writings = ''.join(f'<a href="{escape(w["url"])}"><span>{escape(w["label"])} ↗</span><h3>{escape(w["title"])}</h3><p>{escape(w["description"])}</p></a>' for w in DATA['writings'])
    body = f'''<section class="portfolio-overview" aria-labelledby="portfolio-title">
<div class="overview-main"><p class="eyebrow">{escape(DATA['overview']['eyebrow'])}</p><h1 id="portfolio-title">{escape(DATA['overview']['title'])}</h1>
<p class="overview-description">{escape(DATA['overview']['description'])}</p>
<h2 class="overview-label">주요 경험</h2><ul class="experience-index">
<li><a href="#fruition-document"><strong>{escape(DATA['overview']['experience1Title'])}</strong><span>{escape(DATA['overview']['experience1Description'])}</span></a></li>
<li><a href="#fruition-jev-decisions"><strong>{escape(DATA['overview']['experience2Title'])}</strong><span>{escape(DATA['overview']['experience2Description'])}</span></a></li>
<li><a href="#pilltip-data"><strong>{escape(DATA['overview']['experience3Title'])}</strong><span>{escape(DATA['overview']['experience3Description'])}</span></a></li>
</ul></div>
<aside class="engineering-profile" aria-label="개발자 프로필"><p class="eyebrow">ENGINEERING PROFILE</p><h2>김재형</h2><p class="profile-role">{escape(DATA['overview']['profileRole'])}</p><a class="profile-email" href="mailto:kkuldangi2@gmail.com">kkuldangi2@gmail.com</a>
<p class="profile-summary">{escape(DATA['overview']['profileLine1'])}<br>{escape(DATA['overview']['profileLine2'])}</p><a class="profile-resume" href="resume.html">이력서 보기 ↗</a></aside></section>
<div id="work" class="work-anchor"></div>
<div class="work-layout"><aside class="toc"><div class="toc-inner"><p class="eyebrow">목차 <span>{len(DATA['cases']):02d}</span></p><nav aria-label="프로젝트 목차">{contents}</nav><div class="toc-foot"><span>READING GUIDE</span><p>문제 상황<br>해결 옵션과 선택<br>구현과 구조<br>결과와 배운 점</p><a href="resume.html">경험 전체 보기 ↗</a></div></div></aside><div class="cases">{''.join(project_sections)}</div></div>
<section class="more-work"><span class="eyebrow">BEYOND THE PROJECTS</span><h2>코드 밖에서도 이어지는 경험</h2><div class="more-grid"><a href="https://github.com/edwardkim/rhwp/pull/1213"><span>OPEN SOURCE ↗</span><h3>Rhwp · HWPX 저장 오류 수정</h3><p>textFlow 속성 보존 오류를 수정한 PR #1213 병합. 이슈 분석부터 구현, 테스트와 CI 대응까지 기여했습니다.</p></a><a href="resume.html#activities"><span>COMMUNITY ↗</span><h3>APPTIVE · 백엔드 멘토링</h3><p>멘티 경험을 교육 개선으로 연결했습니다. 멘티 12명을 대상으로 6회의 멘토링과 코드 리뷰를 진행했습니다.</p></a></div></section>
<section class="more-work writings"><span class="eyebrow">ENGINEERING JOURNAL</span><h2>선택 뒤에 남긴 기록</h2><div class="more-grid">{writings}</div><a class="text-link" href="https://velog.io/@kkuldangi3/posts">블로그 글 전체 보기 ↗</a></section>'''
    (SITE / 'index.html').write_text(page('포트폴리오', '김재형의 Backend · AI 응용 개발 포트폴리오. Fruition과 Pilltip의 문제, 기술 선택, Mermaid 구조도, 평가 결과를 소개합니다.', body))


def resume():
    fields = {key: value for section in DATA['resume'] for key, value in section['fields'].items()}
    body = re.sub(r'@@(text\d+)@@', lambda match: escape(fields[match[1]]), (ROOT / 'templates/resume.html').read_text())
    (SITE / 'resume.html').write_text(page('이력서', '김재형 · Backend Engineer / AI Application Developer. 프로젝트, 기술, 오픈소스 기여, 수상과 학력.', body, True))


if __name__ == '__main__':
    SITE.mkdir(exist_ok=True)
    portfolio()
    resume()
    print('Built site/index.html and site/resume.html')
