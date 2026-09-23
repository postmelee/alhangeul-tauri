# Task #19 Stage 2 완료 보고서 — native PDF job freshness와 resource limit

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 2

## 단계 목적

Stage 1의 immutable snapshot UUID를 native PDF job 전체 수명에 결합하고, 중단되거나 잘못된 job이 임시 SVG·target lock·메모리 예산을 계속 점유하지 않도록 fail-closed 회수 경계를 만든다.

Stage 2는 begin/append/commit/abort request 계약, page·byte·job 수 제한, idle/absolute TTL과 단일 reaper, 보수적인 startup orphan cleanup 및 그 focused Rust test source까지만 구현한다. Studio snapshot 연결과 Windows/Linux native 실행은 각각 Stage 3과 Stage 4 범위로 남긴다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/pdf_jobs.rs` | 290 LOC. snapshot UUID·owner·target lock·순차 page·normalized SVG 누적 byte·created/last-activity를 job에 결합하고 fail-closed append/commit/abort 및 expiry 회수를 구현 |
| `apps/desktop/src-tauri/src/pdf_jobs_tests.rs` | 248 LOC, 10 tests. UUID/owner mismatch, 역순·중복·누락, page/job/byte 경계, same-owner 교체, target 보존, idle/absolute expiry와 window cleanup test source 작성 |
| `apps/desktop/src-tauri/src/pdf_temp_cleanup.rs` | 262 LOC. 30초 Weak reaper와 direct temp child만 대상으로 하는 24시간·scan 4,096·삭제 64·내부 항목 4,096 제한 cleanup 구현 |
| `apps/desktop/src-tauri/src/pdf_temp_cleanup_tests.rs` | 148 LOC, 6 tests. old safe/recent/unknown/nested/prefix/symlink/removal limit/reaper lifecycle test source 작성 |
| `apps/desktop/src-tauri/src/commands.rs` | begin/append/commit/abort를 camelCase request 구조체 하나로 역직렬화하고 native window label과 snapshot ID를 registry에 전달 |
| `apps/desktop/src-tauri/src/state.rs` | `pdf_jobs`를 `Arc<Mutex<PdfExportJobs>>`로 바꿔 AppState만 strong owner가 되도록 정렬 |
| `apps/desktop/src-tauri/src/lib.rs` | startup orphan cleanup과 process당 단일 Weak reaper를 setup에 등록 |
| `mydocs/orders/20260824.md` | Stage 2 완료와 Stage 3 승인 대기 상태로 비고 갱신 |
| `mydocs/working/task_m010_19_stage2.md` | Stage 2 산출물·검증 한계·잔여 위험과 다음 단계 승인 요청 기록 |

production `pdf_jobs.rs`와 `pdf_temp_cleanup.rs`는 각각 300 LOC 안쪽으로 유지하고 test module을 별도 파일로 분리했다. 임시 파일명은 `page-{8자리}.svg`로 고정했으며 startup cleanup은 재귀 삭제를 사용하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

공식 제품 문서, upstream `third_party/rhwp`, 기존 searchable/outlined PDF 변환과 atomic target replace 본문은 수정하지 않았다. native command API는 계획대로 nested request와 snapshot ID를 요구하도록 변경했으며, Stage 3에서 Studio 호출부를 같은 계약에 연결하기 전까지 이 작업 브랜치의 기존 direct PDF 호출부와는 의도적으로 미연결 상태다.

Task #20가 소유한 dispatcher/embed/platform 구현과 `desktop_platform` 제거 의미는 수정하지 않았다. 현재 `local/task20` Stage 3와 공유하는 `commands.rs`·`lib.rs`에서 #19의 의미 변경은 PDF request/setup에 한정된다. 다만 현재 rustfmt가 `lib.rs` import 줄바꿈도 정렬했으므로 devel 반영 순서가 정해진 뒤 해당 기계적 hunk를 포함해 merge 경계를 다시 확인해야 한다.

## 검증 결과

실행 명령:

```bash
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check`: 출력 없이 통과.
- OK — `pnpm run check:product-boundary`: 230 files scanned, 통과.
- OK — `git diff --check`: 출력 없이 통과.
- OK — production PDF job/cleanup module은 290 LOC/262 LOC로 계획 상한 300 LOC 안쪽이다.
- MISS — 현재 macOS 호스트에서는 계획대로 Rust test, check, Clippy와 Tauri build를 실행하지 않았다. 작성한 16개 focused Rust test의 실제 native 실행은 Stage 4 Windows/Linux exact-SHA gate다.

## 잔여 위험

- Stage 2 Rust test source는 rustfmt parse와 경계 검사만 통과했으며 type/link/runtime 결과는 아직 확인하지 않았다. Windows와 Linux에서 같은 source SHA로 실행하기 전에는 native gate가 닫히지 않는다.
- startup cleanup의 Windows reparse point, Linux symlink sentinel과 실제 OS temp metadata/age 동작은 Stage 4에서 각 지원 플랫폼별로 확인해야 한다.
- 30초 background reaper의 실제 idle 5분·absolute 15분 회수와 window destroy 경합은 native 실행에서 확인해야 한다.
- Studio는 아직 snapshot ID를 nested request로 전달하지 않는다. Stage 3 통합 전에는 변경된 native command와 기존 frontend 호출이 일치하지 않는다.
- Task #20가 먼저 devel에 반영되면 공유 `commands.rs`·`lib.rs`와 `mydocs/orders/20260824.md`를 #19 branch에 정렬해야 한다. 특히 `lib.rs` import formatter hunk와 오늘할일 표는 수동 확인 지점이다.

## 다음 단계 영향

- Stage 3는 `createPdfExportSnapshot()`을 save path 선택 전에 생성하고 같은 `snapshotId`를 begin/append/commit/abort의 `request`에 전달해야 한다.
- snapshot page만 순차 append하고 성공·실패·취소 모든 경로에서 handle을 `dispose()`하며, source path/revision/dirty/recent/recovery/`notifySaved` 불변을 통합 test로 고정해야 한다.
- Task #20의 dispatcher/embed/platform 파일은 계속 수정하지 않고, Stage 3 시작 직전에 최신 branch와 공유 파일 hunk를 다시 비교한다.
- Stage 4는 Windows/Linux 양쪽에서 Rust focused test, Clippy, Tauri build와 실제 HWP/HWPX/46쪽·취소·창 종료·재시작 orphan 시나리오를 같은 source SHA로 닫아야 한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 Studio/native 통합과 공식 문서 정렬로 진행한다.
