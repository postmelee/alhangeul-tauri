# Task #16 Stage 5 완료 보고서

GitHub Issue: [#16](https://github.com/postmelee/alhangeul-tauri/issues/16)
구현계획서: [`task_m010_16_impl.md`](../plans/task_m010_16_impl.md)
Stage: 5

## 단계 목적

Stage 4에서 확정한 production updater key와 exact-SHA 서명 경계를 실제 Windows x64 MSI·NSIS와
Linux x64 AppImage의 test-only `99.1.0 → 99.1.1` 설치 수용으로 검증한다. dirty 문서, 중복 요청,
no-update, read-only fallback과 잘못된 형식·서명·네트워크 실패가 설치 또는 편집 손상으로 이어지지
않음을 확인한 뒤 test-only release와 tag를 정리한다. stable release와 Pages updater 활성화는
이 단계의 범위가 아니다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-desktop.yml` 외 updater acceptance workflow 7개 | exact D1/D2 handoff, Windows MSI·NSIS와 Linux AppImage positive·negative native 수용, Linux 창 분리 진단 |
| `scripts/updater/acceptance-*.mjs`, `verify-acceptance-release.mjs` | test-only N/N+1 identity, 완전한 8개 asset, negative fixture와 공개 read-back gate |
| `scripts/updater/windows-native-acceptance.ps1`, `run-linux-native-gui.sh` | 설치·제거와 플랫폼별 native 실행 경계 |
| `tests/gui/specs/updater-native.e2e.ts`, `tests/gui/updater-window.ts`, `tests/gui/wdio.updater.conf.ts` | dirty·apply·no-update·fallback·negative 상태와 편집 지속 수용 |
| `apps/desktop/src-tauri/src/window_geometry.rs`와 updater target 보정 | Linux GTK monitor 조회의 main-thread 제한과 fail-closed target 판정 보강 |
| `tests/updater-*.test.mjs`, `tests/gui/linux/window-probe*`, `tests/actions-workflows.test.mjs` | acceptance policy·workflow·Linux 창 회귀 계약 |
| `docs/architecture/UPDATER.md`, `docs/operations/DESKTOP_RELEASE.md` | runtime 보호와 test-only release 운용 경계 |
| `mydocs/plans/task_m010_16_impl.md` | D1/D2, positive·negative run과 test-only 정리 exact 증적 |
| `mydocs/working/task_m010_16_stage5.md` | Stage 5 결과·검증·잔여 위험과 다음 승인 경계 |

## 본문 변경 정도 / 본문 무손실 여부

제품의 HWP/HWPX 편집 본문 모델과 저장 형식은 변경하지 않았다. updater는 지원 target과 설치 형식을
명시적으로 대조하고, dirty 문서나 실패 상태에서는 install·exit·restart를 수행하지 않는다. Linux
다중 창 수용에서 발견한 GTK monitor 조회만 main thread로 옮겼으며 창 builder와 Windows 경로는
유지했다. stable release metadata와 Pages source는 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm run test:updater-acceptance
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:release-metadata
actionlint .github/workflows/alhangeul-desktop.yml \
  .github/workflows/alhangeul-updater-native-negative-acceptance.yml \
  .github/workflows/alhangeul-updater-native-windows.yml \
  .github/workflows/alhangeul-updater-native-linux.yml
git diff --check
```

결과:

- OK — updater acceptance 계약 23개 통과.
- OK — 전체 automation 351개 통과.
- OK — product boundary 324개 파일 통과.
- OK — release metadata `Alhangeul 0.1.0` 통과.
- OK — 관련 workflow 4개의 actionlint 통과.
- OK — positive native [run 33617676623](https://github.com/postmelee/alhangeul-tauri/actions/runs/33617676623):
  MSI·NSIS·AppImage 실제 N→N+1, dirty-before/after-download, no-update와 read-only fallback 통과.
- OK — cross-format [run 33619575159](https://github.com/postmelee/alhangeul-tauri/actions/runs/33619575159):
  세 target 모두 `invalidUpdateMetadata` 거부, 편집과 N 설치 상태 보존.
- OK — signature-mismatch [run 33620147777](https://github.com/postmelee/alhangeul-tauri/actions/runs/33620147777):
  세 target 모두 변조 서명 설치 거부, 편집과 manual retry 보존.
- OK — network-failures [run 33620606595](https://github.com/postmelee/alhangeul-tauri/actions/runs/33620606595):
  NSIS timeout과 MSI·AppImage 404를 retryable 오류로 처리하고 N version·편집 보존.
- OK — 각 negative run 전 공개 manifest의 exact SHA-256과 8개 asset을 검증했으며 run 뒤 positive
  manifest를 복원했다. 최종 복원 SHA-256은
  `55ebb86c8ea5bb21e4625b00d9cbe1d9319e4c35511fd816847acca395ab705c`다.
- OK — `updater-test-v99.0.1`, `updater-test-v99.1.1`의 release·원격 tag와 남은 로컬 test tag를
  삭제했다. 확인 결과 test release와 matching remote tag는 각각 0개다.

## 잔여 위험

- 동일 이름의 GitHub release asset을 교체하면 공개 redirect와 API metadata가 약 2분 동안 서로 다른
  세대를 가리킬 수 있다. 이번 test-only fixture는 exact digest·의미·cardinality가 수렴한 뒤에만
  실행해 통제했다. production에서는 asset 교체나 tag 이동을 허용하지 않고 더 높은 immutable
  version을 게시해야 한다.
- Actions 수용 증적은 14일 retention 대상이다. run ID와 artifact ID·digest는 구현계획서에 남겼지만
  archive 자체는 영구 보존물이 아니다.
- 이번 결과는 updater test endpoint를 내장한 x64 MSI·NSIS·AppImage에 한정한다. Linux DEB/RPM,
  arm64와 read-only AppImage는 계속 수동 설치 경로다.
- checkpoint E, stable release, `site/release.json`, Pages `updater/stable.json` 게시와 첫 공개 버전의
  실제 production read-back은 아직 승인·실행하지 않았다.

## 다음 단계 영향

- Stage 5 구현과 native 수용은 완료됐다. 다음 단계는 본 보고서 승인 뒤 Task #16 최종 보고서 작성,
  전체 변경 최종 검토와 `publish/task16` PR 준비다.
- 최종 보고·PR은 stable release나 updater 활성화를 수행하지 않는다. 실제 첫 공개 release의 immutable
  artifact와 Pages source commit을 다시 제시하고 checkpoint E를 별도로 승인받아야 한다.

## 승인 요청

- Stage 5 산출물과 검증 결과를 승인하면 Task #16 최종 보고·PR 단계로 진행한다.
