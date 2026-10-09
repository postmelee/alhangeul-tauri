# Task #113 Stage4.8.2 — AppImage 재시작 응답 관측 보정

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.8.2 — 승인3파일 구현·generic 수용
상태: source/generic 완료 / 새 head required CI·Linux actual 후속
확인일: 2026-10-09 04:23 (Asia/Seoul)

## 단계 목적

actual run37828940744의 Windows NSIS/MSI 전체 수용과 Linux 재시작 응답 failure를 보존하고
Linux의 visible restart 클릭 뒤 필수 native process 관측을 끝까지 수행하도록 보정한다.
작업지시자 “진행해줘.”로 patche3e72ebd...·3파일/110diff lines·generic/PR120 normal push/새required·
통과 뒤 Linux-only1회와 Windows2 경로 불변 근거의 증거 보존/조건부 whole3 기록을 승인받았다.
승인 근거 시각은 `2026-10-08T19:21:48.426401+00:00`다. 앱 제품 source·공개 bytes를 바꾸지 않는다.

## 산출물

| source path | LOC |
|---|---:|
| `tests/gui/production-upgrade/restart-observation.ts` | 23 |
| `tests/gui/production-upgrade/apply.ts` | 88 |
| `tests/production-upgrade-v012.test.mjs` | 199 |

기존 승인 plans/working/report/orders에서 추적하며 중앙 stage_report 형식을 따른다.

## 본문 변경 정도 / 본문 무손실 여부

- installed restartRequired·old realPID/FUSE exe·durable restart-request.json 뒤 visible UI click을
 helper에 전달한다. 기존 known closure 또는 관측한 exact execute/async POST unknown error만
 provisional로 기록하고 실제 waitForAppImageRestart(previous)를 반드시 호출한다.
- 응답 오류만으로 성공하지 않는다. 기존 restart.ts의 Linux-only probe·단일 실제 제품/FUSE mount·
 서로 다른 PID/exe·120초 deadline은 byte 그대로다. unrelated unknown command/timeout/권한 오류는 실패다.
- tests012는22→29(+7)이며 native wait 필수/timeout 실패·오류 분류·정상 관측을 검증한다.
 legacy59/input/hash·fixed012/source96e→6d/manifest58ca·strict evidence/CI 명시 연결은 보존한다.
- Windows apply 함수/분기·workflow/handoff/profile/verify/native/inputs/config/e2e·strict validators/
 dependency lock15개 파일 hash와 Windows 함수 hash를 bc082d00에 대조했다. new leaf는 top-level
 native 실행이 없고 Windows 경로에서 호출되지 않는다. 완료된 Windows2 consumer 증거를 해당
 형식에만 재사용하고 실패한 mixed run을 success로 소급하지 않는다.

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

- 실제 checkout 집중94/94(legacy59+new29+workflow6)·full1360/1360·fail/skip0·GUI types가 통과했다.
- boundary/version/metadata/pin/committedrhwp/notes2·Pages19/23·upstream39·Studio283/43files/build/types
 통과다. approved3 after hash·Windows 경로/원래 restart probe·legacy/published data/key 불변을 검산했다.
- apps/crates/third_party/lock은 publicmain6d와 같다. 로컬 native Rust/Tauri/wasm-pack/Linux process
 probe를 실행하지 않았다. 기존 Vite chunk/dynamic import warning은 유지된다.

## 잔여 위험

- 37824197495와37828940744는 whole failure다. 후자는 Windows2 actual full/accepted.json 수용,
 Linux는 installed restartRequired 뒤 restart 클릭 응답 error로 PID/FUSE 관측/후속 gate가 미완료다.
 generic 성공은 actual Linux 수용이 아니다. 기존 source를 변화 없이 재실행하지 않는다.
- 새 Linux-only run의 public bytes/서명·UI동의/dirty·newPID/FUSE·교체hash/stop·설정·About012·
 HWP/HWPX·accepted.json·selected job/upload 전체 성공이 필요하다.
- Windows thumbnail/3010 post-reboot-unverified·Authenticode·물리환경 한계와 public notes의
 upgrade 미검증 문구를 유지한다. Issue113 OPEN이다.

## 다음 단계 영향

이 source/report의 새 H를 normal publish/task113에 push해 Open PR120 required3job 전체 성공과
merge candidate tree 동등성을 확인한다. 두 public Release/11asset/tag/source96e→6d/key/endpoint/feed58ca를
재확인한 뒤 approved production-upgrade-check/linux-x64/build_ref=H/publish_release=false/run_tests=false
한 번을 실행한다. native Windows는 bc082d00/37828940744 complete consumer2job/receipt/archive를
해당 형식 수용으로 보존한다. Linux가 모두 통과할 때 각 kind의 별도 harness/run을 명시해 whole3
수용을 기록하며 두 과거 run failure는 그대로다. 새 product 생성·서명·공개를 하지 않는다.

## 승인 요청

source3·PR 갱신/새 CI·Linux-only1회 및 조건부 whole3 결과 기록은 이미 승인됐다.
PR merge·공개 result 문구/Release body·새 exact Pages·Issue close/cleanup은 후속 승인으로 제시한다.
