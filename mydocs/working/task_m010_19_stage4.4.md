# Task #19 Stage 4.4 완료 보고서 — 최신 devel과 PDF snapshot 통합

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)
Stage: 4.4

## 단계 목적

승인된 재개 계획에 따라 PR #56까지 병합된 devel
`c93ac8c58a796a45227f764f37b7aaffaa81899e`를 기존 #19 이력에 통합한다.
기존 snapshot·job 회수 구현은 재작성하지 않고 최신 제품 계약과 결합한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| desktop-persistence.ts 및 test | 최신 source export·암호 보호와 snapshot PDF 경로 병합; source export 취소 test와 PDF snapshot fixture 모두 보존 |
| desktop-host.test.ts | 최신 export artifact 타입과 PDF dedupe/source session 불변 test 병합 |
| native lib.rs | 폐기된 desktop_platform import는 복구하지 않고 현재 print·updater 초기화와 PDF reaper를 함께 보존 |
| desktop workflow 및 actions-workflows.test.mjs | 최신 devel 그대로 채택; 이미 존재하는 Rust test/Clippy에 구형 native_checks 분기를 중복 추가하지 않음 |
| rhwp-baseline.test.mjs | 최신 pin·source exporter 보호 검사와 immutable snapshot/live SVG 미사용 계약 결합 |
| 오늘할일 20260824·20260906 | 병렬 작업 이력과 이번 재개 행 모두 보존 |
| 구현계획서 및 본 보고서 | Stage 4.4 승인 범위·통합 결과·미완료 native 수용 기록 |

모의 병합의 8개 충돌 외에 재개 커밋의 20260906 보드 add/add 충돌이 추가되어
총 9개 경로를 해소했다. 자동 병합된 commands·state·host는 PDF request DTO,
Arc job registry, active format 전달만 devel 대비 추가됨을 확인했다.

## 본문 변경 정도 / 본문 무손실 여부

기존 #19 Stage 1~4.3 커밋과 보고서를 보존하는 merge이며 rebase·force push를 하지 않았다.
공식 문서의 기존 #19 PDF snapshot/수용 문구는 최신 아키텍처·릴리즈 문서에 병합했다.
workflow 전체, workflow test, rhwp pin·submodule·vendor, pnpm lock과 site는 devel과 동일하다.
기존 대형 파일의 통합은 계획의 보존 예외이며 이번 단계에서 무관한 구조 변경을 하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/pdf-export-snapshot.test.ts src/core/desktop-persistence.test.ts src/core/desktop-host.test.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:automation
pnpm run build:studio
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check
actionlint .github/workflows/alhangeul-desktop.yml .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

- OK — Studio 명령은 package script의 인자 전달 때문에 focused 파일만이 아니라
  전체 suite를 실행했다. 25 files, 147/147 통과하여 전체 test:studio를 중복 실행하지 않았다.
- OK — upstream 36/36, automation 501/501, skip 0.
- OK — 제품 경계 위반 0건(로컬 관측 407 files); rhwp v0.8.4 pin 검증 포함.
- OK — TypeScript/Studio build 231 modules; Rust formatting과 두 workflow actionlint 통과.
- INFO — build의 CanvasKit fs/path externalization, 혼합 dynamic import, chunk 크기 경고는 남았다.
  빌드는 성공했으며 이번 PDF 통합 범위에서 bundler 구조는 변경하지 않았다.
- OK — devel 대비 workflow·pin·vendor·lock·site 불변 검사, 충돌 marker 및 diff 검사.
- 미실행 — Mac host에서 Rust desktop test/Clippy·Tauri build·GUI 실행은 하지 않았다.
  원격 workflow, installer 재생성, 서명·배포도 실행하지 않았다.

## 잔여 위험

- 새 통합 후보의 Windows/Linux native test·Clippy·앱 build 및 실제 PDF 수용은 아직 필요하다.
- 과거 #19 또는 #9 CI 성공은 이 통합 후보의 native 성공을 의미하지 않는다.
- HWP/HWPX 실제 출력·searchable text, live edit 격리, atomic replace, reload/TTL/startup
  cleanup의 OS별 수용 증거가 없으면 #19 완료나 실제 릴리즈로 넘어가지 않는다.

## 다음 단계 영향

- 승인 후 이 merge commit을 publish/task19에 non-force push하여 exact candidate로 사용한다.
- 기존 desktop workflow가 포함하는 gate와 CI 중복을 확인하고 필요한 Windows/Linux
  native·artifact 검증을 실행한다. Linux GUI는 같은 SHA의 artifact를 사용한다.
- Windows #19 고유 수용은 별도 실제 실행 증거를 확보하고 자동 test 결과와 구분한다.
- 릴리즈·production updater 검증은 #19 병합 후 별도 릴리즈 작업으로 유지한다.

## 승인 요청

- Stage 4.4 결과를 승인하면 Windows/Linux 최종 후보 수용 단계로 진행한다.
