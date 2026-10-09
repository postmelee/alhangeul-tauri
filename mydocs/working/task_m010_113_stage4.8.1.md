# Task #113 Stage4.8.1 — production upgrade harness 보정

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.8.1 — 승인6파일 구현·generic 수용
상태: source/generic 완료 / 새 head required CI·actual3 원격 후속
확인일: 2026-10-09 03:57 (Asia/Seoul)

## 단계 목적

실제 production011→012 run37824197495/attempt1의 세 형식 failure를 보존하고 검증 harness의
버전 입력 누락·null 상태 응답·Windows 임시 profile 경계를 보정한다. 같은 스레드의 작업지시자
“승인할게”로 patch9a95ae52...·6파일/186diff lines·full generic/정상PR120 push·새 exact H required
및 통과 후 actual3/all 1회 재실행이 승인됐다. 승인 근거는 `2026-10-08T18:54:36.050352+00:00`다.
앱 제품 source나 공개 파일 수정이 아니며 native actual 수용은 이 보정 단계와 구분한다.

## 산출물

| source path | LOC |
|---|---:|
| `scripts/updater/production-process.mjs` | 27 |
| `scripts/updater/production-upgrade.mjs` | 91 |
| `tests/gui/production-upgrade/windows-handoff.ts` | 77 |
| `tests/gui/production-upgrade/session.ts` | 17 |
| `tests/gui/wdio.production-upgrade.conf.ts` | 21 |
| `tests/production-upgrade-v012.test.mjs` | 156 |

추적은 기존 승인 plans/working/report/orders다. stage 기록은 중앙 stage_report 템플릿을 따른다.

## 본문 변경 정도 / 본문 무손실 여부

- Linux stop 호출이 선택한 fixed JSON을 전달한다. pure restart identity 검산 helper를 거치며
 /proc/exe 소유 확인·SIGTERM·30초 종료 deadline·shutdown receipt를 유지한다.
- Windows null은 last valid snapshot을 유지해 다음 state를 관측한다. null만으로 성공하거나
 transport closure를 만들지 않는다. 실제 known closure/error와 기존 observation deadline을 요구한다.
- Windows apply/verify는 형식별 evidence parent/webview-profile을 같은 userDataFolder로 사용한다.
 pinned tauri-driver2.0.6의 옵션 전달과 Microsoft의 temporary-folder 동작을 공식 source로 확인했다.
 pinned native-types의 좁은 선언만 intersection type으로 보완하며 의존성/lock은 그대로다.
- 새012 회귀16→22는 위 migration boundary와 null-only timeout/오류 은폐 금지·PID/exe drift를 검증한다.
 기존010→011 inputs/59 tests 및 MANIFEST_HASH654e, selected012 input/hash58ca, settings equality,
 dirty/동의/문서/설치/cleanup strict gate와 명시 full/Windows test 연결을 유지한다.
- apps/crates/third_party/lock은 공개 productmain6d와 같다. Release11·body·key/endpoint/feed를 수정하지 않는다.

## 검증 결과

```bash
node --test tests/production-upgrade.test.mjs tests/production-upgrade-v012.test.mjs tests/production-upgrade-workflows.test.mjs
pnpm run test:automation
pnpm run typecheck:gui
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run check:committed-rhwp
pnpm run check:release-notes
pnpm run build:pages
pnpm run check:pages
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

- 실제 checkout에서 집중87/87(legacy59+new22+workflow6), full1353/1353·fail/skip0·GUI tsc가 통과했다.
- boundary/version/metadata/pin/committedrhwp/notes2·Pages19/23, upstream39/39·Studio283/43files,
 Studio build/types가 통과했다. 기존 Vite chunk/dynamic import warning은 유지된다.
- approved six after hashes와 immutable legacy/fixed012/public data/key/strict validator를 검산했다.
 로컬 native Rust/Tauri/wasm-pack 또는 Linux process stop은 실행하지 않았다.

## 잔여 위험

- 원래 actual run37824197495는 전체 failure이며 accepted.json3 모두 없다. AppImage apply/restart/교체bytes,
 MSI apply/installed012/handler/defaults는 부분 성공이다. NSIS null TypeError와 cleanup exe 잔존을 보존한다.
- MSI 설정 차이의 profile 원인은 새 동일 profile에서 strict equality로 확인해야 한다. NSIS cleanup 잔존
 원인도 현재 증거로 확정할 수 없어 source를 임의로 완화하지 않았다. 새 실제 정상 설치 종료/cleanup이 필요하다.
- generic 성공은 native upgrade 성공이 아니다. 기존 NSIS thumbnail·3010 post-reboot-unverified·
 Authenticode·물리환경 한계와 공개 notes의 upgrade 미검증 문구를 유지한다. #113 OPEN이다.

## 다음 단계 영향

이 source/report를 normal publish/task113 push로 기존 Open PR120에 올리고 새 H를 고정한다.
새 H의 실제 PR merge candidate tree와 Node/Windows/required3job 전체 success를 확인한 뒤 승인된
production-upgrade-check/all/build_ref=H/publish_release=false/run_tests=false를 한 번 실행한다.
공개 source96e→6d·두 Release/11assets·태그·manifest58ca·서명/key/endpoint를 재확인하며 같은 public
bytes를 쓴다. version/settings/HWP/HWPX/restart/설치/association·cleanup/policy restore/accepted.json3
및 전체 job 결과를 수용해야 Stage4.8을 완료할 수 있다. 원래 실패 attempt를 소급 성공으로 쓰지 않는다.

## 승인 요청

보정 source·PR 갱신/새 required·actual3/all 재실행은 이미 승인됐다. PR merge·공개 result 문구/Release
body·새 exact Pages 배포·Issue113 close/cleanup은 결과 확인 뒤 후속 승인으로 제시한다.
