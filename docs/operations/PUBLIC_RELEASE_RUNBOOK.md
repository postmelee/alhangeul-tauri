# 공개 릴리즈 실행 가이드

Windows/Linux Alhangeul의 승인된 릴리즈 작업에서 사용하는 순서다. 기준은
[정책](DESKTOP_RELEASE.md), 검증 선택은 [체크리스트](RELEASE_CHECKLIST.md), 실행 결과는
[버전별 기록](../releases/README.md)에 둔다. 이 문서 자체는 실행·서명·게시 승인이 아니다.

## 실행 전 약속

- 아래 명령은 저장소 root의 Bash 기준이다. 승인된 exact source와 준비된 pnpm 의존성을
  사용한다. 문서 검토 중 명령을 일괄 실행하지 않는다. 실패하면 다음 명령으로 넘어가지 않는다.
- `조회`는 원격 변경 없음, `로컬`은 다운로드·생성물 저장, `원격 실행`은 CI 자원 사용,
  `공개`는 Release 또는 Pages 변경이다. 서명 후보도 Secret 사용 승인이 필요하다.
- 예제의 `ALH_*` 변수는 버전 기록에서 확정한 값으로 실행자가 설정한다. 미설정 방지 검사만
  통과했다고 승인된 값은 아니다. private key·암호·token은 변수 예제·기록·로그에 넣지 않는다.
- source/workflow SHA와 Pages SHA, Actions archive digest와 installer SHA-256은 다른 값이다.
  각 gate에 결과·근거·승인자·시점·실패 원인·재개 위치를 기록한다.

## Gate 0 — 공개 입력과 채널 확정

입력: 실행 Issue·release owner, version·tag, 이전 공개 tag/commit, candidate exact SHA,
포함 패키지·known limitations·서명 정책·release PR. 첫 공개의 이전 버전은 `없음`으로 쓴다.

조회:

```bash
ALH_REPO=postmelee/alhangeul-tauri
git status --short --branch
git remote get-url origin
gh api --paginate "repos/$ALH_REPO/releases" --jq '.[] | {tag_name,draft,prerelease,published_at,html_url}'
gh api "repos/$ALH_REPO/environments/release"
gh api "repos/$ALH_REPO/environments/github-pages"
gh api "repos/$ALH_REPO/environments/github-pages/deployment-branch-policies"
```

기대·증거: 실제 공개 목록, 원격·작업트리, 환경 reviewer·self-review·허용 ref를 기록한다.
`release`의 branch policy가 있으면 그 목록도 조회한다. 환경 이름만으로 보호를 추정하지 않는다.
2026-09-04 확인값은 `github-pages`: `devel` 허용, `release`: reviewer 있음/ref 제한 없음이다.
실행 때 재확인하고 필요한 보호 변경은 별도 승인을 받는다. 조회 실패를 '제한 없음'으로 해석하지 않는다.

현재 [desktop workflow](../../.github/workflows/alhangeul-desktop.yml)의 `updater`와
[Pages 데이터](../../scripts/pages/release-data.mjs)는 stable `X.Y.Z`만 지원한다.
prerelease·draft·수동 DEB/RPM·arm64 동시 게시가 필요하면 현재 명령으로 우회하지 않는다.
**중단/재개:** 미정 입력·공개 정책 차이가 있으면 owner 결정 후 이 gate부터 재확인한다.

## Gate 1 — 변경 범위와 검증 선택

입력: 승인한 이전 source 또는 첫 공개의 분석 시작 SHA를 `ALH_BASE_SHA`, 후보를
`ALH_SOURCE_SHA`로 설정한다. 일반 Task는 `devel`, release PR은 `devel → main` 원칙을 따른다.

조회·로컬 검사:

```bash
: "${ALH_BASE_SHA:?승인한 분석 시작 SHA}" "${ALH_SOURCE_SHA:?승인한 후보 SHA}"
git log --oneline "$ALH_BASE_SHA..$ALH_SOURCE_SHA"
git diff --name-status "$ALH_BASE_SHA" "$ALH_SOURCE_SHA"
git rev-parse HEAD
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
```

기대·증거: 검사 checkout의 HEAD가 후보와 일치하고 제품 version·updater 공개키·endpoint 및
rhwp Stable tag/resolved commit·core/WASM/Studio 출처가 맞는다. pin tag만 로컬에 없으면
[upstream 절차](../architecture/UPSTREAM.md)로 exact tag를 확보한다. 임의 pin 갱신은 하지 않는다.
포함 PR은 앱/upstream/운영/문서로 분류하고 해결 Issue와 참고 Issue를 구분한다.
최신 upstream과 pin이 다르면 승인된 유지 이유 또는 별도 갱신 Task를 기록한다.

[영향별 선택표](RELEASE_CHECKLIST.md#변경-영향별-추가-확인)로 실행·재사용·해당 없음과 이유를
정한다. 재사용에는 이전 성공 SHA·run·환경과 candidate diff가 필요하다. 문서-only 변화에
전체 native/negative suite를 반복하지 않는다. 새 bytes의 설치·무결성은 재사용하지 않는다.
**중단/재개:** identity·pin 불일치, 포함 범위 누락, 필수 위험 미결정이면 후보 승인부터 다시 받는다.

## Gate 2 — 승인된 비게시 후보 확보

입력: 승인한 branch/tag 이름 `ALH_WORKFLOW_REF`, version/tag/notes, 선택 검증 범위.
`--ref`는 workflow가 있는 branch/tag이고 `build_ref`는 exact SHA다. dispatch 직전 remote ref의
resolved commit을 확인한다. updater는 workflow SHA = build_ref = checkout SHA가 필수다.

원격 실행 — 필요한 경우에만 일반 package/native 증거 확보:

```bash
: "${ALH_WORKFLOW_REF:?승인 ref}" "${ALH_SOURCE_SHA:?승인 SHA}"
gh workflow run alhangeul-desktop.yml -R "$ALH_REPO" --ref "$ALH_WORKFLOW_REF" \
  -f mode=artifact -f build_ref="$ALH_SOURCE_SHA" -f run_tests=true
```

일반 mode는 Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB 및
package/thumbnail 증거를 만든다. updater overlay·서명 후보를 대신하지 않는다.

원격 실행·서명 — 비게시 updater 후보:

```bash
: "${ALH_VERSION:?승인 X.Y.Z}" "${ALH_TAG:?승인 vX.Y.Z}" "${ALH_NOTES:?승인 notes}"
gh workflow run alhangeul-desktop.yml -R "$ALH_REPO" --ref "$ALH_WORKFLOW_REF" \
  -f mode=updater -f build_ref="$ALH_SOURCE_SHA" \
  -f release_version="$ALH_VERSION" -f release_tag="$ALH_TAG" \
  -f release_notes="$ALH_NOTES" -f publish_release=false
```

`release` 환경의 `TAURI_SIGNING_PRIVATE_KEY`·`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`는
서명 build에만 사용한다. 값은 읽거나 출력하지 않는다. updater mode의 `run_tests`는 일반
mode의 전체 test·Windows installer smoke를 실행시키는 스위치가 아니다.

조회 — 반환된 URL에서 run ID를 고정한다. '가장 최근 run'을 임의 선택하지 않는다:

```bash
: "${ALH_RUN_ID:?해당 dispatch run ID}"
gh run view "$ALH_RUN_ID" -R "$ALH_REPO" --json url,headSha,event,status,conclusion,jobs
gh api --paginate "repos/$ALH_REPO/actions/runs/$ALH_RUN_ID/artifacts" \
  --jq '.artifacts[] | {id,name,digest,expired,expires_at,size_in_bytes}'
```

기대·증거: 해당 mode의 필수 job/step·upload 성공, 실제 checkout/workflow SHA와 입력,
archive ID·digest·만료일. updater는 두 build와 complete inventory verifier가 성공하고
publish는 skipped여야 한다. 일반 mode의 updater skipped는 오류도 updater 수용도 아니다.
**중단/재개:** 실패·증거 누락·ref 이동은 원인과 변경 입력 확인 후 승인된 재실행만 한다.

## Gate 3 — 실제 게시할 파일 검증과 Go/No-Go

입력: Gate 2 또는 별도로 승인한 게시 경로의 **게시 대상 bytes**, inventory, 대상별 설치 환경.
로컬 다운로드는 새 `mktemp -d` 디렉터리를 사용하고 archive 내부 경로를 유지한다.

일반 artifact의 예 (`ALH_PLATFORM`은 승인한 `windows-x64`, `linux-x64`, `linux-arm64` 중 하나):

```bash
: "${ALH_PLATFORM:?검증할 platform}" "${ALH_RUN_ID:?일반 artifact run}"
ALH_ARTIFACT_DIR=$(mktemp -d)
gh run download "$ALH_RUN_ID" -R "$ALH_REPO" \
  -n "alhangeul-desktop-$ALH_PLATFORM" -D "$ALH_ARTIFACT_DIR"
pnpm run check:desktop-artifacts -- --platform "$ALH_PLATFORM" \
  --root "$ALH_ARTIFACT_DIR" --verify-inventory "$ALH_ARTIFACT_DIR/alhangeul-artifact-inventory.json"
```

updater run은 `alhangeul-updater-windows-x64`, `alhangeul-updater-linux-x64` 두 slice를
각각 `gh run download`로 같은 새 root에 받는다. complete inventory는
`alhangeul-updater-release-inventory`를 별도 폴더에 받는다. 원본 archive ID/digest를 함께 보존한다.
`ALH_UPDATER_DIR`를 두 slice root로 지정하고 후보 checkout의 공개키로 검사한다:

```bash
: "${ALH_UPDATER_DIR:?검증할 updater root}"
export TAURI_UPDATER_PUBLIC_KEY="$(node -p "require('./apps/desktop/src-tauri/tauri.updater.conf.json').plugins.updater.pubkey")"
pnpm run check:updater-artifacts -- --root "$ALH_UPDATER_DIR" \
  --version "$ALH_VERSION" --tag "$ALH_TAG" --source-sha "$ALH_SOURCE_SHA" \
  --public-key-env TAURI_UPDATER_PUBLIC_KEY
```

기대·증거: 세 installer 각각의 실제 크기·SHA-256·`.sig`·target과 complete inventory가 같다.
서명 검증기는 실제 bytes의 Minisign을 확인하지만 기존 inventory와의 field 비교는 대신하지
않는다. sourceSha는 입력 provenance이며 서명 자체가 source commit을 증명하지는 않는다.
공개키 fingerprint는 [정책](DESKTOP_RELEASE.md#production-updater-key와-secret-책임)과 대조한다.
Windows Authenticode 여부·경고 정책은 updater 서명과 별도로 확인한다.

게시 파일을 Windows NSIS/MSI 각각과 Linux AppImage에서 설치·실행하고 version, 대표 문서
열기·저장·재열기, updater 지원 형식/production 설정을 확인한다. 수동 패키지도 공개 대상이면
해당 bytes의 설치 기본 확인이 필요하다. 추가 GUI·인쇄·thumbnail은 승인된 영향표를 적용한다.

**중단/재개:** 미통과 파일은 게시하지 않는다. 현재 `publish_release=true`는 Gate 2 파일을
승격하지 않고 새로 빌드한다. 동일 bytes의 설치 확인을 게시 전에 기다리는 gate도 보장하지 않는다.
이 요구를 만족하는 운영 게시 경로나 별도 구현이 승인되지 않았다면 여기서 멈춘다.
환경 reviewer가 있다는 이유로 'build 뒤 수동 승인에서 반드시 멈춘다'고 가정하지 않는다.

## Gate 4 — GitHub Release 게시와 원격 파일 재검증

선행: Gate 3 동일 bytes 검증·게시 경로 해결, exact 후보/채널/asset 목록·사용자 notes에 대한
owner의 명시적 공개 승인. 문서 PR merge나 비게시 서명 승인은 공개 승인이 아니다.

현재 구현 경로는 Gate 2 updater dispatch의 `publish_release`를 `true`로 바꾸는 것이다.
그 경우 **새 build**를 검증해야 한다. 위 선행 조건을 충족하지 못하면 dispatch하지 않는다.
publish job은 `release` 환경/`contents: write`로 같은 run의 installer 3개, `.sig` 3개,
`alhangeul-updater-release-inventory.json` 1개를 `gh release create --target`으로 게시한다.
기존 tag는 exact source여야 하며 없으면 생성한다. draft/prerelease 옵션·기존 run 승격·
DEB/RPM/arm64 게시 옵션은 없다. 수동 패키지 게시가 승인됐다면 별도 확정 경로로만 처리한다.

조회·로컬 저장 — 게시 응답만 믿지 않고 exact tag를 다시 읽고 파일을 새 폴더에 받는다:

```bash
gh release view "$ALH_TAG" -R "$ALH_REPO" \
  --json url,tagName,targetCommitish,isDraft,isPrerelease,publishedAt,assets,body
git ls-remote --tags origin "refs/tags/$ALH_TAG" "refs/tags/$ALH_TAG^{}"
ALH_PUBLIC_DIR=$(mktemp -d)
gh release download "$ALH_TAG" -R "$ALH_REPO" -D "$ALH_PUBLIC_DIR"
```

기대·증거: stable non-draft/non-prerelease, 승인된 notes, tag의 resolved commit 일치.
annotated tag는 peeled `^{}`를 사용한다. `targetCommitish` 문자열만으로 source를 판정하지 않는다.
asset 이름·개수·URL·크기·hash·서명과 게시 run을 대조한다. 승인된 추가 수동 asset이 있으면
7개 updater asset과 구분해 기록한다. 다운로드는 exact tag URL을 쓰고 기존 파일을 덮어쓰지 않는다.

Gate 3 updater 검사에서 root를 `ALH_PUBLIC_DIR`로 바꿔 **원격에서 받은 bytes**의 서명을
재검증한다. inventory 파일이 함께 있어도 이 CLI는 그것을 자동 비교하지 않는다. 각 installer의
SHA-256은 `sha256sum`(Linux) 또는 `shasum -a 256`(검사 호스트), 크기는 `wc -c`로 확인한다.
complete inventory의 sourceSha/version/tag/keyFingerprint와 target별 kind/파일 basename/
URL/size/sha256/signature를 게시 전 근거·원격 bytes·`.sig`와 대조한다. archive 내부 상대 path와
Release의 평면 파일명을 구분한다. inventory 자체 hash와 Release asset ID도 기록한다.
`check:updater-acceptance-release`는 시험 prerelease 전용이므로 여기에 사용하지 않는다.
**중단/재개:** 누락·불일치면 Pages로 노출하지 않고 [복구 표](#실패와-재개)를 따른다.

## Gate 5 — release data PR과 Pages 배포

입력: Gate 4 통과한 공개 metadata·inventory, 별도 Pages/manifest 게시 승인.
승인된 작업에서 [site/release.json](../../site/release.json)을 변경하고 `devel` 대상 PR로 검토한다.

| 필드 | 공개값과 검토 기준 |
|---|---|
| status/channel/version/tag | `published`/`stable`/승인 X.Y.Z/일치하는 vX.Y.Z |
| publishedAt/notes | 실제 UTC 공개 시각/비어 있지 않은 4000자 이하 사용자 요약 |
| downloads | NSIS·MSI·AppImage 세 target의 고정 tag HTTPS URL; 수동 패키지 key 추가 금지 |
| updater | 고정 production endpoint, 활성화 승인 시 `manifestPublished=true`와 검증 inventory |

다운로드만 먼저 게시하기로 승인했다면 manifest는 false/inventory null이다. 처음에는
unreleased/null 상태를 유지한다. `published`로 바꾸려면 세 다운로드 URL 모두 있어야 한다.
기존 manifest를 제거하는 변경은 단순 UI 변경이 아니므로 별도 복구 승인이 필요하다.

로컬 생성·검사 — 승인된 Pages checkout에서:

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/updater-release.test.mjs tests/pages.test.mjs tests/actions-workflows.test.mjs
```

기대·증거: release data/complete inventory/manifest 계약과 Pages 검사 성공. 이 검사는
원격 파일을 내려받지 않으므로 Gate 4를 대체하지 않는다. PR diff·merge 후 Pages SHA를 기록한다.
원격 실행·공개 — merge된 exact `devel` SHA를 `ALH_PAGES_SHA`로 승인받은 뒤:

```bash
: "${ALH_PAGES_SHA:?승인한 Pages exact SHA}"
git ls-remote origin refs/heads/devel
gh workflow run pages.yml -R "$ALH_REPO" --ref devel -f deploy_ref="$ALH_PAGES_SHA"
```

remote devel과 승인 SHA 일치를 확인한 다음에만 dispatch한다. Pages는
workflow SHA = deploy_ref = checkout SHA를 강제하며 `github-pages` 환경을 사용한다.
run ID·Pages SHA·upload/deploy 결과를 기록한다. 앱 source와 Pages SHA는 같을 필요가 없다.
**중단/재개:** ref 이동·검사·배포 실패면 Release는 다시 만들지 않고 Pages 입력부터 재확인한다.

## Gate 6 — 공개 화면과 production 설치본 확인

입력: 성공한 Pages run, 공개 Release, 실제 MSI/NSIS/AppImage 설치본, 선택 시 이전 버전.
조회·로컬 저장 — manifest 활성화 승인·게시 후:

```bash
ALH_READBACK_DIR=$(mktemp -d)
curl --fail --location --show-error \
  https://postmelee.github.io/alhangeul-tauri/updater/stable.json \
  --output "$ALH_READBACK_DIR/stable.json"
cmp _site/updater/stable.json "$ALH_READBACK_DIR/stable.json"
```

`_site`는 Gate 5의 exact Pages SHA에서 만든 output이어야 한다. 기대·증거는 HTTP 성공과
version/pub_date/notes/세 target의 URL·signature 일치다. manifest false라면 이 명령 대신
manifest 미게시 상태를 확인한다. HTTP 200만으로 installer 서명 검증을 통과시켜서는 안 된다.
공개 홈·`/updates/`·`/feedback/`를 열고 다운로드 버튼/드롭다운이 승인한 파일로 연결되는지
확인한다. release notes·수동 안내·모바일 줄바꿈도 Pages 변경 영향 안에서 확인한다.

첫 공개: 앱 version·production key/endpoint·같은 version의 '업데이트 없음'을 확인한다.
MSI/NSIS는 서로 격리한 설치본, AppImage는 실제 실행 경로와 파일/부모 디렉터리의 실효 쓰기
자격을 갖춘 기준선을 다음 릴리즈까지 보존한다. 보존 위치의 개인 경로·문서는 공개하지 않는다.
다음 공개: 각 **동일 설치 형식**에서 실제 N → N+1 확인·다운로드·서명 검증·동의·설치·재실행·
version을 기록한다. dirty 문서 보호를 유지하고 NSIS↔MSI 교차 설치로 대체하지 않는다.
DEB/RPM/arm64는 수동 안내 대상이다. 시험 endpoint 성공·같은 version 확인·실제 production
upgrade를 각각 표기한다. 공개 후에만 가능한 결과를 공개 전 완료로 적지 않는다.
**중단/재개:** production 확인 실패는 원인을 기록하고 아래 복구 판단을 받는다.

## Gate 7 — 기록과 다음 릴리즈 인계

입력: 모든 gate의 실제 결과·승인·URL·SHA·파일 provenance. 버전 기록과
[인덱스](../releases/README.md)를 갱신하고 `git diff --check` 및 링크를 확인한다.
Release·Pages·manifest·실제 updater 상태를 분리한다. 장기 근거는 run URL뿐 아니라
inventory·hash·검사 환경·미실행 한계로 남긴다. 임시 archive 만료를 공개 파일 보존으로 착각하지 않는다.
owner가 결과를 확인한 뒤 해당 작업의 보고·PR·merge 후 정리를 수행한다. 문제·미실행 항목은
담당 Issue와 다음 version으로 인계하며 임의 close하지 않는다. 새 upstream 반영은 별도 Task다.
첫 공개 후 보존 설치본 → 별도 upstream 갱신 → 다음 공개 → 실제 updater 검증으로 연결한다.

## 실패와 재개

| 실패 시점 | 보존·중단 | 승인 후 재개 |
|---|---|---|
| 후보 build·서명·inventory·설치 | 실패 입력·run·비밀 없는 오류; 게시 금지 | 원인 변화 확인 후 Gate 1~3의 영향 부분만 |
| Release 게시 요청 결과 불명확 | exact tag/Release/asset 먼저 조회; 중복 생성 금지 | 미게시라면 원인 해결, 일부 게시면 owner 복구 판단 |
| Release 성공, Pages 전/배포 실패 | Release/tag 유지, 기존 stable feed 또는 첫 unreleased 상태 유지 | Gate 5; 실제 공개 상태 확인 후 Pages만 재개 |
| manifest 게시 후 결함 | 새 유입·이미 업데이트한 사용자 영향 분리, 추가 게시 중단 | 이전 검증 feed/안내 복구 또는 더 높은 fixed version 승인 |

원인·입력·외부 상태가 그대로인데 CI만 반복하지 않는다. 잘못된 asset은 덮어쓰거나 tag를 이동해
고치지 않는다. feed 복구는 이미 업데이트된 앱의 자동 downgrade가 아니다. key 노출·유실은
[키 책임 정책](DESKTOP_RELEASE.md#production-updater-key와-secret-책임)으로 별도 처리한다.
