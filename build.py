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
        comparison = f'<div class="table-scroll comparison" tabindex="0" role="region" aria-label="{c["short"]} 결과 비교"><table><thead><tr>{headers}</tr></thead><tbody>{values}</tbody></table></div><p class="comparison-note">{escape(table["note"])}</p>'
    return f'''<article class="case" id="{c['id']}" aria-labelledby="{c['id']}-title">
<header class="case-header"><div class="case-kicker"><span>CASE {i:02d}</span><span>{c['project']} / {c['category']}</span></div><h2 id="{c['id']}-title">{c['title']}</h2><p class="case-summary">{c['summary']}</p><p class="case-meta">{c['period']}<br>{c['role']}</p>{tags(c['tags'])}</header>
<section class="case-part"><h3><span>01</span> 문제 상황</h3><p>{c['problem']}</p><div class="ownership"><strong>내가 맡은 부분</strong><p>{c['ownership']}</p></div></section>
<section class="case-part"><h3><span>02</span> 해결 옵션과 선택</h3><p class="table-note">같은 문제를 해결하는 접근들을 비교하고, 선택 또는 추가 검증의 이유를 정리했습니다.</p><div class="table-scroll" tabindex="0" role="region" aria-label="{c['short']} 해결 옵션 비교"><table><thead><tr><th scope="col">옵션</th><th scope="col">얻는 것</th><th scope="col">감수할 것</th><th scope="col">판단</th></tr></thead><tbody>{rows}</tbody></table></div><div class="decision"><span class="eyebrow">WHY THIS APPROACH</span><p>{c['decision']}</p></div></section>
<section class="case-part"><h3><span>03</span> 구현과 구조</h3><ul>{''.join(f'<li>{x}</li>' for x in c['implementation'])}</ul>{picture(c['image']) if 'image' in c else ''}<figure class="diagram"><figcaption><span>ARCHITECTURE</span><span>Mermaid diagram</span></figcaption><div class="diagram-scroll" tabindex="0" role="region" aria-label="{c['short']} 구조도"><pre class="mermaid">{escape(c['diagram'])}</pre></div><p class="diagram-caption">{c['diagramCaption']}</p><details><summary>Mermaid 원문 보기</summary><pre class="diagram-source">{escape(c['diagram'])}</pre></details></figure></section>
<section class="case-part"><h3><span>04</span> 결과와 배운 점</h3><h4>{c['resultTitle']}</h4><p>{c['result']}</p>{f'<div class="result-metrics">{metrics}</div>' if metrics else ''}{comparison}<div class="limits"><strong>결과의 범위 · 트레이드오프</strong><p>{c['tradeoff']}</p></div><p class="next"><strong>다음 검증</strong> {c['next']}</p><p class="source">근거 · {c['source']}</p>{links}</section>
</article>'''


def portfolio():
    contents = ''.join(f'<a href="#{c["id"]}"><span>{i:02d}</span><span><small>{c["project"]}</small>{c["short"]}</span><span class="toc-arrow">↗</span></a>' for i, c in enumerate(DATA['cases'], 1))
    project_sections = []
    seen = set()
    for i, c in enumerate(DATA['cases'], 1):
        if c['project'] not in seen:
            project = next(p for p in DATA['projects'] if p['name'] == c['project'])
            contributions = ''.join(f'<div><dt>{escape(title)}</dt><dd>{escape(description)}</dd></div>' for title, description in project['contributions'])
            links = ''.join(f'<a class="text-link" href="{escape(link["url"])}">{escape(link["label"])} ↗</a>' for link in project.get('links', []))
            gallery = ''.join(picture(item) for item in project['gallery'])
            project_sections.append(f'<section class="project-context" aria-label="{project["name"]} 프로젝트 소개"><p class="eyebrow">PROJECT OVERVIEW</p><h2>{project["name"]}</h2><p>{project["description"]}</p><h3>담당 범위와 협업</h3><dl class="contribution-list">{contributions}</dl>{links}<h3>담당 기능과 서비스 화면</h3><p class="gallery-note">팀 발표 자료의 서비스 화면과 구조입니다. 각 설명에 제 담당 범위를 표시했습니다. 이미지를 누르면 원본 크기로 볼 수 있습니다.</p><div class="project-gallery">{gallery}</div></section>')
            seen.add(c['project'])
        project_sections.append(case_html(c, i))
    writings = ''.join(f'<a href="{w["url"]}"><span>{w["label"]} ↗</span><h3>{w["title"]}</h3><p>{w["description"]}</p></a>' for w in DATA['writings'])
    body = f'''<section class="portfolio-overview" aria-labelledby="portfolio-title">
<div class="overview-main"><p class="eyebrow">문서 처리 · AI 검색과 편집 · 백엔드 개발</p><h1 id="portfolio-title">프로젝트 포트폴리오</h1>
<p class="overview-description">문서를 검색 가능한 지식으로 정리하는 Fruition과 개인 맞춤 복약 정보를 제공하는 Pilltip에서 맡은 작업을 정리했습니다. 각 사례에 문제 상황, 검토한 대안, 선택 이유, 구현 구조와 검증 결과를 담았습니다.</p>
<h2 class="overview-label">주요 경험</h2><ul class="experience-index">
<li><a href="#fruition-document"><strong>논문 변환 과정의 표·수식 손실 개선</strong><span>원본 영역을 나눠 읽고 다시 조립하는 문서 변환 흐름 설계·검증</span></a></li>
<li><a href="#fruition-ingest"><strong>AI 문서 처리의 품질·속도·비용 비교</strong><span>Jev의 판단 품질 비교, 문서 분석 병렬화, 임베딩 병목 검증</span></a></li>
<li><a href="#pilltip-data"><strong>약품 데이터 중복 제거로 변환 비용 절감</strong><span>약 4만 4천 건의 반복 문장을 한 번만 변환하고 약품별로 결과 재사용</span></a></li>
</ul></div>
<aside class="engineering-profile" aria-label="개발자 프로필"><p class="eyebrow">ENGINEERING PROFILE</p><h2>김재형</h2><p class="profile-role">Backend · AI Application Developer</p><a class="profile-email" href="mailto:kkuldangi2@gmail.com">kkuldangi2@gmail.com</a>
<p class="profile-summary">Fruition의 AI 기능 전체를 리드하고,<br>Pilltip의 백엔드·AI 기능을 개발했습니다.</p><a class="profile-resume" href="resume.html">이력서 보기 ↗</a></aside></section>
<div id="work" class="work-anchor"></div>
<div class="work-layout"><aside class="toc"><div class="toc-inner"><p class="eyebrow">목차 <span>{len(DATA['cases']):02d}</span></p><nav aria-label="프로젝트 목차">{contents}</nav><div class="toc-foot"><span>READING GUIDE</span><p>문제 상황<br>해결 옵션과 선택<br>구현과 구조<br>결과와 배운 점</p><a href="resume.html">경험 전체 보기 ↗</a></div></div></aside><div class="cases">{''.join(project_sections)}</div></div>
<section class="more-work"><span class="eyebrow">BEYOND THE PROJECTS</span><h2>코드 밖에서도 이어지는 경험</h2><div class="more-grid"><a href="https://github.com/edwardkim/rhwp/pull/1213"><span>OPEN SOURCE ↗</span><h3>Rhwp · HWPX 저장 오류 수정</h3><p>textFlow 속성 보존 오류를 수정한 PR #1213 병합. 이슈 분석부터 구현, 테스트와 CI 대응까지 기여했습니다.</p></a><a href="resume.html#activities"><span>COMMUNITY ↗</span><h3>APPTIVE · 백엔드 멘토링</h3><p>멘티 경험을 교육 개선으로 연결했습니다. 멘티 12명을 대상으로 6회의 멘토링과 코드 리뷰를 진행했습니다.</p></a></div></section>
<section class="more-work writings"><span class="eyebrow">ENGINEERING JOURNAL</span><h2>선택 뒤에 남긴 기록</h2><div class="more-grid">{writings}</div><a class="text-link" href="https://velog.io/@kkuldangi3/posts">블로그 글 전체 보기 ↗</a></section>'''
    (SITE / 'index.html').write_text(page('포트폴리오', '김재형의 Backend · AI 응용 개발 포트폴리오. Fruition과 Pilltip의 문제, 기술 선택, Mermaid 구조도, 평가 결과를 소개합니다.', body))


def resume():
    body = '''<div class="resume-shell">
<section class="resume-hero">
<div>
<p class="eyebrow">RESUME / 김재형</p>
<h1>판단의 근거를 만들고,<br>검증 가능한 흐름을 설계합니다.</h1>
<p class="resume-role">Backend Engineer · AI Application Developer</p>
<p>Spring Boot 기반 백엔드와 문서·검색 AI 파이프라인을 구현합니다.<br>AI의 제안과 실제 실행 사이에 검증을 두고, 품질과 비용을 함께 측정합니다.</p>
<div class="contact-line">
<a href="mailto:kkuldangi2@gmail.com">kkuldangi2@gmail.com</a>
<a href="https://github.com/Martinel2">GitHub ↗</a>
<a href="https://velog.io/@kkuldangi3/posts">Blog ↗</a>
</div>
</div>
<button class="button print-button" type="button">이력서 PDF 저장 ↓</button>
</section>
<section class="resume-section">
<h2>핵심 경험 <span>01 / PROFILE</span>
</h2>
<div class="resume-content">
<ul class="profile-list">
<li>
<strong>논문 변환 중 깨지는 표·수식을 복원</strong>
<p>표·수식이 깨지는 원인을 분석해 원본 배치에 맞춘 변환 흐름을 설계했습니다. 같은 30페이지·445영역의 내부 모델 평가에서 실사용 기준 통과율 45.17% → 89.89%를 확인했습니다.</p>
</li>
<li>
<strong>문서가 순서를 기다리는 분석 대기 개선</strong>
<p>서로 다른 문서를 동시에 분석하는 실험에서 작업자 1 → 4개, 4문서 완료시간 282.11초 → 73.89초를 관찰했습니다. 조건별 1회·저장 제외 결과이며 메모리 증가와 추출 내용의 품질 차이도 함께 확인했습니다.</p>
</li>
<li>
<strong>반복 문장 재사용으로 약품 데이터 변환 비용 절감</strong>
<p>의약품 문장 중복 정리와 Batch API로 원문 처리 예상 약 $200 대비 실제 $11.18의 API 지출로 변환했습니다.</p>
</li>
</ul>
</div>
</section>
<section class="resume-section">
<h2>프로젝트 <span>02 / PROJECTS</span>
</h2>
<div class="resume-content">
<article class="resume-project">
<div class="resume-project-title">
<h3>Fruition</h3>
<span>2026.05 — 현재</span>
</div>
<p class="role">LLM Wiki 기반 AI 워크스페이스 · AI SW 마에스트로 17기<br>팀 프로젝트 / AI 기능 전체 리드</p>
<p class="scope-note">프론트엔드·백엔드 개발은 팀원 담당. MSA는 제가 초기 설계를 제안하고 팀원·멘토와 논의해 최종 구조를 함께 완성했습니다.</p>
<ul>
<li>AnyDoc·Docling의 정보 손실을 비교하고 본문·표·수식·그림을 구분해 원래 위치에 복원하는 흐름 설계·검증. 30페이지 원문 대조와 별도 415페이지 확장 평가 수행.</li>
<li>Jev 개념 병합의 초기 품질 차이를 단건 통제로 재검증: 정답 71/76 대 72/76, 단건 중앙값 8.162초 대 0.254초. 정확도와 시간·비용의 결론을 분리.</li>
<li>문서 분석 작업자 1 → 4개 비교에서 4문서 처리 282.11초 → 73.89초 관측. 메모리 증가·추출 품질과 별도 벡터 생성의 장치 경합을 함께 검증.</li>
<li>사용자가 요청한 수정 목적을 편집 단계까지 유지하고, 형식·의미 검사와 최대 한 번의 재작성 후 사용자 승인을 받아 저장하는 흐름 구현.</li>
<li>동일 초안 114개 재생 평가에서 기준 94건 → 최종 104건 통과. 환산 평균 시간은 11.11초 → 18.92초로 증가.</li>
<li>질문의 조건과 맥락이 사라지지 않도록 원문으로 검색하고, 의미 유사도를 더 반영하도록 순위 계산 개선. 같은 질문 110개에서 정답 자료가 첫 번째에 나온 경우 50개 → 57개.</li>
<li>Jev 라우팅 비교: 모델 판단 98문항에서 기존 JSON 77건, Jev 81건 전체 필드 일치. 중앙값 8.967초 → 0.658초를 관찰한 단일 실행 비교.</li>
<li>Jev 근거 선택: 9개 논문·100문항에서 후보 수와 병렬도를 조정해 Jev 500후보 순차 대비 300후보·4병렬의 후보 준비 포함 중앙값 9.090초 → 2.251초. 기존 선택기보다 빠르다는 의미는 아님.</li>
<li>PoC 참여자 1명의 피드백을 반영해 생성 문서의 원문 출처 링크 구현.</li>
<li>MSA 초기 설계 제안. 팀원·멘토와 데이터 소유권, 서비스 경계와 통신 방식을 논의해 최종 아키텍처 공동 설계.</li>
</ul>
<p class="scope-note">문서 변환은 내부 모델 평가, 편집은 개발 회귀셋, 검색은 로컬 순위 계산 결과입니다. 동시성 비교는 조건별 1회이며 전체 저장·후처리를 제외했습니다. 운영 사용자 정확도나 서비스 전체 지연 측정이 아닙니다.</p>
<a class="text-link" href="./#fruition-document">문서 변환 사례 ↗</a>
<a class="text-link" href="./#fruition-jev-decisions">Jev 판단 비교 ↗</a>
<a class="text-link" href="./#fruition-ingest">문서 처리 병목 검증 ↗</a>
<a class="text-link" href="./#fruition-agent">편집 Agent 사례 ↗</a>
<a class="text-link" href="./#fruition-retrieval">검색 평가 사례 ↗</a>
<a class="text-link" href="./#fruition-jev-routing">Jev 라우팅 비교 ↗</a>
<a class="text-link" href="./#fruition-jev-evidence">Jev 근거 선택 최적화 ↗</a>
</article>
<article class="resume-project">
<div class="resume-project-title">
<h3>Pilltip</h3>
<span>2025.03 — 2025.12</span>
</div>
<p class="role">개인 맞춤 AI 안심 복약 솔루션 · 부산대학교<br>팀 프로젝트 / Backend · AI 응용 개발</p>
<ul>
<li>Java·Spring Boot 기반 의약품 DB 설계, 의약품 검색·자동완성과 복약 위험정보(DUR) 표출 구현.</li>
<li>FCM을 활용한 복약 알림·복약 로그, 딥링크 기반 친구 초대, 가족 프로필 전환 기능 구현.</li>
<li>약 4만 4천 건의 중복 문장을 정리하고 변환 결과를 재사용하는 데이터 정제 파이프라인 구축. 서비스 내 모든 의약품 정보를 친절한 구어체로 설명.</li>
<li>변환 대상 1GB → 326MB. GPT Batch API를 사용해 예상 약 $200 대비 실제 API 지출 $11.18로 변환 수행.</li>
<li>RAG 검색과 DUR 확인 등 필요한 기능을 연결하는 AI 오케스트레이션 기반 챗봇 구현. Weaviate 증상 의미 검색과 내부 프로필 판단을 분리해 임신 여부·복용약·기저질환 필드를 외부 LLM 입력에서 제외.</li>
<li>Notion에 API 문서, 회의록, ADR을 작성해 의사결정 내용 공유.</li>
</ul>
<p class="scope-note">비용은 예상치와 실지출의 비교이며 전처리 인건비는 제외했습니다.</p>
<a class="text-link" href="./#pilltip-data">데이터 파이프라인 사례 ↗</a>
<a class="text-link" href="./#pilltip-personalization">개인화 설계 사례 ↗</a>
</article>
</div>
</section>
<section class="resume-section">
<h2>기술 <span>03 / SKILLS</span>
</h2>
<div class="resume-content skill-rows">
<div>
<strong>Backend</strong>
<p>Java · Spring Boot · Spring AI · Python</p>
</div>
<div>
<strong>AI & Search</strong>
<p>LangChain · LangGraph · RAG · LLM Evaluation · Jev<br>Elasticsearch · Weaviate · BGE-M3 · BM25</p>
</div>
<div>
<strong>Data & Infra</strong>
<p>MySQL · PostgreSQL · Redis · Kafka<br>Docker · Docker Compose · GitHub Actions</p>
</div>
</div>
</section>
<section class="resume-section" id="activities">
<h2>활동 · 기여 <span>04 / EXPERIENCE</span>
</h2>
<div class="resume-content">
<div class="experience-row">
<span>2026.04 — 2026.06</span>
<div>
<h3>Rhwp 오픈소스 기여</h3>
<p>Rust 기반 HWP/HWPX 프로젝트의 오류 분석, 수정안 제출과 CI 대응. 그림·표·도형의 textFlow 속성이 저장 후 초기화되는 오류를 수정했습니다.</p>
<a class="text-link" href="https://github.com/edwardkim/rhwp/pull/1213">PR #1213 · 병합 ↗</a>
<a class="text-link" href="https://github.com/edwardkim/rhwp/pull/1351">PR #1351 · 제출 ↗</a>
</div>
</div>
<div class="experience-row">
<span>2025.03 — 2026.01</span>
<div>
<h3>부산대학교 APPTIVE</h3>
<p>Backend 멘티 및 멘토. 멘티 12명 대상 6회 멘토링과 코드 리뷰. HTTP·Servlet·REST API·DB 기초를 보강하는 커리큘럼 개편에 참여했습니다.</p>
</div>
</div>
<div class="experience-row">
<span>2025.11 / 2025.07</span>
<div>
<h3>SK AI SUMMIT · K-ICT WEEK in Busan</h3>
<p>부산대학교 대표 전시팀으로 Pilltip 부스를 운영하고 서비스 시연과 기술 질의응답을 진행했습니다.</p>
</div>
</div>
</div>
</section>
<section class="resume-section">
<h2>수상 <span>05 / AWARDS</span>
</h2>
<div class="resume-content award-list">
<div>
<span>2025.10</span>
<p>
<strong>캡스톤디자인 금상</strong>
<br>소프트웨어·인공지능 분과 / 부산대학교 정보의생명공학대학</p>
</div>
<div>
<span>2025.09</span>
<p>
<strong>부산 DATA WEEK 최우수상</strong>
<br>데이터 활용 우수사례 공모전 / 부산테크노파크</p>
</div>
<div>
<span>2025.09</span>
<p>
<strong>AI LAUNCH 커리어스쿨 창업톤 장려상</strong>
<br>Root Impact × Google.org</p>
</div>
<div>
<span>2025.08</span>
<p>
<strong>SW중심대학 디지털 경진대회 후원기업상</strong>
<br>SW중심대학협의회</p>
</div>
</div>
</section>
<section class="resume-section">
<h2>학력 · 자격 <span>06 / EDUCATION</span>
</h2>
<div class="resume-content">
<div class="experience-row">
<span>2022.02 — 2026.02</span>
<div>
<h3>부산대학교</h3>
<p>평균 학점 4.12 / 4.5</p>
</div>
</div>
<div class="experience-row">
<span>2019.03 — 2022.02</span>
<div>
<h3>대구대학교</h3>
<p>평균 학점 4.2 / 4.5</p>
</div>
</div>
<div class="experience-row">
<span>2025.09</span>
<div>
<h3>정보처리기사</h3>
<p>한국산업인력공단</p>
</div>
</div>
</div>
</section>
<div class="resume-end">
<p>프로젝트의 문제와 기술 선택을 더 자세히 소개합니다.</p>
<a class="button primary" href="./">포트폴리오 읽기 ↗</a>
</div>
</div>'''
    (SITE / 'resume.html').write_text(page('이력서', '김재형 · Backend Engineer / AI Application Developer. 프로젝트, 기술, 오픈소스 기여, 수상과 학력.', body, True))


if __name__ == '__main__':
    SITE.mkdir(exist_ok=True)
    portfolio()
    resume()
    print('Built site/index.html and site/resume.html')
