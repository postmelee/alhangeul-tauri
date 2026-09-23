# Task #15 Stage 2.3 완료 보고서 — Linux WebKitGTK 빈 쪽 삽입 보정

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 2.3

## 단계 목적

Ubuntu 24.04 x64의 WebKitGTK system print에서 6쪽 `biz_plan.hwp`가 12쪽으로
출력되고 각 원본 쪽 뒤에 빈 A4 쪽이 삽입되던 문제를 원인 수준에서 분리하고,
browser·Windows·direct PDF·혼합 page size 계약을 바꾸지 않는 Linux Tauri leaf
adapter로 보정했다.

최초 후보 `3688f80493fa2a6068282e224d61f07d29cd514c`의 1px 높이 tolerance는
CUPS-PDF만 6쪽으로 만들고 GTK `Print to File`의 교대 빈 쪽은 제거하지 못했다.
동일 WebKitGTK 최소 재현에서 같은 크기의 각 쪽에 서로 다른 named `@page`와
명시적 break를 함께 적용할 때 두 번 pagination되는 것을 확인했다. 최종 후보
`eb7721c26e0f1b85d203a9b2dc67cef3e279cc29`는 모든 쪽의 물리 크기가 같을 때만
default `@page` context와 `page: auto`를 적용하고 기존 명시적 break와 1px
tolerance를 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/command/direct-print.ts` | Linux 동일 크기 page size 판정, default `@page` size와 `page: auto`, 1px 높이 tolerance를 Tauri hidden print surface에만 적용한다. 혼합 크기는 upstream named page context를 보존한다. |
| `apps/studio-host/src/command/direct-print.test.ts` | Windows upstream style 무손실, Linux 동일 크기 세로·가로 보정, 혼합 크기 named page 보존, 마지막 쪽 break 계약을 고정한다. |
| `mydocs/plans/task_m010_15_impl.md` | 실제 12쪽 실패, 폐기 후보, 최소 재현 결론, 최종 보정과 exact GUI gate를 Stage 2.3에 기록한다. |
| `mydocs/orders/20260809.md` | 장애 발견 당시 Task #15 진행 상태를 기록한다. |
| `mydocs/orders/20260811.md` | Stage 2.3 Linux gate 완료와 다음 exact 후보 재검증 대기 상태를 기록한다. |
| `mydocs/working/task_m010_15_stage2_3.md` | 원인, source/native/GUI 검증, 잔여 위험과 다음 단계 입력을 기록한다. |

Stage 2.3 누적 source diff는 `3d36aea..eb7721c` 기준 4개 파일, 186 insertions,
10 deletions다. 최종 `direct-print.ts`는 175 LOC, focused test는 188 LOC로 파일
300 LOC 권장 상한 안에 있다.

## 본문 변경 정도 / 본문 무손실 여부

`third_party/rhwp`와 browser의 upstream visible print preview는 수정하지 않았다.
Windows는 upstream print stylesheet를 그대로 사용하며, Linux에서도 page SVG,
SVG ID namespace용 upstream `pageName`, 본문 DOM과 저장 데이터는 바꾸지 않는다.
보정은 Tauri hidden surface의 print CSS에만 적용된다.

HWP/HWPX 저장, searchable direct PDF, drag-in, local font와 native Rust API는
변경하지 않았다. `3d36aea..eb7721c`의 `apps/desktop/src-tauri` diff는 비어 있다.

## 검증 결과

### Source gate

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/command/direct-print.test.ts src/core/upstream-boundary.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — focused 실행과 전체 Studio 모두 19 files, 81 tests 통과
- OK — production Studio build 211 modules 변환, `dist/index.html`과 bundle 생성
- OK — product boundary 180 files 통과
- OK — `git diff --check` 경고 없음
- INFO — 기존 CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는 유지되며 새 오류가 아니다.

### Linux native·package gate

환경:

- Colima x86_64 VM, Ubuntu 24.04.4, WebKitGTK 2.52.3, GTK 3.24.41
- source commit `eb7721c26e0f1b85d203a9b2dc67cef3e279cc29`
- adapter SHA-256 `1d8513b501042d7b291b12cf8dc872a85d7b4f8f91b296231542ca0d9f7dfc8a`

실행 명령:

```bash
cargo test --release --target x86_64-unknown-linux-gnu
cargo clippy --release --target x86_64-unknown-linux-gnu -- -D warnings
cargo clippy --release --target x86_64-unknown-linux-gnu -- -D warnings -A dead-code
pnpm tauri build --verbose --target x86_64-unknown-linux-gnu --bundles deb
dpkg-deb --info Alhangeul_0.1.0_amd64.deb
dpkg-deb --contents Alhangeul_0.1.0_amd64.deb
sudo dpkg -i Alhangeul_0.1.0_amd64.deb
```

결과:

- OK — Rust unit 83개와 Linux runtime integration 21개, 합계 104 tests 통과
- WARN — 표준 `-D warnings` Clippy는 이번 Stage 전부터 존재한 미사용
  `DocumentSessionManager::has_dirty_sessions` 한 건에서만 중단됐다. 부모
  `3d36aea`에도 같은 메서드가 있고 Stage 2.3 Rust diff는 없다.
- OK — 위 기존 `dead-code` 한 건만 명시적으로 제외한 Clippy는 다른 경고 없이 통과
- OK — x86_64 release Tauri build와 DEB 생성·구조 검사 통과
- OK — DEB `alhangeul 0.1.0 amd64`, 54,709,872 bytes, SHA-256
  `797200709d632676d5cfe665a1df3bbe7d542c51d3aa463d31763318d5e4a56f`
- OK — DEB 설치 후 `/usr/bin/Alhangeul`에서 6쪽 문서와 로컬 글꼴 감지 UI 로딩 확인.
  설치 실행파일은 79,964,000 bytes, SHA-256
  `9c509d41e91a974238e71396bbed15307c19e0987e58ebb8f4f52ba3e3c54f6e`다.

### Linux GUI print·PDF gate

동일 `biz_plan.hwp`를 exact source release 앱에서 출력했다.

| 경로 | 결과 | SHA-256 |
|---|---|---|
| CUPS-PDF | A4 6쪽, 쪽별 non-space text `45/54/408/637/478/250`, 빈 쪽 없음 | `f5c45a2093ff8e9f8bcf4ad002de535f1b355cb5d52470275411a2e18c4d9f77` |
| GTK `Print to File` | A4 6쪽, 쪽별 non-space text `45/53/408/637/478/250`, 빈 쪽 없음 | `6e36eb9b1ac247a5951184a2fd153b84c574e57a5665e06cb808b78522ae1bf9` |
| `파일 > PDF로 저장` | A4 6쪽, 쪽별 non-space text `45/642/410/638/478/250`, 한글 검색·선택 text 유지 | `d22f377272f99eec6690c54f261022c2437ecd9c140c7c50fc68777bd600fecf` |

Poppler `pdfinfo`, 쪽별 `pdftotext`, 6쪽 contact sheet 육안 검사를 함께 사용했다.
로컬 증거는 `.codex-task15-linux-evidence-eb7721c/`, DEB는
`.codex-task15-linux-artifacts-eb7721c/`에 보존했다. 설치 smoke 화면은
`10-deb-install-smoke-waited.png`다.

## 잔여 위험

- GTK의 혼합 물리 page size 인쇄는 최소 재현에서도 media 전환이 일관되지 않았다.
  이번 보정은 혼합 크기를 하나로 평탄화하지 않고 upstream named page를 보존한다.
  동일 크기 문서의 교대 빈 쪽 회귀와 별도 후속 범위로 다룬다.
- 표준 `pnpm run clippy:desktop`의 `-D warnings`는 Stage 2.3과 무관한 기존
  `has_dirty_sessions` dead-code 때문에 계속 실패한다. 해당 Rust cleanup을 이번
  Linux print CSS 보정에 섞지 않았다.
- Linux 전용 분기이므로 기존 Windows system dialog 직접 진입에 source 영향은
  없지만, 최종 공개 후보는 새 exact SHA의 Windows MSI·NSIS에서 다시 확인해야 한다.
- DEB 설치 smoke는 exact package binary로 확인했고, CUPS/GTK/direct PDF 6쪽 gate는
  같은 source commit에서 먼저 만든 release binary로 수행했다. 다음 Stage 4 exact
  artifact에서는 배포 bundle 자체의 Windows/Linux smoke를 다시 묶는다.

## 다음 단계 영향

- `3688f80`은 GTK `Print to File` 실패 후보이므로 재사용하지 않는다. 다음 exact
  후보의 source 기준은 `eb7721c` 이후 Stage 2.3 보고 commit이다.
- Stage 4 후보를 다시 만들 때 Windows x64 MSI·NSIS와 Linux x64 AppImage/DEB/RPM의
  artifact inventory를 생성하고, Windows system dialog 직접 진입과 Linux 6쪽
  system print를 최종 회귀 확인한다.
- mixed-size GTK print와 기존 Rust dead-code lint는 Task #15 동일 크기 빈 쪽
  acceptance와 분리해 후속 범위를 판단한다.

## 승인 요청

- Stage 2.3 산출물과 검증 결과를 승인하면 새 exact-SHA Windows/Linux 후보 생성과
  최종 수동 검증 handoff로 진행한다.
