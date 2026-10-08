# Task #113 Stage 3.5 — 남은 패키지 검사 harness 최소 보정

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 승인된 Stage3 안의 로컬 harness 하위 범위3.5
상태: 로컬 harness 검증 완료 / 실제 RPM·ARM64·Fedora VM 수용 및 Stage3 전체 진행
확인일: 2026-10-08 (Asia/Seoul)

## 단계 목적

product `f79dbeadf56c0cdb6bdf576103f420591cecdc6b`의 남은 실제 파일 검사를 가능하게 한다.
기존 실패 결과를 보존하고 source·bytes 수용을 새 harness 결과와 구분한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-release-linux-files.yml` | 실제 Fedora44 Linux/amd64 immutable image |
| `tests/gui/wdio.release-files.conf.ts` | signed x64 3종에만 기존 font interaction spec 선택 |
| `tests/ci-release-files-config.test.mjs` | 실제 config import3회귀: signed/기타/production·baseline |
| `tests/gui/specs/release-files.e2e.ts` | 기존 owned app exit fence를 Fedora에도 적용 |
| `scripts/ci/release-fedora-vm.sh` | allowlisted VM payload에 기존 process probe 추가 |
| `scripts/ci/release-fedora-vm-session.sh` | Fedora scope 표시·probe 존재 확인 |
| `tests/ci-release-fedora-vm.test.mjs` | probe/fence 연결·강제 kill 없음 계약 |
| 기존 계획·notes 안내·오늘할일 | 실제 성공/실패 결과와 새 검사 입력 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·native·WASM·upstream pin·lock·installer·candidate·JSON notes는 변경하지 않았다.
기존 timeout·retry0·document/restart assertion·font spec 내부 x64 guard는 보존했다.
기존 UID/고유 owned driver/app/PID start-time 기반 종료 확인만 Fedora에도 적용한다.
강제 종료나 assertion skip, 실패의 성공 치환은 없다. 기존 문서의 과거 기록은 보존했다.

## 검증 결과

```bash
pnpm run test:automation
pnpm run typecheck:gui
bash -n scripts/ci/release-fedora-vm.sh scripts/ci/release-fedora-vm-session.sh
pnpm run check:action-pins
pnpm run check:product-boundary
git diff --check
```

- automation1330/1330·fail/cancelled/skipped0, GUI typecheck·bash syntax 통과.
- action pins29 files/165 references/11 pins, product boundary819 files 통과.
- 새 Fedora pin은 [Fedora 공식 container 안내](https://fedoraproject.org/en/misc/)의 registry로 확인했다.
  2026-10-08T06:42:20.645Z, old manifest404. tag44 index
  `sha256:ba35579e107f26a4c2c000390fb3ff549f3858a9584a6b5a35f7fa51f54de309`, amd64
  `sha256:cd3513b19e87220eb6fba1aeb041cf88f9c00c3b1de213c36db7532c383f4a1c`, config
  `sha256:f938ca6f501bc4b8892197e50dad1fcd318a8fe18cb3298fa61154cba95e57f8`.
  body hash/header digest·architectureamd64/oslinux/version44 일치. host container 실행은 없다.
- [37737163861](https://github.com/postmelee/alhangeul-tauri/actions/runs/37737163861)은 전체 실패다.
  RPM image404로 install 전 중단; arm64 document1 통과 후 잘못 선택한 x64 font spec 실패다.
  실패 evidence ARM11532805803/dc4f3351..., RPM11532138097/061717ac...를 독립 download/digest 확인했다.
- [37738091057](https://github.com/postmelee/alhangeul-tauri/actions/runs/37738091057)은 전체 실패다.
  실제 Fedora44 KVM/Xfce RPM 설치·첫 두 restart 뒤 restart3 POST/session120초 timeout이다.
  evidence11532094548/3dcfb4e4...를 검증했다. 마지막 snapshot은 driver2개만 남고 app없음이다.
  process probe 누락은 진단 결함이며 timeout의 원인으로 단정하지 않는다.

## 잔여 위험

- VM exit fence의 실제 효과와 RPM/arm64 전체 acceptance는 새로운 exact harness에서 미검증이다.
- Windows NSIS hosted thumbnail/강제 MSI3010 제한·물리 print·Wayland/GPU·실제011→012는 그대로다.
- 로컬 검증 완료는 전체 Stage3 또는 공개 수용을 뜻하지 않는다.

## 다음 단계 영향

새 commit SHA는 harness이며 product P와 구분한다. fast CI와 기존 exact artifacts의 RPM/arm64·
Fedora VM을 실행한다. 새 product/build/signing bytes를 만들지 않고 기존 signature/metadata를 유지한다.
검사 결과·actual artifact ID/digest와 structured receipts를 전체 Stage3 기록에 연결한다.

## 승인 기록과 진행 경계

같은 스레드에서 승인된 Stage3 candidate/acceptance 최소 보정 범위로 기록한다.
추가 제품 보정·Stage4·최종 main signing·Release/tag/assets·Pages/feed gate는 포함하지 않는다.
