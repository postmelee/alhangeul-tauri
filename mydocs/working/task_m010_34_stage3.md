# Task #34 Stage 3 완료 보고서 — Linux native dialog·PDF·system print adapter

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 3

## 단계 목적

Stage 2의 플랫폼 중립 WebDriver 문서 UX harness에 Linux 전용 native UI와 출력 수용 경계를 연결했다. GTK file chooser·print dialog는 AT-SPI role/name과 Action/EditableText interface로 조작하고, 접근성 tree로 표현할 수 없는 OS drag-in만 검증된 X11 창 bounds 사이의 단일 gesture로 격리했다. 직접 PDF와 GTK Print to File/CUPS-PDF 결과는 Poppler metadata·text·render를 함께 판정하며, 자동 판정이 한글 glyph 시각 검토를 대체하지 않도록 summary에 read-back 필요를 고정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/gui/linux/native-ui/atspi_driver.py` | 앱 접근성 tree를 제한된 범위에서 탐색하고 wait/absence/action/editable text/focus/extents를 JSON 1건으로 수행하는 pyatspi bridge를 추가했다. |
| `tests/gui/linux/native-ui/atspi.mjs` | GTK open/save/print readiness, path·basename 입력, 저장·취소·가상 PDF printer 선택, modal 종료와 실패 tree/screenshot/Escape cleanup을 조율한다. physical printer 이름은 거부한다. |
| `tests/gui/linux/native-ui/drag_source.py`, `drag-drop.mjs` | 저장소 fixture URI를 제공하는 격리 GTK drag source와 X11 screen/source/target bounds를 검증한 단일 drag gesture를 추가했다. helper process는 성공·실패 모두 `finally`에서 종료한다. |
| `tests/gui/linux/native-ui/*.d.mts` | WDIO TypeScript spec이 JavaScript Linux adapter를 strict type 경계로 소비하게 한다. |
| `tests/gui/linux/native-ui/atspi.test.mjs` | Save As·open·Print to File·cancel·physical printer 거부·failure evidence/cleanup·JSON process bridge 계약 5건을 고정한다. |
| `tests/gui/linux/native-ui/drag-drop.test.mjs` | 단일 gesture, invalid bounds 입력 전 거부와 drag source 실패 cleanup 계약 3건을 고정한다. |
| `tests/gui/linux/pdf-analysis.mjs`, `pdf-analysis.d.mts` | `pdfinfo`, `pdftotext`, `pdftoppm` 결과에서 6쪽 A4, 한글 표제, 쪽별 text 하한, nonblank/content margin을 판정하고 PNG render와 시각 read-back 표시를 남긴다. |
| `tests/gui/linux/pdf-analysis.test.mjs` | pdfinfo parser, binary P6 raster bounds, Poppler orchestration, text-only 성공과 blank/crop/비A4 거부 계약 4건을 고정한다. |
| `tests/gui/specs/linux-native.e2e.ts` | HWP/HWPX native open·Save As·현재 저장·재열기, bounded drag-in, 직접 PDF, GTK Print to File·cancel·CUPS-PDF 반복과 editor state 복원 시나리오를 연결한다. |
| `tests/gui/wdio.linux.conf.ts` | 공통 문서 UX spec 뒤 Linux native spec을 단일 instance·retry 없음 설정으로 실행한다. |
| `package.json` | Linux adapter focused test entrypoint를 추가하고 전체 automation gate에 Stage 3 test를 포함한다. |
| `mydocs/orders/20260814.md` | Stage 3 완료와 Stage 4 승인 대기 상태를 반영한다. |

모든 신규 구현·test 파일은 권장 300 LOC 상한 이내다. 가장 큰 파일은 Linux native spec 278행, AT-SPI adapter 229행, PDF analyzer 208행이다.

## 본문 변경 정도 / 본문 무손실 여부

제품 코드, Rust/Tauri binary, upstream submodule, 기존 native 저장·PDF·인쇄 동작과 공식 제품 문서는 수정하지 않았다. 새 코드는 `tests/gui/linux/`와 Linux WDIO spec 조합에만 존재하고, Stage 2 공통 selector·fixture·evidence helper가 Linux adapter를 역참조하지 않는 방향도 유지했다. 실제 사용자 문서 대신 SHA가 고정된 공개 repository fixture와 evidence root 안의 생성 파일만 사용한다.

## 검증 결과

구현계획서의 Stage 3 명령을 최종 변경 뒤 그대로 실행했다.

```bash
node --test tests/gui/linux/*.test.mjs tests/gui/linux/native-ui/*.test.mjs
pnpm run test:gui:contracts
pnpm run test:automation
git diff --check
```

결과:

- OK — Linux native UI/PDF focused test 12/12 통과.
- OK — 공통 GUI 계약 11/11 통과.
- OK — 전체 automation 185/185 통과. Stage 3 focused test도 전체 gate에 포함됐다.
- OK — `git diff --check` 경고 없음.

추가 정적 검증:

```bash
pnpm exec tsc --noEmit -p tests/gui/tsconfig.json
python3 -c '... compile(atspi_driver.py); compile(drag_source.py) ...'
pnpm run check:product-boundary
```

- OK — WDIO spec strict TypeScript no-emit 검사 통과.
- OK — 두 Python helper의 구문 compile 통과. 현재 host에는 pyatspi/GTK runtime을 설치하거나 실행하지 않았다.
- OK — 제품 경계 검사 222개 파일 통과.

## 잔여 위험

- 현재 macOS host에서는 Linux production DEB, Xvfb, AT-SPI registry, GTK dialog, CUPS-PDF와 Poppler 시나리오를 실행하지 않았다. focused fixture는 adapter의 순서·실패 처리·분석 알고리즘을 검증하며 native 성공 증거는 아니다.
- GTK/WebKitGTK가 실제 Ubuntu runner에서 노출하는 localized role/name과 Tauri native dialog의 application tree 소속은 Stage 4 workflow merge 뒤 first canary에서 측정해야 한다. drift가 있으면 실패 tree와 screenshot이 남고 좌표 재시도로 우회하지 않는다.
- drag-in fallback은 X11/Xvfb 전용이다. Stage 4는 Wayland가 아닌 명시적 `DISPLAY`와 window manager를 준비해야 하며 screen/app/source bounds가 하나라도 맞지 않으면 입력 전에 실패한다.
- CUPS-PDF는 physical printer를 사용하지 않고 별도 exact output 경로를 제공하도록 runner를 구성해야 한다. stale output은 시나리오 전에 제거하지만 CUPS spool 완료는 bounded file wait로 확인한다.
- text extraction은 tofu를 판정하지 못하므로 PNG render와 screenshot을 evidence에 포함하고 `visualReadbackRequired: true`를 유지한다. merge 후 close gate에서 사람이 한글 glyph·빈 쪽·잘림을 읽기 전에는 Issue #34를 닫지 않는다.

## 다음 단계 영향

- Stage 4 workflow는 `python3-pyatspi`, GTK3 GI, `xdotool`, AT-SPI registry, Xvfb/window manager, Poppler와 CUPS-PDF를 명시적으로 준비하고 `ALHANGEUL_GUI_CUPS_PDF_OUTPUT`을 evidence root 안의 서로 다른 경로로 전달해야 한다.
- workflow는 Stage 1 exact-SHA artifact handoff와 Stage 2 `ALHANGEUL_GUI_*` 입력을 먼저 검증한 뒤 설치된 DEB에 `pnpm run test:gui:linux`를 실행해야 한다.
- 성공·실패 모두 전체 output root를 evidence로 올려 native-ui tree/screenshot, scenario manifest, 생성 HWP/HWPX/PDF, PNG render와 PDF analysis JSON을 함께 보존해야 한다.
- Stage 4 source-level 계약에서는 physical printer 금지, retry 없음, native dependency/timeout/concurrency, `always()` evidence upload와 actual native 미실행 경계를 고정한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 Linux GUI workflow와 운영 계약 구현으로 진행한다.
