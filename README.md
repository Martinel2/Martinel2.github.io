# 김재형 · 이력서와 포트폴리오

GitHub Pages용 정적 사이트. 공개 사이트: https://Martinel2.github.io/

- `site/index.html`: 포트폴리오, 목차, 네 가지 사례와 Mermaid 구조도
- `site/resume.html`: 이력서, 브라우저 인쇄를 통한 PDF 저장
- `content.json`: 프로젝트별 본문과 Mermaid 원문
- `build.py`: 본문을 HTML로 생성. Python 표준 라이브러리만 사용
- `site/assets/`: 스타일과 작은 UI 스크립트

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

테스트는 임시 HTTP 서버를 시작해 데스크톱·모바일 레이아웃, 링크, Mermaid, 목차, 인쇄 버튼, JavaScript 비활성화와 CDN 실패를 확인합니다. `artifacts/`에 화면과 인쇄 PDF가 남습니다.

## 배포

GitHub 저장소 `Martinel2/Martinel2.github.io`의 Settings → Pages → Source를 GitHub Actions로 설정합니다. `main`에 push하면 `.github/workflows/pages.yml`이 `site/`만 배포합니다. 원본 서류는 저장소에 포함하지 않습니다.

## 콘텐츠 근거와 편집 원칙

- 최근 이력서, 활동경험 기술서, 프로젝트별 심화 포트폴리오를 토대로 구성했습니다.
- Fruition 편집: 승인 ADR 0011의 19종·114개 고정 초안 재생 평가. 94/114 → 104/114, 환산 평균 시간 11.11초 → 18.92초. 과거 첫 응답 계약 평가와 혼합하지 않습니다.
- Fruition 검색: 2026-09-13 기존 77개 개념 복원 재평가. 실제 코드 변경 비교 50/110 → 57/110. 구성 비교 DenseRaw 86.36%를 서비스 전후 개선율로 쓰지 않습니다.
- Pilltip 비용: 예상 약 $200과 실지출 $11.18의 비교. 전처리 인건비 제외.
- Rhwp: PR #1213은 병합, #1351은 제출로 구분했습니다. 확인 기준 2026-09-22.
- 검색 0.8ms, 총 PR 병합 횟수 등 자료 간 해석이 다른 수치는 대표 성과에서 제외했습니다.
- Mermaid는 기존 자료의 처리 흐름을 설명하기 위해 작성했습니다. 개념도인 경우 본문에 표시했습니다.
- 전화번호, 주소, 증명서, 지원 회사별 지원동기와 로컬 경로는 사이트에 넣지 않았습니다.

## 참고한 사이트

- [강동호 포트폴리오](https://resume.dongholab.com/portfolio/ko/): 이력서·포트폴리오 분리, 엔지니어링 프로필, 고정 목차, Mermaid
- [이정현 포트폴리오](https://jhyungit.github.io/): 문제와 해결 접근, 선택 이유와 결과를 연결하는 설명 방식
- [Mermaid 사용 안내](https://mermaid.js.org/config/usage.html)
- [GitHub Pages 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

레퍼런스의 코드·이미지·개인 경력은 복제하지 않았습니다.
