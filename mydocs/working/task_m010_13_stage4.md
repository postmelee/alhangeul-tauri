# Task #13 Stage 4 보고서 — HWPX native 저장과 직접 PDF override 통합

GitHub Issue: [#13](https://github.com/postmelee/alhangeul-tauri/issues/13)
구현계획서: [`task_m010_13_impl.md`](../plans/task_m010_13_impl.md)
Stage: 4

## 단계 목적

Stage 3의 HWP 전용 native staging을 HWP/HWPX 공통 source save로 일반화하고, upstream `file:print-to-pdf` 메뉴 위치·label·활성 규칙은 그대로 상속하면서 execute만 현재 upstream 페이지 SVG를 사용하는 Alhangeul 직접 저장 경로로 교체한다. source save와 PDF export의 상태 경계를 분리해 PDF 성공·실패·취소가 문서 session·dirty·recent·recovery를 변경하지 않도록 고정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/desktop-persistence.ts` 및 test | `hwp | hwpx` source save와 page-at-a-time PDF job orchestration을 154 LOC adapter로 분리했다. save만 `exportHwp`/`exportHwpx`와 staging을 사용하며 PDF는 `pageCount`/`getPageSvg(page)`만 호출한다. |
| `apps/studio-host/src/core/desktop-host.ts`, `desktop-host-dependencies.ts` 및 test | native save dialog를 HWP/HWPX 형식별로, PDF dialog를 별도로 제공한다. source commit 성공 뒤 session을 반영하고 `notifySaved`를 호출하며 PDF에는 호출하지 않는다. |
| `apps/studio-host/src/command/commands/file.ts` 및 test | upstream command 객체의 metadata를 유지한 채 Tauri에서 `file:save`, save-as/HWP/HWPX, `file:print-to-pdf` execute만 native host에 연결했다. 실제 인쇄인 `file:print`와 PDF 직접 저장을 분리했다. |
| `apps/studio-host/src/core/desktop-session.test.ts`, `chunked-fs.test.ts` | cross-format HWPX session metadata 반영과 HWPX staging의 partial chunk write 계약을 고정했다. |
| `apps/desktop/src-tauri/src/state.rs`, `commands.rs`, `lib.rs` | HWP 전용 prepare/commit 명령을 format-aware 명령으로 교체했다. 요청 형식·대상 확장자·staging 바이트 형식·`DocumentCore::from_bytes`가 일치한 뒤에만 atomic write와 session/recent 갱신을 수행한다. |
| `apps/desktop/src-tauri/src/pdf_jobs.rs` | `begin → append(page) → commit/abort` PDF job과 target sibling 임시 디렉터리 수명주기를 추가했다. SVG는 한 페이지씩 제한 글꼴을 대체한 뒤 임시 파일에 저장하고 실패·abort·AppState drop 시 정리한다. |
| `apps/desktop/src-tauri/src/pdf_export.rs` | 임시 SVG 파일을 한 페이지씩 읽어 `embed_text: true`로 우선 변환하고, 해당 변환 실패 때만 `embed_text: false` outline fallback을 수행한다. 결과에 `searchable | outlined-fallback` text mode와 warning을 포함하고 최종 PDF만 atomic replace한다. |
| `tests/rhwp-baseline.test.mjs` | upstream PDF/HWPX 메뉴 metadata 유지, native execute override, HWP staging PDF 제거, current SVG 경계, searchable 우선/fallback 표시를 기준선으로 고정했다. |

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 본문 무손실은 해당 없다. `third_party/rhwp` source·pin과 upstream HTML/menu/Toolbar/renderer는 수정하지 않았다. upstream file command 배열을 복제하지 않고 기존 12개 leaf alias 중 `command/commands/file` execute adapter만 Stage 4 책임으로 완성했다.

기존 Rust `export_pdf`/`export_pdf_from_hwp_path`와 HWP staging PDF 경로는 source를 다시 파싱해 현재 편집 상태와 어긋날 수 있어 제거했다. 새 PDF 경로는 편집 중인 upstream WASM model의 page SVG를 직접 소비한다. 전체 SVG 목록을 TypeScript 메모리나 단일 IPC payload에 모으지 않으며 Rust도 raw SVG 문자열을 page별 임시 파일로 내린 뒤 변환한다. 최종 PDF writer chunk/bytes는 Rust 내부에서 조합된다.

새 production 파일은 `desktop-persistence.ts` 154 LOC, `pdf_jobs.rs` 153 LOC, `pdf_export.rs` 198 LOC로 역할별 권장 상한 아래다. 기존 대형 `commands.rs`는 PDF core 변환 책임을 제거해 250여 LOC 줄였고, `state.rs`에는 format 검증·session commit과 그 단위 test만 추가했다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/desktop-host.test.ts src/core/desktop-session.test.ts src/core/chunked-fs.test.ts src/command/commands/file.test.ts
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/desktop-host.test.ts src/core/desktop-persistence.test.ts src/core/desktop-session.test.ts src/core/chunked-fs.test.ts src/command/commands/file.test.ts
pnpm run test:automation
pnpm run test:upstream
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — 구현계획서의 filtered 명령은 package script argv 처리에 따라 전체 Studio suite를 실행했고 16 files, 61 tests가 통과했다.
- OK — source save·PDF lifecycle 직접 focused 실행은 5 files, 23 tests가 통과했다.
- OK — automation suite: 60 tests passed.
- OK — upstream pin/baseline/update suite: 35 tests passed.
- OK — product boundary: 163 files scanned, violation 0.
- OK — 전체 Studio suite: 16 files, 61 tests passed.
- OK — TypeScript와 exact upstream Vite production build: 208 modules transformed, build completed. 생성 bundle에 `begin_pdf_export`, `append_pdf_page`, `commit_staged_document_save`가 포함되고 폐기한 HWP staging PDF 명칭은 없음을 확인했다.
- OK — 변경 Rust 파일은 `rustfmt`로 정렬했고 `git diff --check` whitespace error는 0이다.
- 미수행 — AGENTS 지원 범위 규칙에 따라 macOS에서는 Rust unit test·Clippy·Tauri build를 실행하지 않았다. 이는 성공으로 간주하지 않고 Windows/Linux Stage 6 native gate에 남긴다.
- 참고 — Vite가 CanvasKit browser externalization, Tauri API ineffective dynamic import, 500 kB 초과 chunk를 경고했으나 Studio bundle은 성공했다.

## 잔여 위험

- Rust format-aware save와 PDF job은 아직 Windows/Linux에서 compile·unit test·Tauri build되지 않았다. command serialization, filesystem atomic replace, HWP/HWPX reopen은 Stage 6 결과 전까지 수용 완료를 주장하지 않는다.
- `embed_text: true`를 우선 사용하고 fallback mode를 명시했지만 실제 한글 font subset, `pdftotext`, 선택·검색 가능성, 페이지 크기·시각 정합은 native PDF artifact로 검증하지 않았다. Stage 6의 필수 acceptance gate다.
- outline fallback은 조용히 강등하지 않고 사용자 warning을 표시하지만, 실제 fallback 유발 fixture와 긴 문서 메모리·임시 파일 정리는 Windows/Linux에서 추가 검증해야 한다.
- upstream browser recovery로 native session 없이 복원된 문서의 source save 연결은 이번 Stage의 기존 native-session 전제 밖이다. Stage 5 회귀 점검에서 공식 지원 동작과 문서화 필요 여부를 다시 확인한다.

## 다음 단계 영향

- Stage 5는 README·UPSTREAM·LOCAL_FONTS·DESKTOP_RELEASE를 실제 구현 경계에 맞춰 정렬하되 searchable PDF와 native HWPX 성공을 아직 검증 완료로 표현하지 않는다.
- override inventory는 12개 leaf alias를 유지하고 `legacy-upstream-copy`가 다시 생기지 않았는지 전체 회귀 검사한다.
- Stage 6은 exact SHA Windows/Linux bundle에서 HWP/HWPX same-format·cross-format save/reopen, PDF 원본 session 불변, page/text/검색 가능성, fallback warning, 중간 실패·긴 문서 정리를 수용 gate로 실행해야 한다.

## 승인 요청

- Stage 4 산출물과 검증 결과를 승인하면 Stage 5 플랫폼 중립 회귀 검증과 공식 문서 정렬로 진행한다.
