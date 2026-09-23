# Velog 지역 통계

## 포트폴리오 관리자

`/admin/`은 동일한 관리자 인증으로 보호되는 내용 편집기입니다. 정적 자산도 `run_worker_first`를 통해 인증 후 전달됩니다.
`/admin/api/content`는 지정된 GitHub 저장소의 `content.json`만 읽고 수정합니다. 저장 전 기존 SHA 비교와 GitHub의 SHA 조건부 갱신으로 동시 편집을 보호하며, 요청 Origin과 사용자 정의 헤더를 검사합니다. 실패 시 브라우저 입력은 유지됩니다.

최초 연결에는 GitHub Fine-grained PAT가 필요합니다. `Martinel2/Martinel2.github.io` 저장소 하나만 선택하고 **Contents: Read and write** 권한을 부여한 후 Cloudflare Worker의 `GITHUB_TOKEN` secret으로 설정합니다. Actions나 Workflows 쓰기 권한은 필요하지 않습니다. 토큰은 클라이언트·공개 저장소에 전달되지 않습니다. 토큰 만료 시 교체해야 합니다. 토큰이 없으면 읽기/편집/백업은 가능하고 서버 저장은 비활성화됩니다.

```sh
npx wrangler secret put GITHUB_TOKEN
node test-editor.mjs
```

저장은 `main`에 콘텐츠 변경 커밋을 만들고 기존 Pages 워크플로를 실행합니다. 관리자 화면은 저장 완료와 배포 완료를 구분하며 배포 상태 링크를 제공합니다. 과거 버전 복구는 GitHub 변경 이력을 사용합니다. 로컬 파일은 자동 동기화되지 않으므로 다음 로컬 작업 전에 `git pull --ff-only`로 갱신합니다.
폼은 기존 항목의 텍스트/링크를 편집합니다. 항목 수·이미지 경로·식별자는 고정이며 레이아웃 변경과 이미지 업로드는 지원하지 않습니다. 새 콘텐츠 구조는 코드에서 추가할 수 있습니다.

배포 주소: https://jaehyeong-velog-regions.velog-analytics.workers.dev

비공개 통계: https://jaehyeong-velog-regions.velog-analytics.workers.dev/stats

관리자명: `admin`. 생성한 비밀번호는 로컬 `~/.config/velog-analytics/admin-password.txt`에만 저장합니다(파일 권한 600).
Cloudflare에는 `ADMIN_PASSWORD` secret으로 등록합니다. 현재 허용된 글 ID는 `test`입니다.

2026-09-23 배포 검증: HTTPS 이미지 응답 200, 미인증 통계 401, 인증 통계 200,
직접 이미지 요청의 실제 국가/지역/도시 집계 저장을 확인했습니다. `test`에는 서버 검증 요청 1회가 포함됩니다.
Velog 본문을 통한 수집은 이미지 삽입 후 별도 확인이 필요합니다.

테스트 글에 넣을 실제 마크다운:

```markdown
![](https://jaehyeong-velog-regions.velog-analytics.workers.dev/p/test.gif)
```

Cloudflare Workers의 `request.cf.country/region/city`로 이미지 요청을 지역별 집계합니다.
IP 헤더·좌표·User-Agent·리퍼러·쿠키·방문자 ID는 저장하지 않습니다. 알려진 봇 User-Agent와 DNT/GPC 요청은 제외합니다.
Cloudflare 인프라 자체의 네트워크 처리는 이 앱의 저장 범위와 별개입니다. Workers 로그 수집은 비활성화합니다.

통계는 `/stats`에서 HTTP Basic 인증으로 보호됩니다. 사용자명은 `admin`, 비밀번호는 Worker secret입니다.
최근 30일의 글별 국가·지역·도시 요청 횟수를 표시하며, 한국 시간 기준 일별 집계를 90일 보관합니다.
이 수치는 고유 방문자 수나 Velog 조회수가 아닙니다. 반복 로딩·캐시·차단·미탐지 봇으로 차이가 납니다.
국가 코드는 ISO 코드이고 Unknown은 Cloudflare가 지역을 제공하지 않은 요청입니다.

## 배포

이 폴더에서 실행합니다. 계정/비밀번호를 공개 저장소에 넣지 않습니다.

```sh
npx wrangler login
npx wrangler d1 create velog-regions
```

출력된 database_id를 `wrangler.jsonc`에 입력한 다음:

```sh
npx wrangler d1 execute velog-regions --remote --file=schema.sql
npx wrangler secret put ADMIN_PASSWORD
npx wrangler deploy
```

비밀번호는 32자 이상의 무작위 문자열로 설정합니다. URL 쿼리에 비밀번호를 넣지 않습니다.
새 글을 추가할 때 `POST_IDS`에 영문 소문자·숫자·하이픈의 글 ID(최대 64자)를 쉼표로 추가하고 재배포합니다.
임의 글 ID는 수집하지 않습니다. 공개 이미지 주소로 위조 요청은 가능하므로 이 통계는 참고용입니다.

## Velog에서 확인할 절차

아직 Velog 실서비스에서 직접 요청·캐시 동작이 검증된 상태는 아닙니다.
배포 후 테스트 글 본문에 외부 이미지 URL을 직접 입력합니다. 이미지 업로드를 사용하면 Velog 저장소로 복사되어 수집되지 않습니다.

```markdown
![](https://실제-배포주소/p/test.gif)
```

1. 테스트 글 미리보기/게시 화면의 네트워크 탭에서 위 서버로 직접 GET 요청이 발생하는지 확인합니다.
2. 본인 기기의 Wi-Fi와 모바일 데이터에서 각각 열고 인증된 `/stats`에서 기록이 증가하는지 확인합니다.
3. 주소가 Velog 이미지 프록시로 바뀌거나 요청이 중계된다면 실제 방문자 지역을 측정했다고 판단하지 않습니다.
4. 미리보기·본인 테스트도 요청으로 집계됩니다. 테스트용 ID와 실제 글 ID를 분리합니다.

통계 화면은 방문자에게 표시되지 않지만, 이미지 주소는 글 소스/네트워크에서 확인할 수 있습니다.
원하는 경우 글 하단에 “이 글은 원본 IP를 저장하지 않는 지역별 접속 통계를 수집합니다”라고 안내할 수 있습니다.

## 검증

```sh
node test.mjs
npx wrangler deploy --dry-run
```

Node 22.13 이상 필요. 테스트는 실제 메모리 SQLite에 기록하고 원본 IP 미저장, 인증, 집계, 입력 검증, HTML 이스케이프, 보관기간을 검사합니다.
Cloudflare 지역 메타데이터는 테스트 값으로 주입합니다. 로컬 통과가 실제 Velog 수집 성공을 의미하지 않습니다.

참고: [Cloudflare 요청 지역 정보](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties)
