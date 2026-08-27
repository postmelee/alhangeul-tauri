# Task #24 Stage 2 보고서 — v0.8.4 adapter 호환성과 플랫폼 중립 수용

GitHub Issue: [#24](https://github.com/postmelee/alhangeul-tauri/issues/24)
구현계획서: [`task_m010_24_impl.md`](../plans/task_m010_24_impl.md)
Stage: 2

## 단계 목적

Stage 1에서 식별한 `rhwp v0.8.4` 저장 의미 변경을 Alhangeul의 기존 Tauri native host 경계와 대조한다. compile·source contract로 확인된 회귀만 얇은 leaf adapter에서 보정하고, exact upstream Studio entry와 native 원자 저장·PDF·인쇄 경계를 유지한 상태로 플랫폼 중립 gate를 통과시키는 단계다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/desktop-source-export.ts` | v0.8.4 reported HWP/HWPX exporter, 암호 serializer, 저장 전 deferred pagination flush를 native 저장용 61 LOC 경계로 통합 |
| `apps/studio-host/src/core/desktop-host.ts` | 문서 열기 뒤 `encrypted` 메타데이터를 boolean 저장 상태로 승계하고, 원자 저장 커밋·Studio clean 통지 뒤에만 content-loss 경고 표시 |
| `apps/studio-host/src/core/desktop-persistence.ts` | embed byte-only exporter 대신 주입된 reported artifact를 staging·commit하고 report·암호 보호 상태를 host에 반환 |
| `apps/studio-host/src/core/desktop-host-dependencies.ts` | upstream 문서 저장 암호 대화상자를 testable native host dependency로 연결 |
| `apps/studio-host/src/command/commands/file.ts` | native 저장 대화상자 또는 암호 입력 취소 시 기존 status 문구 복원 |
| `apps/studio-host/src/core/desktop-source-export.test.ts` | reported format 선택, 암호 보호, 취소, pagination pending, encrypted state 계약 5건 |
| `apps/studio-host/src/core/desktop-host-v084-save.test.ts` | 암호 문서 열기→암호 reported 저장→commit→손실 경고 순서 통합 계약 |
| `apps/studio-host/src/core/{desktop-host,desktop-persistence}.test.ts` | native staging·format·cleanup·Studio clean 통지 계약을 새 exporter 경계에 정렬 |
| `apps/studio-host/src/command/commands/file.test.ts` | native 저장 취소 뒤 status 복원 회귀 계약 |
| `tests/rhwp-baseline.test.mjs` | byte-only embed 저장 기대를 v0.8.4 reported·password·pagination source boundary 기대값으로 교체 |
| `mydocs/orders/20260813.md` | Task #24를 Stage 2 완료·Stage 3 승인 대기 상태로 갱신 |
| `mydocs/working/task_m010_24_stage2.md` | 구현·검증 결과, 잔여 UX 차이와 Stage 3 handoff 기록 |

## 본문 변경 정도 / 본문 무손실 여부

- `third_party/rhwp`, vendored WASM, Cargo lock과 Stage 1 candidate 문서는 수정하지 않았다. `v0.8.4` / `496333b27d21ddb9114ba9ae340bcb895870c9a7` exact pin을 그대로 사용한다.
- exact upstream entry와 12개 허용 alias는 바꾸지 않았다. 새 upstream source copy나 WasmBridge fork를 추가하지 않고 기존 `native-host` 제품 코드만 보정했다.
- 네이티브 명시 저장은 upstream이 v0.8.4에서 정의한 `exportDocumentWithReportForFormat`과 `exportPasswordProtectedDocumentWithReportForFormat`을 직접 사용한다. autosave·embed 호환용 byte-only `exportHwp/exportHwpx` 표면은 그대로 유지한다.
- 암호 문자열은 대화상자 단일 저장 시도에만 전달하고 지역 참조를 `finally`에서 비운다. 저장 상태에는 `requiresPasswordForSave` boolean만 남긴다.
- 기존 암호 문서를 열면 `DocumentInfo.encrypted`를 읽어 다음 native 저장에서 암호 재입력과 password serializer를 강제한다. 취소하면 staging만 제거하고 write·commit·clean 통지를 실행하지 않는다.
- content-loss 경고는 native commit과 upstream `notifySaved` 성공 뒤에만 표시한다. 경고 dialog 표시 자체가 실패해도 이미 성공한 저장을 실패로 오인하지 않는다.
- 제품 source는 모두 권장 300 LOC 이하(`file.ts` 126, dependencies 68, host 253, persistence 177, source exporter 61)다. 새 통합 test를 별도 파일로 분리해 기존 host test도 261 LOC로 유지했다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — frozen lockfile 설치: `Lockfile is up to date`, pnpm `10.33.0`.
- OK — product boundary: 200 files scanned; exact upstream entry, shadow copy 0개와 허용 leaf alias 경계 유지.
- OK — product version `0.1.0`, release metadata `Alhangeul 0.1.0`.
- OK — rhwp pin: `v0.8.4`, resolved commit `496333b27d21ddb9114ba9ae340bcb895870c9a7`, 관리 artifact 6개.
- OK — automation 120/120, upstream 35/35, Studio 105/105 (`23` test files).
- OK — focused native 저장 contract 26/26: reported export, 암호 보존, pagination, staging 취소·cleanup, content-loss 알림 순서와 status 복원.
- OK — production Studio build: 227 modules, `rhwp_bg` 8,038.57 kB와 전체 bundle 생성 성공.
- OK — `git diff --check` 경고 없음.
- 참고 — build의 기존 대형 chunk 및 Tauri API dynamic/static import 경고는 계속 나타났지만 빌드 실패나 새 경계 위반은 아니다.
- 미실행 — 현재 macOS host에서는 정책상 desktop Rust·Clippy·Tauri build를 실행하지 않았다. Stage 3 exact-SHA Ubuntu/Windows/Linux CI가 최종 실행 가능 commit을 다시 검증한다.

## v0.8.4 adapter 판정

- **저장 회귀 보정 필요**: upstream browser 명시 저장은 reported artifact를 사용하지만 기존 native override는 embed byte-only exporter를 호출해 content-loss 보고를 우회했다. 새 product-owned exporter 경계로 정정했다.
- **암호 보호 보정 필요**: upstream 암호 열기는 동작하지만 열린 문서의 boolean 재저장 상태를 native 저장이 관찰하지 못했다. `DocumentInfo.encrypted`를 native host가 승계하고 매 저장 시 새 암호를 받아 보호를 유지한다.
- **PDF·인쇄 경계 유지**: `getPageSvg` 기반 PDF와 hidden system print surface에는 API 변화가 없었고 기존 focused test가 통과했다. 관련 source를 수정하지 않았다.
- **toolbar·font·viewport 경계 유지**: 기존 font-policy WasmBridge leaf와 toolbar mode adapter를 수정하지 않았고 전체 Studio test/build가 통과했다. 실제 WebView 렌더 수용은 Stage 4·5 GUI에서 다시 확인한다.
- **기존 known issue 재분류**: v0.8.4 누적 changelog는 v0.8.2의 두 known issue를 다시 명시하지 않고, 현재 E2E manifest는 `issue-2214` focused GREEN을 기록한다. `print-pdf-issue3126`는 여전히 브라우저/native dialog 수동 검증을 병행하는 active 항목이므로 이 Stage에서 해결로 단정하지 않고 Stage 4·5의 PDF·system print 시나리오로 넘긴다.

## 잔여 위험

- Tauri native Save As는 OS 파일 대화상자를 소유하므로 upstream custom Save As의 선택형 `암호 설정...` accessory를 그대로 삽입할 수 없다. 이번 보정은 기존 암호 문서의 보호를 안전 기본값으로 유지하지만, 평문 문서에 새 암호를 추가하거나 Save As로 보호를 제거하는 선택형 UX는 노출하지 않는다. 공개 전 기능 범위 판단이 필요하다.
- `DocumentInfo.encrypted` 승계, 암호 대화상자, content-loss warning의 실제 WebView2/WebKitGTK 표시와 암호 파일 재열기는 아직 native GUI로 확인하지 않았다.
- v0.8.4 native 암호화 의존성과 bundle inventory는 Stage 3 CI·artifact build 전까지 최종 확정되지 않는다.
- 렌더·font·viewport의 플랫폼 중립 test/build 통과만으로 Windows/Linux 화면 정합을 보장하지 않는다.

## 다음 단계 영향

- Stage 3 canary SHA에는 이 Stage 2 커밋을 포함해야 한다. `publish/task24`를 non-force push한 뒤 CI와 native artifact workflow 모두 같은 exact SHA를 사용한다.
- Ubuntu CI에서 `test:desktop`과 `clippy:desktop`, Windows/Linux matrix에서 Tauri bundle·inventory·installer smoke를 다시 실행해야 한다.
- Stage 4·5 대표 문서 시나리오에 암호 HWP/HWPX 열기→저장→재열기와 content-loss 경고 표시를 추가해 source contract를 실제 GUI로 확인한다.
- native 실행 코드가 다시 바뀌면 Stage 3 CI·artifact를 새 exact SHA에서 재생성한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 exact-SHA CI와 native artifact 생성으로 진행한다.
