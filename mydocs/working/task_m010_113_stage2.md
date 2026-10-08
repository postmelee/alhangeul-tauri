# Task #113 Stage 2 — 제품 0.1.2·제목/locale·미게시 사용자 문구

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 2 (source·로컬 검증 완료, 원격 exact fast 결과는 후속 기록)

## 단계 목적

승인된 rhwp v0.8.7의 나머지 제품 호환성·버전·릴리즈 안내를 준비한다. 2026-10-08
“진행해줘”가 Stage 2를 승인했고 “기존 규격 유지·JSON 완성 이연 (권장)” 선택은 실제 파일·서명
검증 후 notes JSON·생성물 완성의 순서 조정을 승인했다. 새 공개를 성공으로 표현하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| root/desktop `package.json`, desktop Tauri/Cargo manifest·lock | 제품 version 표면 5개 0.1.2, lock은 제품 version 한 줄만 변경 |
| `apps/studio-host/product-shell-entry.ts` | exact main의 title import·initI18n만 연결, 28 LOC |
| `src/ui/product-shell.ts` | native DesktopHost 제목 소유권 유지·browser 제목·ko/en 접근성 이름, 29 LOC |
| `vite.config.ts`, `vitest.config.ts` | 같은 product shell entry plugin 등록, alias 12개 유지 |
| `product-shell*.test.ts`, `desktop-host.test.ts`, `upstream-boundary.test.ts` | 실제 title/locale·native dirty/save·drift·prod/test 연결 계약 |
| `tests/release-metadata.test.mjs` | current version 기대값 두 곳 0.1.2, negative·readonly·key/endpoint 그대로 |
| 기존 `docs/architecture/UPSTREAM.md`, `LOCAL_FONTS.md` | 상대 font 소비자 5개·renderer/catalog·title/locale 설명 최소 정렬 |
| `docs/releases/v0.1.2.md`, `docs/releases/README.md` | 미게시 사용자 문구·PR 분류·한계·후속 exact file/공개 gate, 신규 기록 131 LOC |
| `mydocs/plans/task_m010_113*.md`, `mydocs/orders/20261008.md` | 승인·JSON 이연·실제 결과·다음 gate |

## 본문 변경 정도 / 본문 무손실 여부

upstream 본문·gitlink·rhwp lock·WASM 6개 bytes와 pnpm lock을 바꾸지 않았다. title/locale의 두
entry 연결을 역치환하면 exact pinned main 전체와 byte 단위로 일치한다. native dirty title은
DesktopHost가 유지하고 upstream menu·i18n catalog·renderer를 복제하지 않는다.

제품 PDF는 직접 registry svg2pdf 0.13 `to_chunk`를 계속 사용하며 pre-sync devel의 dependency
lock block과 같다. upstream의 새 vendored patch가 제품 native PDF에 자동 적용됐다고
주장하지 않는다. native 출력 실제 수용은 Stage 3다.

기존 공개 v0.1.1 notes/site/feed·이전 릴리즈 기록·known limitation을 보존했다. 준비 문구는
upstream 공식 release의 Windows/Linux 제품 관련 변화와 앱 변화만 구분한다. 기존 v0.1.1
성능 수치를 새 pin 측정으로 복사하거나 OPEN #113을 해결 이슈로 표시하지 않는다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/ui/product-shell.test.ts src/core/product-shell-entry.test.ts src/core/desktop-host.test.ts src/command/direct-print.test.ts
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run check:committed-rhwp
pnpm run check:action-pins
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run check:release-notes
pnpm run test:release-notes
pnpm run typecheck:gui
pnpm run build:pages
pnpm run check:pages
git diff --check
```

- focused **32/32**, automation **1,321/1,321**, upstream **39/39**, Studio **43 files·281/281**,
  release-notes **124/124** 통과, fail/skip 0.
- frozen pnpm·boundary(795 files)·제품 version 5개·release metadata·exact v0.8.7 pin/6 artifact·
  committed pin·Action pins(29 files/165 refs/11 pins) 통과. key/endpoint·지원 OS 정책 그대로다.
- 실제 upstream initI18n의 ko/en 결과·반복 초기화에서 제품 접근성 label 유지, idle/open/rename/reset
  browser title와 display-mode 이벤트, Tauri callback/dirty title 보존을 확인했다.
  기존 DesktopHost open·dirty/save와 print title 회귀도 전체 Studio에서 통과했다.
- TypeScript/Vite build와 GUI typecheck 성공. 기존 browser externalization·dynamic import·chunk
  경고는 유지하며 build 오류는 없다. macOS에서 Rust/Tauri/wasm-pack을 실행하지 않았다.
- 최초 automation은 현재 version 기대값 두 곳의 0.1.1 때문에 **1,319/1,321**로 실패했다.
  `tests/release-metadata.test.mjs:31,98`의 literal만 승인한 제품 0.1.2로 정렬하고 전체를 재검증했다.
  mutation rejection·fingerprint·endpoint·readonly assertion은 완화하지 않았다.
- 기존 notes 원문 **1문서** drift 검사·generation/escaping/metadata 계약을 통과했다.
  새 v0.1.2 notes JSON·body/HTML/short notes 생성은 승인대로 실제 file/signature 수용 뒤에 한다.
- Pages source **18**/output **22** build/check 성공. generated `release.json`은 source와 같고
  `updater/stable.json`도 version **0.1.1**이다. v0.1.2 다운로드·feed·웹 안내를 게시하지 않았다.
- 성공 출력은 `/private/tmp/task113-stage2-{install,focused,automation,upstream,studio,build,release-notes,gui-typecheck,pages}.log`에 보존했다.
- 승인된 원격 명령은 source/report commit을 non-force push한 뒤
  `gh workflow run ci.yml --ref publish/task113 -f scope=full -f profile=fast` 한 번이다.
  실제 head/checkout SHA·Linux Node/Studio·Windows PS 결과를 확인한 뒤 전체 Stage 2 수용을 기록한다.

## 잔여 위험

- 이 커밋의 원격 Windows/Linux fast는 아직 실행 전이다. 이전 PR 성공을 새 source의 성공으로
  승계하지 않고 실제 결과를 후속 기록한다. fast는 full/native/package/GUI 수용이 아니다.
- 제품은 source 0.1.2이고 공개 설치본은0.1.1이다. 새 6종 files·PDF/인쇄·글꼴·문서·thumbnail
  실제 GUI, 비게시 signing·공개·production upgrade는 후속 gate다.
- notes JSON metadata·생성 bytes는 이연 승인 상태다. final main source·새 package bytes가
  확정되면 정렬·서명/hash·body 재검토가 필요하다. validator를 완화하거나 가상 값으로 채우지 않는다.
- 정기 upstream sync의 새 YAML 순서는 devel에만 있고 daily main 적용은 후속 main 승격 때다.
  다른 Stable target의 새 writer full positive run 미실행 한계는 유지한다.
- task upstream sparse cache/cdb7 alternate는 다음 작업에서 필요하므로 정리하지 않는다.

## 다음 단계 영향

- 원격 exact fast 성공 후 Stage 3 진입 승인 요청을 한다. Task final/devel PR은 Stage 4 순서다.
- 고정된 Stage 2 source/workflow를 기준으로 Windows x64·Linux x64/arm64의
  `alhangeul-desktop.yml mode=artifact/artifact_platform=all/validation_profile=full/run_tests=true/publish_release=false`
  producer와 같은 source의 nonpublishing updater candidate를 준비한다.
- 6종 새 bytes의 exact inventory·서명·기능·설치 수용 뒤 notes JSON과 생성물 완성을 이어간다.
  final main·서명 입력·게시 files/notes·Release/Pages/production upgrade 승인은 각각 유지한다.

## 승인 요청

- Stage 2 source·검증과 notes 완성 이연은 승인 범위다. 원격 fast 결과를 확인하기 전 다음 Stage로 진입하지 않는다.
- 실제 결과를 보고한 뒤 Stage 3의 Windows/Linux native·6종 패키지·기능 수용 진입을 요청한다.
