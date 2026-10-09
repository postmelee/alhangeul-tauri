# Task #113 Stage 4.7 — production011→012 harness·웹 목록 보정

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.7 — source 구현·generic 수용과 exact 원격 harness 준비
상태: source17/generic 수용 완료 / 승인한 PR·required CI·actual3 remote 후속
확인일: 2026-10-09 03:17 (Asia/Seoul)

## 단계 목적

새 공개 production feed012에 맞는011→012 고정 입력과 기존 세 형식 upgrade harness를 준비했다.
작업지시자의 “진행해줘.”는 source14 patch251ca685...·generic/기록·정상 push/Open PR/required CI와
새 exact harness의 actual NSIS/MSI/AppImage를 승인했다. 근거 `2026-10-08T18:09:26.341620+00:00`다.
추가3행은 별도 제시 후 “추가 3행 보정·전체 재검증 후 계속 진행 (권장)”으로 승인받았고
근거 `2026-10-08T18:14:10.692772+00:00`·patch0e14f2ef...다. source 구현 수용과 actual remote 수용을 구분한다.

## 산출물

| path | LOC |
|---|---:|
| `tests/gui/production-upgrade-v0.1.2-inputs.json` | 183 |
| `scripts/updater/production-contract.mjs` | 95 |
| `scripts/updater/production-evidence.mjs` | 93 |
| `scripts/updater/production-upgrade.mjs` | 91 |
| `tests/gui/production-upgrade/inputs.ts` | 30 |
| `tests/gui/production-upgrade/native.ts` | 63 |
| `tests/gui/production-upgrade/apply.ts` | 90 |
| `tests/gui/production-upgrade/verify.ts` | 37 |
| `tests/gui/production-upgrade/startup.ts` | 32 |
| `tests/gui/specs/production-upgrade.e2e.ts` | 30 |
| `.github/workflows/alhangeul-production-upgrade-windows.yml` | 140 |
| `.github/workflows/alhangeul-production-upgrade-linux.yml` | 105 |
| `site/updates/index.html` | 92 |
| `tests/production-upgrade-v012.test.mjs` | 90 |
| `tests/production-upgrade-workflows.test.mjs` | 84 |
| `package.json` | 75 |
| `.github/workflows/alhangeul-ci-fast.yml` | 83 |

기존 계획/최종 보고/오늘할일·release 기록/index를 같은 승인 위치에서 갱신한다.
원문 JSON/HTML template·Release body/11assets·Pages feed bytes는 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- 기존010→011 inputs JSON/59 tests/MANIFEST_HASH654efd7e...를 byte 그대로 보존한다. 별도
 012 inputs JSON은 n011/402604603/source96e89e90/tagb7b858e1와 next012/407055948/main6dcb05e9/
 tag198ebba7의 실제11assets identity 및 manifest58ca348b...·기존key/endpoint를 고정한다.
- CLI와 GUI는 승인한 두 relative 파일·두 source/manifest tuple만 선택한다. 증거 검산은 selected
 from/to 버전을 쓰며 handoff/dirty/consent/real signature/cleanup/association/재실행·문서 gate를 유지한다.
 source helpers의 default010→011 계약도 보존한다. workflow는012 spec과 설치011/검산012를 명시한다.
- site/updates/index.html의 local v012 항목1행은 이미 공개된 버전별 웹 안내를 연결한다. 현재
 공개 Pages1f33에는 아직 적용되지 않았고 PR merge·exact Pages 후속 승인 전에는 미배포다.
- package.json은 test:automation command1행만 바뀌며 version/dependencies/나머지 scripts/lock은 같다.
 apps/crates/rhwp/native build/sign source는 actual main6d 그대로이며 새 제품 재빌드가 아니다.

## 검증 결과

```bash
node --test tests/production-upgrade.test.mjs tests/production-upgrade-v012.test.mjs
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

- 최초 full1330/1331·1fail·skip0은 기존 workflow test의 post-install011 기대였다. 같은 실제012
 workflow를 검증하는1행을 owner 승인 뒤 보정했다. 신규16은 기존 명시 automation/Windows
 fast CI 목록에 빠져있어 두 명령1행씩 추가했다. 최초 실패 로그는 보존하고 소급 통과로 쓰지 않는다.
- actual source production75(기존59+new16), 수정 뒤 full automation1347/1347·fail/skip0,
 GUI TypeScript, product boundary·version·release metadata·pin·committed rhwp·release notes2,
 Pages source19/root2/output23을 수용했다. full automation에 updater/pages/actions151도 포함된다.
- upstream39/39·fail/skip0, Studio43test files/283tests·build/typecheck 통과다. 기존 Vite chunk/
 ineffective dynamic import warning은 같고 native Rust/Tauri/wasm-pack을 로컬에서 실행하지 않았다.
- all17 approved after hashes·legacy2file unchanged·package dependency/runtime unchanged를 검산했다.
 현재 production012/hash58ca348b...·publicRelease11/source6d는 Stage4.6 기준이며 actual upgrade는 아직 없다.

## 잔여 위험

- local generic/기존 regression/새 unit 성공은 실제011→012 성공이 아니다. 새 PR required와
 exact H의 native runner·공개 두 Release의 실제 bytes/Minisign·UI 동의/dirty·설치/재실행/
 version/settings/HWP/HWPX 및 cleanup/정상 policy 복구를 확인해야 한다.
- NSIS thumbnail·forced MSI3010 post-reboot-unverified·Authenticode·물리환경 한계는 유지한다.
 공개 notes는 아직011→012 미검증이고 웹목록 수정은 미배포다. #113 OPEN이다.

## 다음 단계 영향

이 source/보고 commit을 publish/task113에 정상 ff push해 H를 고정하고 devel non-draft Open PR을
게시한다. required CI는 실제 merge candidate의1회 전체 결과를 확인한다. 이어 이미 승인받은
alhangeul-desktop.yml --ref publish/task113/modeproduction-upgrade-check/all/build_ref=H/
publish_release=false/run_tests=false의1회로 실제Windows NSIS/MSI·Linux AppImage를 검사한다.
workflow/checkout/H·공개 source96e/6d·manifest58ca·각 bytes/서명이 고정돼야 하며 other build/sign/
publish jobs는 mode로 제외된다. failure/drift는 기록하고 새 source나 재실행에 앞서 원인을 판단한다.

## 승인 요청

현재 scope의 PR/필수CI·actual3 remote 실행은 이미 승인됐다. 결과 기록 후 PR 일반 merge·
수용 결과 문구/Release body·새 exact Pages 배포·Issueclose/cleanup만 후속 승인으로 제시한다.
