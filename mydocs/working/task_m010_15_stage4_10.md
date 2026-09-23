# Task #15 Stage 4.10 완료 보고서 — 최종 exact 후보 수용 근거 확정

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.10

## 단계 목적

Task #13 merge를 포함한 최신 `devel` 통합 source SHA의 CI, Windows/Linux native bundle과
실제 GUI 근거를 한 후보에 정렬한다. 자동 gate와 직접 GUI 결과를 구분하고, 최종 SHA에서
직접 반복하지 못한 플랫폼의 한계를 공개한 상태로 Task #15를 최종 보고서·PR 단계에 넘길 수
있는지 판정한다.

## 최종 후보와 자동 gate

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `da488a87e9c3b4ca325bebefc611aea853f714cc` |
| CI | [#31523448691](https://github.com/postmelee/alhangeul-tauri/actions/runs/31523448691) — success |
| Desktop Artifact Build | [#31523462948](https://github.com/postmelee/alhangeul-tauri/actions/runs/31523462948) — success |
| CI 범위 | product/version/release/rhwp pin, automation/upstream/Studio, build, Rust test·Clippy |
| native 범위 | Windows x64, Linux x64, Linux arm64, MSI·NSIS installer smoke |

native artifact 4개와 workflow inventory를 독립 다운로드해 비교했다.

| 플랫폼·종류 | 크기 | SHA-256 |
|---|---:|---|
| Windows x64 MSI | 52,785,152 bytes | `7ba02c51195d904c1e9e2be005b05c4daf805135fb81fa747eb06a01cfc90916` |
| Windows x64 NSIS | 48,472,202 bytes | `461ed2b50d2911cec683e4e1d90de75d1446a8c9fe8026d694c4b0b8de29f8fb` |
| Linux x64 AppImage | 131,152,376 bytes | `c8125eff85269a7fbcf150d43851d039dedf401f6efbe09572c7b16a1e9ef4d5` |
| Linux x64 DEB | 54,730,206 bytes | `7cab4a7c6af08292faddb9cc914abf57e4190b002b525c12be445762f7af5175` |
| Linux x64 RPM | 54,729,806 bytes | `ad1fe8da765a4008a447765cfe3de572b26469dcd77771fa2142995670732406` |
| Linux arm64 DEB | 54,685,274 bytes | `61bd200259c1283158d5ccea64fed427840ab105cd2de86163e972c46297610d` |

Windows installer smoke는 MSI와 NSIS 설치·실행·제거 경로를 모두 통과했다. release tag,
GitHub Release, 서명, updater와 package repository 게시는 수행하지 않았다.

## 최종 exact Linux arm64 GUI 검증

| 항목 | 값 |
|---|---|
| 환경 | Ubuntu 24.04.4 LTS aarch64, WebKitGTK 2.52.3, GTK 3 |
| 설치 package | 위 exact Linux arm64 DEB |
| fixture | upstream `samples/biz_plan.hwp`, 6쪽 동일 A4 크기 |
| 원본 HWP SHA-256 | `8b786d6824622afae2220b203beeef6e5592157e1896fea055ebc602817113c1` |
| 임시 증거 manifest SHA-256 | `e2d1fa3bcfcca5c0357fc87361c9389a616c1206c4d264a69612e77dc6ac89ae` |

| 경로 | 결과 | 크기 | SHA-256 |
|---|---|---:|---|
| CUPS-PDF | 6쪽 A4, 모든 쪽 렌더, 빈 쪽·잘림·누락 없음 | 455,896 bytes | `e670886038ef51a598bf9e48a362b666feb0be1071bf106cb7f3d5ddb303b72c` |
| `파일 > PDF로 저장` | 6쪽 A4, Producer `alhangeul-desktop`, 모든 쪽 한글 추출 성공 | 286,858 bytes | `c1c04a48a8dbb390a81f61ba081c611fc3ad658085f12d1e8eb810e001e7af5f` |

- 앱에서 한글 UI와 6쪽 문서를 정상 표시했고 문서는 중앙에 배치됐다.
- `Ctrl+P`는 별도 Alhangeul preview 없이 GTK system print dialog를 열었고 `All Pages`가
  선택됐다.
- CUPS-PDF의 6쪽 150 dpi 렌더를 전수 확인해 한글·표·페이지 경계와 쪽 순서가 정상임을
  확인했다. 출력 뒤 같은 세션에서 `Ctrl+P`로 system dialog를 다시 열었다.
- CUPS-PDF에는 Poppler Type 3 glyph bounding-box 경고가 있었고 이 arm64 환경의
  `pdftotext`는 한글을 추출하지 못했다. 화면·PDF 렌더의 한글은 정상이다. Stage 4.8
  Linux x64 CUPS-PDF는 같은 문서의 한글 추출에 성공했다.
- direct PDF는 모든 쪽의 한글 추출에 성공했고, 저장 전후 원본 HWP SHA가 동일했다.

## 이전 exact GUI 결과와 최종 SHA 비교

| 플랫폼 | 직접 GUI 근거 | 최종 SHA 보강 | 판정 |
|---|---|---|---|
| Windows x64 | `8971897`에서 system dialog 직접 진입, Print-to-PDF 저장창까지 처리 중 상태 유지, 복원·반복 인쇄 통과 | `8971897..da488a8`의 Task #15 인쇄 구현 diff 없음, final Windows build와 MSI·NSIS smoke 통과 | 수용, 최종 SHA 직접 GUI 미반복을 제한사항으로 공개 |
| Linux x64 | `8971897`에서 CUPS-PDF·GTK Print to File·direct PDF 모두 6쪽 A4, 무빈쪽·무잘림, 한글 추출 통과 | 인쇄 구현 diff 없음, final x64 AppImage·DEB·RPM build와 inventory 통과 | 수용, 최종 SHA 직접 GUI 미반복을 제한사항으로 공개 |
| Linux arm64 | 이전에는 build·inventory만 수행 | final `da488a8` DEB의 CUPS-PDF·direct PDF와 반복 인쇄를 직접 검증 | 최종 SHA 직접 수용 |

최종 Windows GUI는 접근 가능한 VDI session이 없어 반복하지 못했다. 최종 Linux x64 GUI는
macOS ARM의 QEMU x86_64 emulation에서 WebKit 프로세스가 기동하지 않아 반복하지 못했다.
이는 제품 실패로 기록하지 않으며, 이전 exact 직접 결과·인쇄 구현 무변경·최종 native
build와 Linux arm64 공통 WebKitGTK 직접 결과를 각각 독립 근거로 남긴다.

## 본문 변경 정도 / 본문 무손실 여부

제품 코드, bundled Studio, upstream page SVG, print stylesheet, pagination adapter,
HWP/HWPX/direct PDF 데이터는 변경하지 않았다. 이번 단계는 최종 workflow, artifact와 GUI
결과를 수행계획서와 단계 보고서에 고정한다. `third_party/rhwp`도 변경하지 않았다.

## 검증 결과

- OK — exact source SHA의 CI와 Windows/Linux native workflow가 모두 성공했다.
- OK — Windows/Linux 지원 installer 6개의 inventory와 SHA-256을 확인했다.
- OK — Windows MSI·NSIS installer smoke가 통과했다.
- OK — final Linux arm64에서 6쪽 system print, direct PDF, 반복 인쇄와 원본 무손실을 직접
  확인했다.
- OK — 이전 Windows/Linux x64 GUI 수용 SHA와 final SHA 사이의 Task #15 인쇄 구현 diff가
  없다.
- LIMIT — final SHA Windows와 Linux x64 GUI는 직접 반복하지 못했으며 PR에 명시한다.
- INFO — CUPS arm64 Type 3 glyph는 정상 렌더됐지만 해당 환경의 한글 text extraction은
  실패했다. direct PDF의 searchable 계약은 final exact SHA에서 성공했다.

## 잔여 위험

- AppImage와 RPM은 build·inventory까지만 확인했고 GUI 실행은 DEB에서 수행했다.
- 혼합 페이지 크기의 GTK media 선택은 동일 크기 빈 쪽 회귀와 분리된 범위다.
- native focus 복귀는 modal chain 종료를 뜻하며 physical printer spool 완료나 사용자
  저장 성공을 판정하지 않는다.
- 공개 prerelease, release tag, 서명, updater와 package repository는 Task #15 범위 밖이다.

## 다음 단계 영향

- Task #15 최종 보고서에 자동 gate, 이전 exact GUI와 final exact GUI를 구분해 반영한다.
- 오늘할일을 완료 처리하고 최종 report commit을 `publish/task15`에 게시한다.
- `devel` 대상 ready PR을 만들되 Issue close, merge, release는 수행하지 않는다.
- Task #9 prerelease Go 여부는 Task #15 PR merge 뒤 새 `devel` exact 후보에서 별도로 판단한다.

## 승인 요청

- 작업지시자의 “Task #15 최종 보고서·PR 생성까지” 지시에 따라 최종 보고와 ready PR
  게시로 진행한다.
