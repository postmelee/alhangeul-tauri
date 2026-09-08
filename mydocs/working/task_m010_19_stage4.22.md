# Task #19 Stage 4.22 — 수용 근거 계층화와 최소 OS 회귀 완료

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.22

## 단계 목적

snapshot·잠금·시간 제한은 기존 결정적 테스트로 수용하고, 실제 OS에서 부족했던
Windows junction 안전성과 Linux HWPX 직접 PDF만 보완한다. 작업지시자가 승인한 검증
계층을 적용하되 실제 동시 편집/reload/장시간 대기/재시작 통합을 실행했다고 쓰지 않는다.

이번 결과로 승인된 Stage 4 수용 근거 정리를 완료한다. #19 최종 보고/PR 및 릴리즈 승인은 별도다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/operations/DESKTOP_RELEASE.md` | 기존 6개 PDF 계약 보존, 검증 계층·미실행 한계·재사용/재검증 조건과 제한 scope 안내 |
| `apps/desktop/src-tauri/src/pdf_temp_cleanup_tests.rs` | 208 LOC, 실제 Windows junction 2형태·외부 대상/내부 sentinel 보존·정상 후보 삭제 확인 |
| `.github/workflows/ci.yml` | 기본 full 유지, Windows cleanup 선택과 test step 한정 packaging resource 분리 |
| `.github/workflows/alhangeul-linux-gui.yml` | 기존 DEB로 HWPX PDF만 실행하는 선택, 인쇄/thumbnail 제외와 필수 증거 gate |
| `tests/gui/specs/linux-native.e2e.ts` | 273 LOC, 공개 HWPX 10쪽 PDF·검색·원본/상태 보존 시나리오 |
| `tests/gui/linux/verify-pdf-scope.mjs` 및 테스트 | 제한 실행의 필수 결과 확인, 누락/빈 실행 성공 방지 |
| 기존 workflow 계약 2개 | full/제한 분기 분리, resource 예외의 step 외부 유출 방지 |
| 기존 plans/orders·이 보고서 | 승인·실패·보정·실제 성공·잔여 위험을 구분해 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 SHA `69b22650df96323a2c59e473d474ed3195cc9cc7` 대비 apps/crates/assets/third_party/
lockfile 차이는 `#[cfg(test)]`로만 읽는 cleanup 테스트 60줄이다. 제품 runtime, 실제 Tauri
배포 설정, renderer·font·upstream pin과 설치 bytes는 바꾸지 않았다. Windows 보정은 test
step의 `TAURI_CONFIG={"bundle":{"resources":[]}}`만 추가하며 빈 DLL/EXE는 만들지 않는다.
이 예외는 패키징 검증을 대체하지 않는다. 기존 대형 workflow 계약 파일의 역할은 유지했다.

공식 문서는 승인된 기존 위치를 수정했고 새로운 manual/공식 문서를 만들지 않았다.
과거 실패와 단계 보고서는 당시 기록으로 보존한다. 승인된 원격 실행 checkpoint 예외에 따라
`0ab4745`에 최초 소스, `e401863`에 Windows 준비 보정을 게시하고 결과 보고서를 후속 커밋한다.

## 검증 결과

### 로컬 검사

최초 checkpoint 전 실행:

```sh
pnpm run typecheck:gui
pnpm run test:gui:contracts
pnpm run test:gui:linux:contracts
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
rustfmt --check apps/desktop/src-tauri/src/pdf_temp_cleanup_tests.rs
actionlint .github/workflows/ci.yml .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

GUI 계약 19/19, Linux 계약 62/62, workflow 계약 65/65, GUI typecheck·product boundary
(444 files)·Rust format·actionlint·diff 통과. full 분기 순서 assertion은 제한 분기와 구분해
보정한 뒤 통과했다. suite 간 import 중복을 합산하지 않으며 Node 검사를 실제 OS 실행으로 세지 않는다.

Windows 준비 보정 후에는 변경된 범위만 검사했다:

```sh
node --test tests/actions-workflows.test.mjs
actionlint .github/workflows/ci.yml
git diff --check
```

workflow 계약 **55/55**, actionlint·diff 통과. step-local JSON 값, 다른 단계의 override 부재,
원래 DLL/EXE mapping과 가짜 resource 생성 부재를 검사한다. 변경 없는 나머지 로컬 결과는 재사용했다.

### Windows 실제 cleanup — 보정 후 통과

```sh
gh workflow run ci.yml --ref publish/task19 -f scope=pdf-cleanup-windows
```

- [run 34064903014](https://github.com/postmelee/alhangeul-tauri/actions/runs/34064903014)
- 검증 SHA `e401863450cfd33c2f9213d644270d4c1b7ee155`
- Windows job `101571843730`, **8분 19초 통과**, 2026-09-06 22:44:46–22:53:05 UTC.
- `windows-2025`, `rustc 1.98.1 (48a229cea 2026-09-01)`. 테스트 바이너리는 현재 stable로
  컴파일했으며 기존 제품 설치본과 같은 toolchain/bytes라고 주장하지 않는다.
- 컴파일 **5분 34초**, 실제 테스트 **3.05초**. `6 passed; 0 failed; 0 ignored; 92 filtered out`.
- `windows_junctions_are_preserved_without_touching_target ... ok`를 실제 로그와 필수 grep으로
  확인했다. 최상위 junction 및 후보 안 junction 모두 reparse 속성·별도 임시 대상의 sentinel·
  내부 일반 파일을 보존했다. 정상 old 후보는 각각 삭제되어 cleanup 전체 no-op도 배제한다.
- old/recent/unknown/nested/삭제량·자식수 제한/reaper 회수까지 나머지 5개도 통과했다.
- full CI는 skipped. 제품 installer·thumbnail·PDF·updater는 실행하지 않았다.
- artifact `9998729762`, `windows-pdf-cleanup-34064903014`, 7093 bytes,
  digest `sha256:0d415617ac164bc2549974c2f61f139ec65274fabf13d16e2f57959305015beb`.
- context SHA-256 `f6ba735a7bfcbadcaee21a56c5d3dd3410bcd2bb51c8ed65feb94053de7351b7`,
  test log SHA-256 `b260b8713dd76cc5f256496af9024346a5b74eadcefea579fec326bfd7e09b15`.

최초 [run 34063975728](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063975728)은
`0ab47459d3bc7b6137722e40b15b288468301e8c`에서 6분 7초 실패했다. 에이전트가 새 제한 job의
Tauri thumbnail resource 선행조건을 놓쳐 `AlhangeulThumbnailWorker.exe` 부재로 build script가
중단한 **테스트 준비 실패**다. 당시 테스트는 미실행이며 제품 cleanup 결함으로 세지 않는다.
실패 evidence `9998431779`, digest
`sha256:200be0d85d5901d6379f1d5de3458386a1fdeb093713a56efb8e7bbb004cad3b`를 보존했다.
자동 반복 대신 후속 승인을 받아 test step만 보정하고 위 한 번의 실행으로 확인했다.

### Linux HWPX 실제 PDF — 최초 통과 재사용

- [run 34063977183](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063977183),
  harness `0ab47459d3bc7b6137722e40b15b288468301e8c`, `scope=pdf-hwpx`, **3분 13초 통과**.
- 제품 `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`의 미만료 DEB
  `9986288884`를 digest/size/inventory 확인 후 재사용했다. Ubuntu 22.04 실제 설치본이다.
- HWPX `form-002.hwpx` **10쪽/A4/한글 표제 검색/nonblank/페이지 가장자리** 통과.
  쪽별 text counts `[994,1252,1005,1029,1010,1184,971,1185,982,1132]`.
- source 전후 SHA-256 `5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4` 동일.
  title `form-002.hwpx - Alhangeul`와 current 1/total 10 보존, status만 PDF 저장 완료로 변경.
- PDF 763577 bytes, SHA-256 `5b7fea74f36666d8997b7df5bf01e2e415e1681094808922216c8adf174b2370`.
- 14개 결과 파일 size/hash를 검산하고 최초 결과 분석 때 10쪽 PNG와 앱 최종 화면을 직접 확인했다.
  이번 Windows 보정 뒤에는 Linux 실행이나 PDF 시각 검토를 반복하지 않았다.
- evidence `9998392027`, 4835076 bytes,
  digest `sha256:aa8f08b9a5c29a35ba0511b84476f8c29f0c506c2358b745c6b6f6020f4c75e1`.
- 인쇄/thumbnail 관련 7단계는 skipped. 이 제한 시나리오는 편집/재실행/덮어쓰기 시험이 아니다.

raw 증거는 `/private/tmp/alhangeul-task19-stage422.N6r0hl`의 `linux`, `windows`(실패),
`windows-corrected`(성공)에 분리했다. PDF/로그/PNG는 저장소에 커밋하지 않는다.

### #19 수용 근거 정리

| 수용 경계 | 확보한 근거 | 실행 범위의 한계 |
|---|---|---|
| 같은 snapshot 세대 | [Stage 1](task_m010_19_stage1.md)의 실제 WASM HWP 6쪽/HWPX 10쪽 전체 SVG 비교, [Stage 3](task_m010_19_stage3.md)의 변하는 live handler 대신 단일 snapshot 사용 | 고정 측정 callback/합성 handler 검사이며 실제 앱 동시 편집·46쪽 부하 미실행 |
| timeout·실패·owner·target 잠금 | [native run 34021920074](https://github.com/postmelee/alhangeul-tauri/actions/runs/34021920074)의 Windows/Linux job tests, fake-time TTL·한도, pipeline abort/dispose/다음 export | 실제 reload/5분·15분 대기·window event 통합 미실행. startup/reaper/window 연결은 코드 확인 |
| 오래된 임시 파일의 안전 회수 | 기존 Linux symlink·파일시스템 검사 + 이번 Windows junction 2형태와 sentinel/정상 삭제 | 주입 시각이며 실제 24시간 대기·앱 재시작 통합 미실행 |
| searchable PDF·원본 보존·target 교체 | [Windows 4.19](task_m010_19_stage4.19.md)의 HWP/HWPX fresh/restart 4경로·32쪽, [기존 Linux](task_m010_19_stage4.md)의 HWP 6쪽과 이번 HWPX 10쪽, native atomic/failure 검사 | Linux 새 HWPX scope는 기존 target 덮어쓰기/dirty 편집 재현이 아님. 조판 완전 동등성은 미확정 |

과거 [Stage 4 진행 보고](task_m010_19_stage4.md)의 미확보 항목은 위 추가 증거와 후속 승인된
검증 계층으로 정렬한다. 당시 문서를 성공으로 바꾸지 않는다. 사용자의 Windows 수동 성공은
보조 근거로 유지하되 정확한 SHA를 확인하지 못했으므로 exact-SHA 자동 결과와 합산하지 않는다.

결과 문서 5개의 상대 링크 51개, 보고서 필수 섹션 7개와 완료 시각·diff 검사가 통과했다.
성공 checkpoint 이후에는 plans/orders/보고서만 변경했으므로 소스 검사를 반복하지 않았다.

## 잔여 위험

- HWPX 홀수 쪽 표의 긴 문구가 우측 셀 경계에 밀착/잘리는 현상은 남는다. Linux 앱 첫 쪽의
  같은 위치에서도 관측되어 PDF만의 문제라고 단정하지 않는다. renderer/font/upstream 중
  원인은 미확정이며 수치 통과를 조판 해결이나 릴리즈 위험 승인으로 바꾸지 않는다.
- 실제 동시 편집·WebView reload·장시간 대기·앱 재시작 통합은 미실행이다. 제품 수명주기
  연결 변경이나 회수 실패가 나타나면 해당 실제 시나리오만 다시 선정해 승인받는다.
- Actions 증거에는 보존 기한이 있다. 이후 릴리즈 시 만료 여부와 제품/harness identity를
  재확인한다. 이번 결과가 모든 문서·OS 설정이나 패키징 resource 구성을 보증하지 않는다.

## 다음 단계 영향

추가 workflow 반복 없이 #19 최종 보고와 `devel` 대상 PR 준비로 진행할 수 있다.
최종 보고/PR에는 위 증거 계층과 조판 위험·미실행 한계를 유지한다. 아직 최종 보고/PR 작성,
issue close·merge·release·Pages/updater 게시를 수행하지 않았다.

## 승인 요청

Stage 4.22 결과와 검증 한계를 검토하고, #19 최종 보고/PR 단계 진행 승인을 요청한다.
