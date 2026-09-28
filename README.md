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

내용은 `content.json`에서 수정한 후 빌드합니다. `overview`는 첫 화면 소개, `projects`는 프로젝트 소개, `cases`는 상세 경험, `resume`는 이력서 문구, `writings`는 블로그 링크입니다. 이력서의 HTML 구조는 `templates/resume.html`에 있습니다. 로컬에서 수정할 때는 생성된 HTML도 함께 커밋합니다.

브라우저 편집은 [관리자 페이지](https://jaehyeong-velog-regions.velog-analytics.workers.dev/admin/)에서 합니다. 기존 통계 화면과 같은 관리자 계정으로 로그인합니다. 문장 수정 → 변경 확인 → 저장·배포 순서이며, 저장은 GitHub `content.json` 갱신과 Pages 자동 배포로 이어집니다. 토큰 최초 연결 방법은 `velog-analytics/README.md`를 참고하세요. 현재는 기존 항목의 문장·링크·Mermaid·사진 설명을 편집하며 항목 추가/삭제와 이미지 업로드는 지원하지 않습니다.

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
- PDF 선택 복원: `local-pilot/tmp/docling_codex_benchmark_2026-07-23/experiment_comparison.md`의 L12~L14에서 실제 실행 및 기본값 유지 기록 확인. 선택 후보 85/96 통과와 미선택 107/349 오류는 서로 다른 분모다. L75의 80.00% → 97.53%, 재현율 94.38%, 오탐률 14.04%는 별도 평가이며 제목의 45.17% → 89.89%와 직접 순위 비교하지 않는다. L75의 755.15초는 단계별 시간 합이다.
- PDF 전체 AI: `local-pilot/tmp/anydoc_415_blind_2026-08-08/practical_results.md`의 5,817영역 통과율 91.92%, 표·수식 완전 일치 58.84%. 선택 경로의 품질 추정과 실제 조립·호출량을 구분한다.
- Pilltip 비용: 예상 약 $200과 실지출 $11.18의 비교. 전처리 인건비 제외.
- Pilltip 전시 피드백: 사용자 확인 2026-09-28. 첫 전시에서 받은 건강기능식품 요청을 보유 데이터 범위에서 검색·자동완성, 복용 주의·병용 정보 표출, 복약 알림·기록, 챗봇 답변까지 확장했습니다. 의약품과 같은 전수 범위로 적지 않습니다. 컨테이너 전환 지적은 졸업과제 기간 내 미반영이므로 반영한 것으로 쓰지 않습니다.
- 전시 규모: SK AI SUMMIT·K-ICT WEEK의 행사 전체 방문자 수는 본인 서비스의 사용 지표가 아니므로 쓰지 않습니다. 부스 방문자·시연 인원·피드백 건수의 근거 있는 기록이 없어 수치 없이 서술합니다.
- Jev 의존 범위: 검색이 후보 수집, Jev가 최종 근거 판단을 맡는 단계 분리는 실험 기록으로 확인한 구조입니다. cross-encoder 리랭커(BGE-reranker, Cohere Rerank 등)를 베이스라인으로 넣은 실행 기록이 없어 대체 리랭커와의 직접 비교는 주장하지 않습니다. 장애 시 대체 경로도 같습니다.
- 라우팅 비용: `jev-evaluation-retrospective.md`의 100문항 기준 Jev 약 $0.0408, 동일 선택지 GPT 약 $0.1027. 전수 검사의 입력 약 1억 2,448만·출력 약 647만 토큰은 API 보고 사용량이며 실제 청구액은 확인하지 않았습니다.
- 기존 검색 탈락 단계: 같은 회고의 2,020근거·90문항 실험 기준. 초기 후보에는 90문항 모두 정답 페이지가 있었고 앞 8페이지 제한에서 76문항, 페이지 내부 최고 점수 85% 기준에서 8문항, 최종 8개 제한과 관련 페이지 탐색에서 2문항이 탈락했습니다. 9개 논문·80+20문항 실험과는 평가셋이 다르므로 수치를 이어 붙이지 않습니다.
- 후보 생성 비교: `jev-generalization/candidate-generator-comparison/report.md`. 저장 점수를 재사용한 순위 재현이고 운영 검색·최종 선택기는 변경하지 않았습니다. 정답 인용 보존율이며 최종 답변 정확도가 아닙니다. 반복 사용한 평가셋이므로 독립 검증으로 쓰지 않습니다. 운영 혼합보다 BGE-M3 단독이 앞선 결과는 그대로 적고, 300후보 구성에서 차이가 작아 운영을 바꾸지 않은 판단도 함께 적습니다.
- LLM 추적: `dev-msa/docs/backlog/changelog/ai.md`의 1298·1304행(graph node와 LLM span 확인, `POST /pipeline/runs`·`POST /query` 실행 기준), 657행(평가 루프를 LangGraph graph로 재구성), 675~676행(키 없으면 graph 실행 유지·tracing만 생략), 87행(Agent graph tracing 비활성화, tool 조회 원문 checkpoint 제외, 90일 만료 시 checkpoint 우선 삭제). 자체 프롬프트 로그의 숫자 개인정보 마스킹은 `chat_completions_llm.py`의 `redact_numeric_personal_data` 적용분입니다. 시간 측정 스크립트가 `LANGSMITH_TRACING`·`LANGCHAIN_TRACING_V2`·`LLM_PROMPT_LOG_DIR`을 모두 끄는 것은 `services/ai/pipeline`의 실행 스크립트에서 확인했습니다. 상시 운영 중인 대시보드나 알림 체계는 구축하지 않았으므로 그렇게 적지 않습니다.
- LangChain: `services/ai/pipeline/requirements.txt`의 `langchain-openai`·`langchain-anthropic`·`langchain-google-genai`와 `chat_completions_llm.py`의 provider별 JSON 계약 구현으로 확인했습니다.
- 대화 메모리·편집 입력: `Fruition-ai/pipeline`의 `app/modules/query/application/conversation_context_resolver.py`(`RECENT_MESSAGE_LIMIT = 6`, 누적 요약 갱신, 요약 실패 시 이전 요약 유지), `app/modules/agent/infrastructure/chat_completions_turn_router.py`(요약·최근 메시지·이전 턴 라우팅 결정 전달), `app/modules/markdown_edit/domain/markdown_target_scope.py`(대상 줄 범위와 문맥 줄, 구조 경계 침범 거절), `markdown_context_benchmark.py`(원문 대비 입력 비율, 평균·p95). 코드에서 확인한 동작만 적고 운영 트래픽 기준 효과는 주장하지 않습니다.
- 작업 취소·복구: `dev-msa/docs/adr/0018-ai-task-cancellation.md`와 `0012-ai-operation-log-and-rollback.md`. `git log --follow` 기준 두 ADR 모두 재형 단독 커밋입니다(0018은 2026-09-09 2커밋, 0012는 2026-08-10 1커밋). 설계와 단위 검증 범위이며 운영 트래픽의 복구 성공률은 측정하지 않았으므로 그렇게 적지 않습니다.
- Skill 불변 버전: `0013-versioned-agent-skills.md`(재형 단독). 근거 기반 고정 파이프라인과 Query Agent 보류는 `0009-query-pipeline.md`(재형 단독)와 `docs/backlog/spec/query-engine.md`(재형 9/11커밋)입니다.
- 제외한 팀원 작업: `Fruition_AWS_MSA_Architecture.md`의 Kafka retry topic·DLQ·offset commit 시점·알람 설계는 `--follow` 기준 팀원 단독 11커밋이므로 서류에 넣지 않습니다. `aws-msa-deployment-readiness-plan.md`도 같습니다. AI 워커의 Kafka 소비(`task_worker.py` 재형 19/27, `ingest_worker.py` 9/16)만 본인 기여로 봅니다.
- Rhwp: PR #1213은 병합, #1351은 제출로 구분했습니다. 확인 기준 2026-09-22.
- 검색 0.8ms, 총 PR 병합 횟수 등 자료 간 해석이 다른 수치는 대표 성과에서 제외했습니다.
- 이력서 본문의 라벨은 `build.py`의 `resume_text`가 인식하는 `문제`·`해결`·`성과`·`판단`(영문 `Problem`·`Solution`·`Result`)만 씁니다. 다른 표현을 쓰면 라벨 색이 붙지 않아 형식이 어긋납니다.
- Mermaid는 기존 자료의 처리 흐름을 설명하기 위해 작성했습니다. 개념도인 경우 본문에 표시했습니다.
- 전화번호, 주소, 증명서, 지원 회사별 지원동기와 로컬 경로는 사이트에 넣지 않았습니다. 지원동기는 지원 폼에만 쓰고 저장소 밖에서 관리합니다.
- PDF·DOCX의 상단은 이름 줄이 직함을 담으므로 `.resume-role`을 다시 넣지 않습니다. 웹 페이지는 이름 줄이 `RESUME / 김재형`이라 직함 줄이 따로 필요합니다.

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

상단 개요(제목·소개·세 가지 주요 경험의 개조식 목록)와 간결한 개발자 프로필 → 목차 → 프로젝트 소개 및 개별 사례 순서입니다. 별도의 광고형 히어로·대표 성과 카드·제품 갤러리는 두지 않습니다. 참고 화면은 각 프로젝트 소개에서 담당 범위 설명과 함께 바로 보여주며, 상세 사례는 문제 → 대안·선택 이유 → 구현·Mermaid → 결과 순서를 유지합니다.

- 공개 본문에서는 내부 평가 자료의 이름·개수만 제시하지 않습니다. 검색 사례는 질문의 맥락 손실 → 입력·순위 계산 변경 → 정답을 먼저 찾은 질문 수로 설명하며, 원본 평가 세부사항은 근거 기록으로만 보존합니다. 사용자가 삭제한 내부 용어를 근거 보강 목적으로 다시 본문에 넣지 않습니다.

## 담당 범위와 화면 배치 (2026-09-23 사용자 확인)

- Fruition: AI 기능 전체 리드. 프론트엔드·백엔드는 팀원 담당. MSA 초기 설계는 김재형이 제안하고 팀원·멘토와 논의하여 최종 구조 공동 완성. 블로그 「MSA 전환과 피드백」과 사용자 설명을 반영합니다.
- Pilltip: 의약품 DB, DUR 표출, 검색·자동완성, FCM 복약 알림·로그, 딥링크 친구 초대, 가족 프로필 전환, 모든 의약품의 구어체 설명을 위한 정제 파이프라인, RAG·AI 오케스트레이션 챗봇 담당. 전시 피드백을 반영한 건강기능식품 확장도 본인 담당입니다.
- 각 프로젝트 소개에 담당 범위와 협업을 명시합니다. 화면 캡션에는 해당 기능의 기여를 연결하며, UI 자체를 개인 구현으로 주장하지 않습니다. 친구 초대의 별도 화면은 제공 자료에서 확인하지 못해 가족 화면을 초대 화면으로 표시하지 않습니다.
- 추가 이미지: Fruition 중간발표 14쪽 `fruition-architecture.jpg`, Pilltip 졸업발표 14쪽 `pilltip-reminders.jpg`, 15쪽 `pilltip-family.jpg`. 원본 PDF 페이지를 JPEG로 렌더링했습니다.

## 비공개 방문 통계 연결

통계 대시보드는 Google Analytics 계정에서만 확인합니다. 공개 페이지에 방문자 수·관리자 메뉴를 표시하지 않습니다. 측정 코드는 브라우저에서 확인할 수 있으며, 대시보드를 비공개로 두는 것이 추적 코드까지 숨긴다는 뜻은 아닙니다.

1. GA4 속성을 만들고 웹 스트림에 `https://martinel2.github.io`를 등록합니다.
2. 저장소 Actions variable `GA_MEASUREMENT_ID`에 측정 ID(`G-…`)를 설정합니다. 이는 수집 대상 식별자로, 관리자 접근 비밀번호가 아닙니다.
3. Deploy portfolio workflow를 다시 실행합니다. 변수 미설정 시 추적 코드를 로드하지 않습니다.
4. GA 실시간 보고서에서 확인합니다. 일반 보고서에는 처리 시간이 필요할 수 있습니다. 상세 사례 집계에는 이벤트 범위 맞춤 측정기준 `case_id`를 등록합니다.

- 기본: 페이지 방문·유입. 추가 이벤트: `view_case`(페이지 로드당 사례별 1회 노출), `project_image_open`(이미지 원본 열기), `resume_print`(인쇄 버튼 누름), `contact_click`(메일 링크 누름). 실제 완독·PDF 저장·메일 발송 여부를 뜻하지 않습니다.
- 지원처별 링크 예시: `https://martinel2.github.io/?utm_source=application&utm_medium=resume&utm_campaign=company-a`. 지원처마다 마지막 코드를 바꾸고 GA 캠페인 보고서로 확인합니다. 방문자의 실제 소속이나 신원 증명이 아니며 링크가 전달되거나 미리보기 봇이 열 수 있습니다.
- 링크에 개인 이름·이메일을 넣지 않고 지원처용 코드를 사용합니다. 코드에는 영문·숫자·하이픈·밑줄만 사용합니다. URL 전체 쿼리·해시 대신 허용된 캠페인 값만 설정하고 광고 개인화·Google Signals는 사용하지 않습니다.
- 로그인·방문자 실명 추정·기기 지문 수집은 구현하지 않았습니다. 익명 방문자의 이름이나 소속은 이 방식으로 확인할 수 없습니다.
- 공식 문서: [측정 ID](https://support.google.com/analytics/answer/12270356), [캠페인 링크](https://support.google.com/analytics/answer/10917952), [이벤트](https://developers.google.com/analytics/devguides/collection/ga4/events).


## PDF 및 Word 이력서

`npm run build`는 동일한 이력서 본문과 페이지 구성을 사용해 `site/resume.pdf`와 편집 가능한 `site/resume.docx`를 생성합니다. 홈의 이력서 버튼에서 PDF 보기 또는 Word 다운로드를 선택할 수 있습니다. 관리자 저장으로 배포가 실행되면 두 파일도 함께 갱신됩니다.

DOCX는 본문·표·목록·하이퍼링크와 증빙 이미지로 구성됩니다. PDF는 Chrome이 `resume-pdf.css`를 인쇄하고 DOCX는 `docx` 라이브러리로 Word 문단을 조립하는 별도 경로이므로, 타이포그래피를 같은 값으로 맞춰야 분량이 비슷해집니다. `build-resume-docx.mjs`의 `SIZE`는 CSS px × 1.5(half-point), 간격은 px × 15(twips), 줄 높이는 `lineFor`가 half-point × 14.5(영문 14)로 계산해 line-height 1.45를 재현합니다. 페이지 여백도 PDF의 13·14·16mm와 같습니다. 강제 페이지 나눔은 어느 쪽에도 두지 않습니다. 홈 소개 팝업과 이력서는 `문제: 내용` 형식으로, 상세 포트폴리오는 항목명 다음 줄에서 본문을 시작합니다. 현재 한국어 PDF·Word는 3페이지, 영어는 4페이지입니다. 같은 내용을 영어로 옮기면 분량이 늘어납니다. 이력서 Fruition은 토픽 네 개(RAG 근거 선택 · 에이전트 실행 환경 · 실행 신뢰성과 추적 · 데이터 파이프라인)로 묶고, MSA 공동 설계는 scope-note 한 줄로 둡니다. 측정치가 있는 항목은 문제·해결·성과 세 줄, 설계 범위의 항목은 문제·해결 두 줄로 적어 지면을 배분합니다. 이력서 흐름에는 강제 페이지 나눔을 두지 않고, 수상 증빙 썸네일만 인쇄에서 줄여 분량을 맞춥니다. 설치된 글꼴과 수정한 내용에 따라 페이지 나눔은 달라질 수 있습니다. Word에서 내려받은 파일을 수정해도 사이트로 역반영되지는 않습니다.

`python3 scripts/test-resume-docx.py`는 빌드 후 PDF 원본과의 본문 일치, 이미지·링크·편집 제한 여부를 검사합니다. 배포에서도 이 검사를 통과해야 게시합니다.

## 지원동기를 붙인 로컬 이력서

지원 폼에 지원동기 입력란이 없을 때 쓰는 별도 산출물입니다. 공개 사이트에는 넣지 않습니다.

```sh
npm run cover          # 한 번 빌드
npm run cover:watch    # 저장할 때마다 다시 빌드
```

지원동기는 세 줄 요약만 둡니다. 이력서 본문이 이미 세 페이지를 거의 채우고 있어, 섹션이 붙으면 네 페이지가 됩니다. 그래서 이 빌드에만 `RESUME_EXTRA_CSS`로 증빙 썸네일과 섹션 간격을 줄여 세 페이지를 유지합니다. 본문은 깎지 않으며 공개 이력서에는 이 압축이 적용되지 않습니다. 지원동기를 길게 쓰려면 네 페이지를 받아들이거나 압축값을 더 조여야 합니다. 긴 초안과 문장별 근거는 저장소 밖 지원 폴더의 `지원동기_초안.md`에 있습니다.

`- `로 시작하는 줄 묶음은 목록으로, 나머지 문단은 본문으로 렌더링합니다. 맨 앞 목록을 요약으로 쓰고 있으며 네 줄을 넘기지 않습니다.

`local/지원동기_토스증권.md`의 본문을 고치면 `local/이력서_지원동기_토스증권.pdf`와 `.docx`가 다시 만들어집니다. 빈 줄로 문단을 나누고 강조는 `**두 별표**`, 맨 위 `#` 줄이 섹션 제목입니다. `<!-- -->` 주석 안의 내용은 문서에 들어가지 않습니다. 회사를 추가하려면 markdown을 하나 더 만들고 경로를 인자로 넘깁니다.

`local/`은 `.gitignore`에 있어 저장소에 올라가지 않습니다. 지원동기는 회사별 문서이고 공개 페이지에 둘 내용이 아니므로, 본문과 산출물 모두 여기에서만 관리합니다. 빌더는 이력서 본문 뒤에 섹션을 덧붙이므로 앞 세 페이지는 공개 이력서와 같고 지원동기가 마지막 페이지로 붙습니다.

지원동기는 이름 줄 바로 뒤, SUMMARY 앞에 옵니다. 빌더는 `.resume-lead` 클래스가 붙은 섹션을 그 자리에 두고, 나머지 섹션의 고정 인덱스는 건드리지 않습니다. HTML 상의 위치는 마지막으로 두어야 합니다. DOCX 빌더가 첫 번째 `.resume-section`의 `<p>`를 SUMMARY 문장으로 보고 지우기 때문에, 앞쪽에 넣으면 지원동기 본문이 사라집니다.

`RESUME_DIR`과 `RESUME_LANGS`는 이 빌드를 위해 `build-resume-pdf.mjs`에 둔 환경변수입니다. 설정하지 않으면 기존처럼 `site/`와 두 언어를 씁니다. 이력서 빌더는 여섯 번째 이후의 `.resume-section`을 그대로 뒤에 싣습니다.

## 한국어·영어 전환

공개 페이지의 EN / 한국어 버튼은 같은 페이지·목차 위치를 유지하며 전환합니다. 한국어는 기존 주소, 영어는 `/en/`에서 제공합니다. 영어 상태의 PDF·Word 링크는 `/en/resume.pdf`, `/en/resume.docx`로 연결됩니다. 이미지 속 글자와 원본 증빙은 번역하지 않습니다.

한국어 본문은 `content.json`, 영어 본문은 `content.en.json`, 공통 화면의 고정 영문 문구는 `ui.en.json`입니다. 관리자 UI는 한국어를 유지하며 ‘편집할 언어’에서 각각 수정합니다. 한국어 저장 시 자동 번역하지 않으므로 변경한 내용은 영어에서도 수정해야 합니다. 언어를 바꾸기 전에 미저장 내용이 있으면 확인하며, 각 파일의 SHA로 저장 충돌을 따로 검사합니다.

`npm run build`가 두 언어의 HTML·PDF·DOCX를 모두 생성합니다. `node scripts/test-languages.mjs`로 언어 이동·문서 링크·번역 누락·모바일 레이아웃을 확인합니다.
