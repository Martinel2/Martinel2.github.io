# 김재형 · 이력서와 포트폴리오

GitHub Pages용 정적 사이트. 공개 사이트: https://Martinel2.github.io/

- `site/index.html`: 포트폴리오, 목차, 아홉 가지 사례와 Mermaid 구조도
- `site/resume.html`: 이력서, 브라우저 인쇄를 통한 PDF 저장
- `content.json`: 프로젝트별 본문과 Mermaid 원문
- `build.py`: 본문을 HTML로 생성. Python 표준 라이브러리만 사용
- `site/assets/`: 스타일과 작은 UI 스크립트
- `site/assets/projects/`: 발표 자료에서 추출한 제품 화면과 데이터 처리 산출물 (원본 크기 링크 제공)

## 로컬 실행

```sh
python3 build.py
python3 -m http.server 4173 --directory site
# http://localhost:4173
```

본문은 JavaScript 없이도 읽을 수 있습니다. Mermaid 11.12.0과 Pretendard 1.3.9는 고정 버전 CDN을 사용합니다. CDN 연결 실패 시 시스템 글꼴과 다이어그램 원문이 표시됩니다.

## 수정과 확인

프로젝트 내용은 `content.json`, 이력서 내용은 `build.py`의 `resume()`을 수정한 후 빌드합니다. 생성된 HTML도 함께 커밋합니다.

```sh
npm ci
npx puppeteer browsers install chrome
npm run build
npm test
```

테스트는 임시 HTTP 서버를 시작해 데스크톱·모바일 레이아웃, 이미지 로딩·확대 링크, Jev 사례, 블로그 링크, Mermaid, 목차, 인쇄 버튼, JavaScript 비활성화와 CDN 실패를 확인합니다. `artifacts/`에 화면과 인쇄 PDF가 남습니다.

## 배포

GitHub 저장소 `Martinel2/Martinel2.github.io`의 Settings → Pages → Source를 GitHub Actions로 설정합니다. `main`에 push하면 `.github/workflows/pages.yml`이 `site/`만 배포합니다. 원본 서류는 저장소에 포함하지 않습니다.

## 콘텐츠 근거와 편집 원칙

- 최근 이력서, 활동경험 기술서, 프로젝트별 심화 포트폴리오를 토대로 구성했습니다.
- Fruition 편집: 승인 ADR 0011의 19종·114개 고정 초안 재생 평가. 94/114 → 104/114, 환산 평균 시간 11.11초 → 18.92초. 과거 첫 응답 계약 평가와 혼합하지 않습니다.
- Fruition 검색: 2026-09-13 기존 77개 개념 복원 재평가. 실제 코드 변경 비교 50/110 → 57/110. 구성 비교 DenseRaw 86.36%를 서비스 전후 개선율로 쓰지 않습니다.
- Jev 라우팅: `01_routing_jev-vs-existing_final.md`의 모델 판단 98문항. 기존 JSON 77/98, 동일 선택지 GPT 63/98, Jev 81/98. 로컬 규칙 2문항은 모델 분모에서 제외하며 단일 실행 결과입니다.
- Jev 근거 선택: 같은 보고서 및 `02_300-candidate-existing-vs-jev-comparison.md`. 9개 논문, 정답 80+답 없음 20문항. 500후보와 기존 결과는 재사용하고 300후보·4병렬만 새로 실행. GPT 전체 판정 73/80과 사실 집계 74/80을 구분합니다. 시간은 후보 준비+선택 시간이며 비용은 API 사용량 기반 추정 확인분입니다.
- Pilltip 비용: 예상 약 $200과 실지출 $11.18의 비교. 전처리 인건비 제외.
- Rhwp: PR #1213은 병합, #1351은 제출로 구분했습니다. 확인 기준 2026-09-22.
- 검색 0.8ms, 총 PR 병합 횟수 등 자료 간 해석이 다른 수치는 대표 성과에서 제외했습니다.
- Mermaid는 기존 자료의 처리 흐름을 설명하기 위해 작성했습니다. 개념도인 경우 본문에 표시했습니다.
- 전화번호, 주소, 증명서, 지원 회사별 지원동기와 로컬 경로는 사이트에 넣지 않았습니다.

## 이미지와 블로그 출처

- `fruition-workspace.jpg`, `fruition-wiki.jpg`, `fruition-history.jpg`: 사용자가 제공한 Fruition 중간발표 `Fruition.pdf`의 19·20·21쪽. 페이지 전체를 JPEG로 추출했습니다.
- `pilltip-search.jpg`, `pilltip-chatbot.jpg`: 사용자가 제공한 `Pilltip_졸업과제_발표자료.pdf`의 12·17쪽. 페이지 전체를 JPEG로 추출했습니다.
- `pilltip-blocks.png`: 기존 portfolio/assets의 `pilltip-warning-block-mapping.png` 원본.
- 제품 이미지는 팀 발표 자료의 UI 예시로 표시하며, 개발 성과 수치의 직접 증빙으로 주장하지 않습니다. 각 사례에 개인 담당 범위를 따로 표기했습니다.
- 블로그 [신뢰도를 위한 LLM 평가의 양면성](https://velog.io/@kkuldangi3/신뢰도를-위한-LLM-평가의-양면성), [MSA 전환과 피드백](https://velog.io/@kkuldangi3/MSA-전환과-피드백)의 회고를 관련 읽을거리로 연결했습니다. 예전 RAG 회고의 입력 전략을 이후 재평가 결과와 혼합하지 않았습니다.
- [Jev 공식 소개](https://typesafe.ai/blog/introducing-system-one-models-and-jev)는 모델의 역할 설명에만 사용했습니다. 포트폴리오 수치는 사용자의 직접 비교 보고서 기준입니다.

## 참고한 사이트

- [강동호 포트폴리오](https://resume.dongholab.com/portfolio/ko/): 이력서·포트폴리오 분리, 엔지니어링 프로필, 고정 목차, Mermaid
- [이정현 포트폴리오](https://jhyungit.github.io/): 문제와 해결 접근, 선택 이유와 결과를 연결하는 설명 방식
- [Mermaid 사용 안내](https://mermaid.js.org/config/usage.html)
- [GitHub Pages 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

레퍼런스의 코드·이미지·개인 경력은 복제하지 않았습니다.

## 추가 사례의 평가 근거

- AnyDoc: `anydoc_product_baseline_vs_l107_445_2026-08-08/results.md`, `anydoc_415_blind_2026-08-08/practical_results.md`, `risk_accuracy_reanalysis.md`, `pdf_timing_30p_2026-09-10/results.md`. 30페이지 전후 비교, 415페이지 확장, 기존 판정 조합 추정, 별도 시간 재측정을 구분합니다.
- Jev 개념 병합·연결: `latest-four/04_concept_judgment_jev-vs-llm_final.md`, `03_connection_evidence_judgment_existing-vs-jev.md`. 단건 품질 71/76 대 72/76. 연결 판단 시간 합계를 전체 처리시간으로 쓰지 않습니다.
- 문서 처리 병목: `02_ingest-concurrency-memory-kafka.md`, `03_ingest-concurrency-quality-review.md`. 실제 API 표본, 응답 재생, 임베딩 실험을 구분하고 품질이 동일하다고 주장하지 않습니다.
- 내부 변수명 대신 사용자의 요청·문제·처리 효과를 본문과 구조도에 설명합니다.

- 편집 Agent의 스킬 설정 화면과 검색 순위 사례의 Wiki 편집 화면은 사례와 직접 연결되지 않아 제거했습니다. 제품 소개 화면과 데이터 처리·챗봇 구조 이미지는 해당 맥락에서 유지합니다.
- 해결 옵션은 같은 문제에 대한 대안을 비교합니다. 실험 조건(모델·후보 수·동시 요청 수)은 검증 절차와 결과에서 설명합니다.

## 포트폴리오의 큰 틀

상단 개요(제목·소개·세 가지 주요 경험의 개조식 목록)와 간결한 개발자 프로필 → 목차 → 프로젝트 소개 및 개별 사례 순서입니다. 별도의 광고형 히어로·대표 성과 카드·제품 갤러리는 두지 않습니다. 참고 화면은 각 프로젝트 소개에서 펼쳐 보며, 상세 사례는 문제 → 대안·선택 이유 → 구현·Mermaid → 결과 순서를 유지합니다.
