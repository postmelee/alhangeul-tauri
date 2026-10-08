# Task #113 Stage 3.1 — exact 후보 수용 입력·실패 진단 harness 정렬

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 승인된 Stage 3 안의 수용 harness 보정 3.1
상태: 로컬 harness 검증 완료 · Stage 3 전체 검증 진행 / CanvasKit 실패 분석 중
확인일: 2026-10-08 (Asia/Seoul)

## 단계 목적

고정한 product `ff48d15011e53169bfd97b13a4f7084c3284c289`의 기존 Windows/Linux 산출물을
현재 수용 harness로 검사한다. 승인한 ordinary desktop producer를 받지 못하던 unsigned
입력과 실제 글꼴 반복 시나리오 연결, CanvasKit 실패 진단의 관측 부족을 보완한다.
제품 source와 검사 source를 분리하고 identity·파일·서명·실패 gate는 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/ci/release-candidate-input.mjs` | RPM/arm64의 명시 producer allowlist에 desktop.yml 포함; signed는 desktop만 허용 |
| `tests/ci-release-candidate-input.test.mjs` | unsigned identity 보존 2건·signed ci.yml 거부 3건 |
| `tests/gui/wdio.release-files.conf.ts` | 새 candidate의 NSIS/MSI/AppImage에 기존 글꼴 off/on·반복 열기·입력·scroll spec 연결 |
| `tests/gui/specs/local-fonts.e2e.ts` | 실패 시 renderer RPC·canvas 크기/zoom marker·window handles 기록 |
| 기존 계획·오늘할일·`docs/releases/v0.1.2.md` | 승인된 입력, 실제 run·부분 결과·참고 PR·비게시 gate 기록 |

## 본문 변경 정도 / 본문 무손실 여부

unsigned workflow 선택만 기존 ci.yml + 승인한 alhangeul-desktop.yml로 정렬했다.
source/run/ID/digest/path/hash·version/tag·platform/kind·producer 전체 success 및 signed 경계는
유지한다. GUI assertion·renderer 선택·fixture·timeout·cleanup·upload 실패 판정은 바꾸지 않았다.
기존 v0.1.0 A/B performance 비교는 유지하고 이번에는 새 candidate 하나의 기능을 확인한다.
실패 진단은 추가 관측이다. product/native/third_party/WASM·lock bytes는 FF와 동일하다.
기존 v0.1.1 기록과 공개 site/release.json·stable manifest는 유지한다.

## 검증 결과

실행 명령:

```bash
pnpm run typecheck:gui
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:action-pins
git diff --check
```

- GUI typecheck 통과.
- automation **1,326/1,326**, fail/cancelled/skipped 0.
- product boundary **817 files** 통과.
- action pins **29 files / 165 references / 11 pins** 통과. workflow 외부 참조 변경 없음.
- `git diff --check` 통과.
- ordinary [37719733676](https://github.com/postmelee/alhangeul-tauri/actions/runs/37719733676),
  attempt 1, workflow/product FF, all/full/run_tests=true 전체 success. 선택 job 14개 success.
  native Rust는 Windows 258·Linux x64/arm64 각 247 tests, fail/ignored 0이다.
- Linux x64/arm64 archive digest와 실제 배포 inventory의 exact ZIP path·size·hash 통과.
  로컬 대소문자 디렉터리 병합은 원본 ZIP 검사로 분리했고 producer inventory를 수정하지 않았다.
  기존 verifier의 AppDir 중간물 제외 계약을 따른다. Linux 소비자의 strict 추출 검증도 유지한다.
- Linux full GUI [37723131983](https://github.com/postmelee/alhangeul-tauri/actions/runs/37723131983)
  success. 별도 local-fonts [37723134560](https://github.com/postmelee/alhangeul-tauri/actions/runs/37723134560)
  failure는 다음 잔여 위험에 유지한다. 이 보고서는 Stage 3 전체 완료 보고가 아니다.

## 잔여 위험

- Canvas2D의 설정·삭제/복구·새 창·재시작은 통과했다. CanvasKit 초기 HWP/HWPX off/on·
  재감지·새 창은 통과했으나 글꼴 삭제 뒤 재감지에서 빈 페이지와 canvas timeout이 관측됐다.
  failure archive `11527350926`, digest
  `sha256:862df7ea7c1b8c0bbe443bbbebecc5fa9ba7e65786d08024d084486c5eaa8c1a`.
  제품 원인이 확정되지 않아 product source를 수정하지 않고 추가 진단을 실행한다.
- Windows NSIS는 raw exit 1·12 실패와 thumbnail not-accepted를 유지한다. 기존 diagnostic
  계약만 통과했다. MSI strict는 raw exit 0·0 실패다. 강제 MSI 3010은 reboot-required이며
  post-reboot-unverified다. 세 archive의 원시 summary/process/step/evaluation을 보존했다.
- 비게시 서명과 Windows PDF는 진행·대기다. 6종 실제 설치·글꼴·출력·RPM/Fedora·arm64 수용,
  3 updater signature/inventory와 draft notes JSON/생성물 완성은 Stage 3에서 계속한다.
- 정기 upstream workflow는 active이며 가장 최근 schedule은 기존 #115를 발견해 success다.
  오늘 예약 실행과 새 post-commit publisher의 미래 Stable 생성은 아직 실제 관측 근거가 없다.

## 다음 단계 영향

- 이 commit의 harness SHA와 product FF를 구분해 fast와 local-fonts 진단을 실행한다.
  같은 exact ordinary archive를 사용하고 crypto/provenance·GUI 실패 gate는 유지한다.
- 이미 dispatch한 signing `37719736557`과 Windows PDF `37724319402`는 workflow/product FF다.
  원래 입력·snapshot을 유지하며 같은 desktop ref의 pending 실행을 추가로 교체하지 않는다.
- 실제 signature·6종 파일 metadata가 확인된 뒤 기존 `task_m010_113.json`을 채운다.
  product 변경이 필요하면 원인·구체적 diff·새 exact source 검증 입력을 먼저 검토한다.

## 승인 기록과 진행 경계

같은 스레드의 Stage 3 “진행해줘”가 FF의 full·비게시 signing·설치/GUI와 최소 acceptance
harness 보정을 승인했다. 현재 승인 범위의 진단·나머지 수용을 계속한다. Stage 3 전체가
수용되기 전 Stage 4로 진행하지 않으며 main/Release/tag/Pages/feed 공개 gate는 이후 결과로 받는다.
