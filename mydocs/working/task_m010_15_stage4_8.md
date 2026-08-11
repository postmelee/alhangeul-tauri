# Task #15 Stage 4.8 완료 보고서 — exact Linux x64 GUI acceptance 확정

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.8

## 단계 목적

Stage 4.7에서 Windows WebView2 GUI 필수 gate를 통과한 exact source SHA의 Linux x64
bundle을 실제 WebKitGTK 환경에 설치한다. 6쪽 동일 크기 문서에서 CUPS-PDF, GTK
`Print to File`, 직접 PDF 저장을 각각 실행해 Stage 2.3의 교대 빈 쪽 보정과 공통
인쇄 lifecycle을 최종 후보 기준으로 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_15_impl.md` | exact Linux x64 GUI 필수 gate 통과 결과와 비차단 UX 관찰을 Stage 2.3 판단에 고정한다. |
| `mydocs/orders/20260811.md` | Windows·Linux acceptance 완료와 선행 Task #13 대기 상태를 기록한다. |
| `mydocs/working/task_m010_15_stage4_8.md` | artifact provenance, 세 PDF 경로의 쪽 수·해시·시각 검사와 잔여 위험을 기록한다. |

## exact 후보와 환경

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `89718976a7fa44ebe7f8981ca01ce6bfcbebc979` |
| native bundle | [Desktop Artifact Build #31480736454](https://github.com/postmelee/alhangeul-tauri/actions/runs/31480736454) — success |
| Linux x64 artifact ID | `9097391766` |
| 설치 대상 | `Alhangeul_0.1.0_amd64.deb` |
| 실행 환경 | Ubuntu 24.04.4 x86_64, WebKitGTK 2.52.3, GTK 3, Xvfb `:99` |
| fixture | upstream `samples/biz_plan.hwp`, 6쪽 동일 A4 크기 |
| 증거 폴더 | `/private/tmp/alhangeul-task15-linux-8971897.NLSZ8u/evidence/` |

release tag, GitHub Release, 서명, updater, package repository 게시는 수행하지 않았다.

## artifact inventory

`alhangeul-desktop-linux-x64`를 독립 다운로드해 workflow inventory와 비교했다.

| 종류 | 크기 | SHA-256 |
|---|---:|---|
| AppImage | 131,127,800 bytes | `f9ae1eb381b7548ee066acdb6693870e24d5057908be986e34def20451c823fe` |
| DEB | 54,712,482 bytes | `bafd2cf3e08c17a5b09714aee4ba8dd48695edda153d0ce347ca3a56f990080f` |
| RPM | 54,712,775 bytes | `06a5530223cd5a87a39f8078d7bca7661045cd1d5275e7fae8166ff9f614224e` |
| DEB 설치 binary | 79,966,096 bytes | `6b9e8f52b15f8f7c2abe0ed457c14c351bc158267e293495f897c4e9931213b2` |

`pnpm run check:desktop-artifacts -- --platform linux-x64`의 inventory 검증이 통과했고,
VM으로 복사한 DEB의 SHA-256도 위 값과 일치했다.

## GUI 출력 결과

| 경로 | 결과 | 크기 | SHA-256 | 쪽별 비공백 문자 수 |
|---|---|---:|---|---|
| CUPS-PDF | 6쪽, A4, 저장 후 문서 상태 복원 | 544,354 bytes | `19dc967c345d1e33827e47dc75907d01a9b9808e764534a9519e7cfb89d9c56b` | `45/54/408/637/478/250` |
| GTK `Print to File` | 6쪽, A4, 저장 후 문서 상태 복원 | 799,704 bytes | `3655aa5ad246f4e5dadbbce5532d12dc8b9d3f07ce13de24fe64c782433630b5` | `45/54/408/637/478/250` |
| `파일 > PDF로 저장` | 6쪽, A4, `biz_plan.pdf` basename과 완료 상태 | 286,858 bytes | `4dd8a346c92ea62e4d93e4c3e404f8ba9dea7a427f34acc00268afe112191557` | `45/642/410/638/478/250` |

- 세 결과 모두 `pdftotext`에서 `사업수행계획서`를 추출해 한글 검색 가능성을 확인했다.
- 72 dpi 6쪽 contact sheet와 150 dpi 2·4쪽 확대 렌더링에서 교대 빈 쪽, 페이지 누락,
  좌측 잘림, 표 경계 손상과 한글 네모 깨짐이 없었다.
- CUPS-PDF와 GTK `Print to File`의 쪽별 문자 수가 일치하며, 직접 PDF의 추출 순서는
  SVG text layer 구조에 따라 달랐지만 모든 쪽이 비어 있지 않고 시각 결과는 같았다.
- 첫 출력 뒤 하단이 `biz_plan.hwp — 6페이지`로 복원됐고 같은 세션의 `Ctrl+P`로
  system print dialog가 다시 열렸다.

## 본문 변경 정도 / 본문 무손실 여부

제품 코드, bundled Studio, upstream page SVG, print stylesheet, pagination adapter,
HWP/HWPX/direct PDF 데이터는 변경하지 않았다. 원격 `publish/task15`도 exact source
SHA `89718976a7fa44ebe7f8981ca01ce6bfcbebc979`에 유지한다. 이번 단계는 artifact 설치,
GUI 조작, PDF 분석과 결과 문서화만 수행한다.

## 검증 명령

```bash
gh run view 31480736454 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download 31480736454 --repo postmelee/alhangeul-tauri \
  --name alhangeul-desktop-linux-x64 --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform linux-x64 \
  --root <artifact-root> --verify-inventory <inventory-path>
sha256sum <appimage> <deb> <rpm> <installed-binary>
pdfinfo <cups-pdf> <gtk-print-to-file-pdf> <direct-pdf>
pdftotext -f <page> -l <page> <pdf> -
pdftoppm -png -r 150 -f <page> -singlefile <pdf> <output-prefix>
git status --short --branch
git rev-parse origin/publish/task15
git diff --check
```

## 검증 결과

- OK — workflow, artifact inventory와 설치 DEB가 exact candidate SHA에 대응한다.
- OK — CUPS-PDF, GTK `Print to File`, 직접 PDF가 모두 6쪽 A4를 생성했다.
- OK — 두 system print 경로에 교대 빈 쪽이 없어 Stage 2.3 회귀가 해소됐다.
- OK — 세 PDF에서 한글 텍스트 추출과 대표 페이지 시각 검사를 통과했다.
- OK — 저장 뒤 기존 문서 상태 복원과 반복 인쇄를 확인했다.
- OK — Windows Stage 4.7과 Linux Stage 4.8의 exact GUI 필수 gate가 모두 통과했다.
- INFO — Linux dialog가 열린 동안 `인쇄 준비 중... (6/6)`이 유지됐지만 조기
  `인쇄 완료`나 문서 상태 복원은 없었다. 출력 correctness를 막지 않는 표시 차이다.
- INFO — CUPS-PDF Poppler 렌더링에 기존 Type 3 glyph bounding-box 경고가 있었지만
  렌더링·쪽 수·한글 추출은 성공했다. GTK와 직접 PDF에는 같은 경고가 없었다.

## 잔여 위험

- AppImage와 RPM은 inventory/build gate만 통과했고 이번 GUI 실행은 DEB로 수행했다.
- 혼합 페이지 크기의 GTK media 선택은 동일 크기 교대 빈 쪽 회귀와 분리한 기존 범위로
  남아 있다.
- Linux dialog의 준비/처리 중 문구 차이는 false completion이 아니며 이번 task의 필수
  gate를 막지 않는다. 문구 통일이 필요하면 별도 UX 범위에서 다룬다.
- native focus 복귀는 modal chain 종료만 뜻하며 physical printer spool 완료나 사용자
  취소 여부를 주장하지 않는다.
- Task #13이 open이고 열린 PR이 없으므로 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Task #15의 exact Windows/Linux 필수 GUI gate는 완료했다.
- 선행 Task #13의 남은 단계와 PR·merge를 먼저 완료한다.
- Task #13 merge 뒤 `local/task15`를 최신 `devel`에 정렬한다. source SHA가 바뀌므로 CI와
  native workflow, artifact inventory를 새 exact SHA에서 다시 실행한다.
- 최종 exact gate가 유지되면 Task #15 최종 보고서 작성과 `devel` 대상 PR 게시로
  진행한다. release·tag·배포는 별도 명시 지시 전까지 수행하지 않는다.

## 승인 요청

- 작업지시자의 연속 진행 승인과 Windows 수동 acceptance 완료 보고에 따라 Stage 4.8을
  확정한다.
- 다음 구현 작업은 Task #15가 아니라 선행 Task #13에서 재개한다.
