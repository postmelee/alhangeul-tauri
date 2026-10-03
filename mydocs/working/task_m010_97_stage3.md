# Task #97 Stage 3 완료보고 — Windows/Linux 설치본의 글꼴 성능과 편집 회귀

GitHub Issue: [#97](https://github.com/postmelee/alhangeul-tauri/issues/97)
구현계획서: [`task_m010_97_impl.md`](../plans/task_m010_97_impl.md)
Stage: 3
기록일: 2026-10-03 (Asia/Seoul)
상태: Stage 3 검증·증거 검토 완료, Stage 4 진입 승인 대기

## 단계 목적

v0.1.0 설치본과 조회 인덱스 개선 후보를 같은 Windows/Linux VM에서 비교한다. 글꼴 사용 여부와
renderer별 열기·입력·스크롤 응답성, 실제 face·문서 내용·저장·PDF·인쇄 관련 회귀를 확인한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| .github/workflows/alhangeul-font-performance.yml | 155줄. exact 기준/개선 파일을 같은 VM에서 순차 실행하고 설치·GUI·정리·증거를 필수화 |
| .github/workflows/alhangeul-desktop.yml | 기존 dispatcher에 비게시 font-performance mode 연결 |
| scripts/ci/font-performance-candidate.mjs | 89줄. 성공 producer·archive digest·inventory·파일 hash·기준 서명 및 의존성 검증 |
| scripts/ci/run-font-performance.mjs | 62줄. 기존 MSI install/cleanup, 원본 AppImage 및 기존 WDIO runner 순차 실행 |
| tests/gui/local-fonts/performance.ts | 153줄. WebView clock, 입력 canvas 관측, 표 셀 준비, 90-frame 스크롤, longtask 관측 |
| tests/gui/specs/local-font-performance.e2e.ts | 123줄. 실제 viewport 강제, 4문서×2renderer×on/off×5회, face·본문 확인 |
| tests/ci-font-performance.test.mjs, package.json | exact 입력·실패 거부·workflow 경계 검증을 기존 자동화 검사에 등록 |
| apps/thumbnail-handler/src/lib.rs | 승인된 한 줄 fetch_update → try_update 호환성 보정 |
| plans/task_m010_97*.md, orders/20261003.md, 본 보고서 | 단계 상태, 승인 기록, 원시 반복 표본과 증거 식별자 |

## 본문 변경 정도 / 본문 무손실 여부

제품 조회 변경은 Stage 2와 동일하다. 이 단계의 추가 제품 변경은 Rust 1.99에서 deprecated가 된
AtomicU32::fetch_update를 alias인 try_update로 바꾼 한 줄뿐이다. memory ordering·checked_sub·
반환값 처리와 썸네일 동작을 보존한다. 기존 경고 gate를 완화하지 않았다.
upstream v0.8.6 및 resolved commit f1f9c6ae58344ee9368996d3543f76b9345cf227, WASM, 글꼴 정책,
서명 키, 제품 version 0.1.0과 공개 릴리즈는 유지했다. 기존 checkout의 사용자 변경도 보존했다.
승인된 계획 보정에 따라 원격 검증 전 후보 커밋을 게시했다. 최종 단계 보고는 검증 성공 후 작성한다.

## 검증 결과

현 호스트의 플랫폼 중립 명령:

```bash
pnpm run typecheck:gui
pnpm run test:gui:contracts
pnpm run test:automation
node --test tests/gui/local-fonts/fixture.test.mjs
pnpm run check:product-boundary
git diff --check
```

- 모두 통과: GUI 계약 23개, 자동화 1,031개, 공개 fixture 3개, 제품 경계 732파일.
- 마지막 viewport 보정 이후 다시 실행했다. Rust desktop 검사·Tauri build는 Windows/Linux 원격에서만 수행했다.

| 원격 실행 | 결과와 수용 범위 |
|---|---|
| [full CI 37116980444](https://github.com/postmelee/alhangeul-tauri/actions/runs/37116980444) | success. Windows x64·Linux x64/arm64 native/core/package와 필수 전체 집계 |
| [성능 비교 37121708256](https://github.com/postmelee/alhangeul-tauri/actions/runs/37121708256) | success. 두 플랫폼의 기준/개선 설치·GUI·정리, 실제 동일 viewport 및 원시 증거 검토 |
| [Linux local-fonts 37119716779](https://github.com/postmelee/alhangeul-tauri/actions/runs/37119716779) | success. 두 renderer의 face, 재감지, 삭제/복구, 새 창·프로세스 재시작 및 roundtrip |
| [Linux full GUI 37119720929](https://github.com/postmelee/alhangeul-tauri/actions/runs/37119720929) | success. native 저장·재열기·PDF·GTK/CUPS 인쇄·취소와 편집 복원 |
| [Windows PDF 37119725535](https://github.com/postmelee/alhangeul-tauri/actions/runs/37119725535) | success. 실제 NSIS 설치본의 HWP/HWPX 편집·PDF·재시작 후 출력과 분석 |

최종 비교 dispatch 당시 publish/task97의 HEAD는 아래 harness SHA였다. 실행 입력:

```bash
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri \
  --ref publish/task97 -f mode=font-performance \
  -f build_ref=ef54ae9dd1de17a208eff6986335d23b2e7ff86b \
  -f font_performance_run_id=37116980444
```

### 정확한 source와 파일

- 기준 제품: fc3cad15682f35723ab6558d1301e9096f7eec67, v0.1.0 signed producer 36320371932.
- 개선 제품: ef54ae9dd1de17a208eff6986335d23b2e7ff86b, 성공 full producer 37116980444.
- 최종 비교 harness: 8df43960d0b2d39b278b9566d9e294e9ba86c47a, run 37121708256 / attempt 1.
- 제품과 harness SHA를 분리했다. 이후 보정은 검증 코드·문서뿐이며 CI_VALIDATION.md의 exact artifact 재사용 경계를 따른다.

| 플랫폼/제품 | artifact ID | archive digest | 설치 파일 SHA-256 |
|---|---|---|
| windows/baseline | 10933208421 | sha256:fbd15d72bcf126e3a22947f3a1ece3779291a768404c50e8fb94202abb07a091 | 1901d255f3a1295fc007cb45f934cd602ea3b4573ea975d24abee30ea4140b68 |
| windows/improved | 11272766261 | sha256:841a91135bd20cc6632253e1237b9683486d42bbfea06dbfa63c084622c6c4fd | 50db0652f5adb54d86bc066a5cb2209414f4f3d7298cf4b0985c5b94fdede5d4 |
| linux/baseline | 10933550939 | sha256:59aa3cd56a7dd0bf31a8107bf31a5a283439dd9ac5f6e0c1a7ee2f4bd89e34d6 | 5cbca61889d8689bf210c037c728447416a6fba1fe8289649823eca6776523a2 |
| linux/improved | 11272516829 | sha256:e2b3c0026c3f998342604f21335aa0de61c10993fcf3c65b377b244e1b4cc6d9 | acff3a7d753738de1977eacb84f0272c5bc8a3c9f209bec5506a66d03dac6551 |

기준 archive의 서명을 검증했다. 개선 성능 후보는 unsigned native artifact이며 최종 공개 파일이 아니다.
Windows MSI 설치/제거는 기준·개선 모두 Status=passed, ExitCode=0이다. WebView2 정책은 restored=true다.
Linux는 /dev/fuse가 있는 환경에서 원본 AppImage를 실행했다. extract 방식으로 제품을 대체하지 않았다.

| 성능 증거 | artifact ID | archive digest |
|---|---|---|
| windows-x64-37121708256 | 11274266070 | sha256:6a82d5410f7df7275ac7465686207323138933792cf9ba339fc34b6767eaa44a |
| linux-x64-37121708256 | 11274195825 | sha256:73c64783b86e10b521283270db0d1ab7ec247d19060c4b1f2fd963042a87f3ac |

### 측정 조건

| 환경 | Windows x64 | Linux x64 |
|---|---|---|
| 실행 | windows-2025, kernel 10.0.26100, MSI | ubuntu-22.04, kernel 6.8.0-1064-azure, AppImage |
| CPU/메모리 | AMD EPYC 7763, 논리 CPU 4, 17,174,360,064 bytes | AMD EPYC 7763, 논리 CPU 4, 16,765,411,328 bytes |
| WebView | WebView2 153.0.4234.48 | WebKitGTK 2.50.4-0ubuntu0.22.04.1, Xvfb/Openbox X11 |
| 실제 viewport/DPR | 기준·개선 모든 configuration 1280×900 / 1 | 동일 |
| 감지 목록 | 기준·개선 83개 | 기준·개선 32개 |
| longtask API | 지원 | 미지원; 0개 관측을 지연 없음으로 해석하지 않음 |

- 각 플랫폼 내 같은 VM에서 baseline → improved 순서다. Node v24.21.0, tauri-driver 2.0.6을 사용했다.
- renderer는 Canvas2D 및 CanvasKit software로 명시했다. 모든 화면에서 요청 backend가 실제 선택됐고 fallback이 없다.
- 공개 Abel HWP/HWPX 각 1쪽, biz_plan.hwp 6쪽, form-002.hwpx 10쪽이다. 문서·WASM·parser·upstream pin은 동일하다.
- 매 조건의 첫 열기와 5회 반복을 분리했다. 4제품 실행×16문서 조건×5회로 열기·입력 표본 각 320개다.
- WebDriver를 통한 bytes 전송·표 셀 포커스 준비는 clock 밖이다. load RPC 응답 + fonts.ready + 두 frame까지 열기를 관측한다.
- 입력은 공개 textarea에 marker 문자열 전체를 한 번에 전달해 canvas 변화 + 다음 frame까지 관측한다. 단일 물리 키나 화면 출력 지연 측정이 아니다.
- PNG encoding 관측 비용도 지연에 포함된다. probe 중앙값은 Windows 4.7–9.2ms, Linux 39–71ms다. 실제 per-sample 값은 artifact에 있다.
- biz_plan 스크롤은 90-frame 동안 실제 문서 범위의 90% 이상을 내려갔다가 돌아온다. RAF 간격이며 고정 시간/속도나 GPU FPS 측정이 아니다.

### 글꼴 on의 중앙값과 범위

단위 ms. `중앙값 [최소, 최대]`이며 renderer·문서의 기준 → 개선을 비교한다.

| OS | renderer | 문서 | 열기 기준 → 개선 | 입력 기준 → 개선 |
|---|---|---|---|---|
| windows | canvas2d | abel.hwp | 461.5 [456.1, 465.8] → 331.7 [315.1, 334.5] | 413.5 [410.7, 465.3] → 20.8 [17.9, 21.6] |
| windows | canvas2d | abel.hwpx | 461.5 [437.8, 465.2] → 333.1 [322.6, 342.3] | 412.4 [410.1, 415.6] → 20.3 [17.6, 21.4] |
| windows | canvas2d | biz_plan.hwp | 5532 [5496, 6247.6] → 332.3 [329.4, 371.4] | 634.7 [620.7, 736.1] → 19.4 [18, 23.5] |
| windows | canvas2d | form-002.hwpx | 18255 [16933.2, 18704.5] → 515.7 [510.3, 525.3] | 6951.6 [6451.9, 7383.1] → 106.6 [99.9, 112.2] |
| windows | canvaskit | abel.hwp | 347.4 [339.4, 350.9] → 324.5 [319.6, 325.3] | 26.4 [24.9, 32.5] → 19.9 [16.7, 22.8] |
| windows | canvaskit | abel.hwpx | 338.6 [323.6, 346.9] → 338.5 [314.8, 342.5] | 26.3 [25.1, 39.7] → 19.1 [17.9, 20.2] |
| windows | canvaskit | biz_plan.hwp | 532.2 [442.7, 543.1] → 328.5 [320.4, 338.8] | 61.5 [57.6, 69.2] → 18.7 [17.2, 22.2] |
| windows | canvaskit | form-002.hwpx | 2368.3 [1722.1, 2449.4] → 399.5 [385.2, 402.4] | 443.5 [421.3, 458.3] → 73.7 [68.6, 83] |
| linux | canvas2d | abel.hwp | 570 [502, 611] → 516 [462, 525] | 233 [221, 243] → 103 [94, 110] |
| linux | canvas2d | abel.hwpx | 537 [496, 551] → 466 [437, 472] | 235 [223, 252] → 95 [89, 102] |
| linux | canvas2d | biz_plan.hwp | 550 [540, 631] → 455 [434, 516] | 1814 [1805, 1859] → 165 [157, 187] |
| linux | canvas2d | form-002.hwpx | 2504 [2471, 2532] → 636 [581, 708] | 2055 [2009, 5264] → 413 [235, 453] |
| linux | canvaskit | abel.hwp | 522 [481, 555] → 523 [453, 556] | 96 [91, 101] → 92 [89, 98] |
| linux | canvaskit | abel.hwpx | 481 [476, 489] → 474 [458, 497] | 88 [85, 103] → 89 [84, 92] |
| linux | canvaskit | biz_plan.hwp | 488 [476, 545] → 468 [448, 527] | 163 [122, 197] → 109 [98, 145] |
| linux | canvaskit | form-002.hwpx | 1077 [1041, 1091] → 590 [564, 618] | 285 [279, 465] → 172 [166, 302] |

Canvas2D의 대표 HWP/HWPX와 Windows CanvasKit의 대표 문서는 기준 대비 지연 범위가 명확하게 줄었다.
Linux CanvasKit의 짧은 Abel 문서처럼 차이가 작은 조건은 개선을 단정하지 않는다. off 조건도 항상 빨라지는 것은 아니다.
절대 수치는 VM·문서·조작에 종속된다. 개인 Windows 문서나 제보 장비에서 같은 비율을 보장하지 않는다.

### 첫 열기와 반복 원시 표본

단위 ms. 각 배열은 실행 순서대로 5회다. 첫 열기는 OS cache가 비워진 cold 측정이라는 뜻이 아니다.

#### windows

| renderer/설정/문서 | 첫 열기 기준/개선 | 열기 기준 5회 | 열기 개선 5회 | 입력 기준 5회 | 입력 개선 5회 |
|---|---|---|---|---|---|
| canvas2d/disabled/abel.hwp | 433.8/475.6 | 322.9, 322.5, 329.2, 325.4, 326 | 315.2, 329.7, 321.9, 324.5, 328.7 | 26.1, 18.8, 16.9, 18, 19.3 | 32, 21.5, 18.6, 20.2, 20.2 |
| canvas2d/disabled/abel.hwpx | 324.8/323.2 | 316.4, 323.3, 318.9, 324.7, 321.5 | 316.3, 329.1, 329, 318.2, 335.6 | 20.9, 16.1, 19.8, 16.3, 23.4 | 18.4, 19.9, 19.3, 16.9, 23.3 |
| canvas2d/disabled/biz_plan.hwp | 580.4/570.3 | 340.8, 354.4, 351.5, 349.7, 334.9 | 323.4, 353.6, 351.7, 355.9, 331.7 | 28.8, 25.8, 62.9, 19.1, 61 | 28.9, 26.2, 17.7, 22.3, 73.7 |
| canvas2d/disabled/form-002.hwpx | 1322.5/977.9 | 507.1, 497.8, 479.6, 495.2, 463.7 | 507.1, 492.6, 484.9, 449.6, 485.3 | 106.2, 105.5, 98.6, 97.6, 97.3 | 129.1, 110.1, 98.2, 106, 101.2 |
| canvas2d/enabled/abel.hwp | 481.3/323.8 | 465.8, 461.5, 465.4, 456.1, 460 | 315.1, 331.7, 333.6, 326.5, 334.5 | 412.2, 410.7, 465.3, 413.5, 415.8 | 19.1, 20.8, 21.1, 21.6, 17.9 |
| canvas2d/enabled/abel.hwpx | 450.1/325.7 | 450.4, 437.8, 461.5, 462.6, 465.2 | 326.3, 334.3, 322.6, 333.1, 342.3 | 410.1, 415.6, 413.9, 412.4, 411.7 | 21.4, 18.6, 21, 20.3, 17.6 |
| canvas2d/enabled/biz_plan.hwp | 5631.8/416.3 | 5506.7, 5886.5, 5496, 5532, 6247.6 | 355.2, 371.4, 331.7, 329.4, 332.3 | 623.7, 634.7, 620.7, 736.1, 693.2 | 18.5, 21.9, 18, 23.5, 19.4 |
| canvas2d/enabled/form-002.hwpx | 19363.3/774.6 | 18466.6, 17824.9, 18704.5, 18255, 16933.2 | 518.6, 510.3, 515.3, 515.7, 525.3 | 6951.6, 7383.1, 7033.1, 6708.5, 6451.9 | 106.6, 112.2, 102.3, 99.9, 110.4 |
| canvaskit/disabled/abel.hwp | 1086.1/888.2 | 323, 323.4, 331.5, 316.7, 328.8 | 325.1, 331.5, 319.2, 324.8, 324.2 | 20.2, 19.8, 17.5, 17, 17.8 | 17.5, 15.9, 19.8, 19.6, 19.7 |
| canvaskit/disabled/abel.hwpx | 323.5/322.5 | 317.7, 334, 337.1, 327.4, 340.9 | 324.2, 324.8, 341.9, 337.6, 326.1 | 17.5, 18, 18, 20.4, 17.2 | 18.3, 19.3, 15.6, 20, 18.7 |
| canvaskit/disabled/biz_plan.hwp | 401.2/388.6 | 325.3, 322.2, 324.3, 335.7, 328.5 | 324.7, 323.5, 331, 332.6, 328.8 | 28.7, 19.9, 19.7, 19.5, 20.7 | 19.4, 24.2, 18.5, 21.2, 18.5 |
| canvaskit/disabled/form-002.hwpx | 853.0/792.1 | 433.6, 416.6, 415.9, 423.3, 431.5 | 418.4, 424.9, 416.3, 408, 424.8 | 77.2, 71.5, 69.9, 72, 68.5 | 82.8, 71.1, 75.9, 62.2, 68.9 |
| canvaskit/enabled/abel.hwp | 792.2/690.7 | 339.4, 347.5, 350.9, 347.4, 339.9 | 325.3, 324.2, 324.5, 319.6, 324.7 | 32.5, 24.9, 25.3, 31.4, 26.4 | 19.9, 16.7, 22.8, 20.6, 19.5 |
| canvaskit/enabled/abel.hwpx | 323.2/317.3 | 323.6, 345.2, 327.5, 338.6, 346.9 | 314.8, 336.7, 338.5, 342.5, 341.8 | 27.4, 26.3, 39.7, 25.1, 25.5 | 18.1, 19.2, 20.2, 17.9, 19.1 |
| canvaskit/enabled/biz_plan.hwp | 594.3/407.9 | 543.1, 442.7, 497.3, 535, 532.2 | 320.4, 327.5, 338.8, 331.3, 328.5 | 59.3, 57.6, 61.5, 69.2, 65.5 | 22.2, 18.7, 19.5, 17.2, 17.5 |
| canvaskit/enabled/form-002.hwpx | 2155.9/729.2 | 1776.3, 2389.2, 1722.1, 2368.3, 2449.4 | 385.2, 402.4, 402.3, 399.5, 399.5 | 455.9, 421.3, 443.5, 458.3, 425.5 | 83, 71, 73.7, 68.6, 76.3 |

#### linux

| renderer/설정/문서 | 첫 열기 기준/개선 | 열기 기준 5회 | 열기 개선 5회 | 입력 기준 5회 | 입력 개선 5회 |
|---|---|---|---|---|---|
| canvas2d/disabled/abel.hwp | 829.0/594.0 | 495, 478, 487, 491, 380 | 554, 534, 520, 473, 431 | 108, 94, 92, 90, 95 | 131, 102, 89, 88, 90 |
| canvas2d/disabled/abel.hwpx | 423.0/412.0 | 425, 426, 436, 406, 417 | 420, 419, 407, 412, 387 | 102, 91, 98, 88, 89 | 104, 89, 93, 87, 90 |
| canvas2d/disabled/biz_plan.hwp | 664.0/654.0 | 437, 545, 533, 472, 439 | 448, 527, 490, 469, 478 | 169, 223, 194, 166, 163 | 156, 233, 177, 154, 152 |
| canvas2d/disabled/form-002.hwpx | 1543.0/1284.0 | 699, 668, 661, 629, 613 | 670, 642, 621, 611, 582 | 413, 259, 256, 257, 470 | 427, 378, 237, 249, 232 |
| canvas2d/enabled/abel.hwp | 516.0/486.0 | 570, 597, 611, 556, 502 | 494, 522, 516, 525, 462 | 233, 243, 239, 225, 221 | 109, 110, 103, 95, 94 |
| canvas2d/enabled/abel.hwpx | 539.0/439.0 | 551, 538, 496, 537, 505 | 456, 466, 472, 469, 437 | 225, 235, 252, 235, 223 | 102, 98, 95, 89, 92 |
| canvas2d/enabled/biz_plan.hwp | 747.0/541.0 | 550, 583, 631, 540, 543 | 434, 444, 516, 479, 455 | 1827, 1859, 1814, 1810, 1805 | 165, 180, 187, 157, 163 |
| canvas2d/enabled/form-002.hwpx | 3145.0/1014.0 | 2471, 2532, 2503, 2504, 2506 | 708, 666, 636, 589, 581 | 2186, 5264, 2036, 2009, 2055 | 413, 235, 442, 453, 251 |
| canvaskit/disabled/abel.hwp | 1159.0/1150.0 | 507, 467, 489, 488, 427 | 507, 481, 497, 481, 399 | 99, 91, 98, 100, 94 | 96, 92, 87, 93, 84 |
| canvaskit/disabled/abel.hwpx | 428.0/424.0 | 409, 425, 415, 398, 415 | 442, 430, 430, 406, 432 | 85, 82, 84, 86, 97 | 82, 89, 83, 84, 88 |
| canvaskit/disabled/biz_plan.hwp | 526.0/523.0 | 461, 469, 508, 471, 462 | 473, 486, 529, 478, 462 | 109, 127, 128, 97, 108 | 123, 138, 125, 108, 100 |
| canvaskit/disabled/form-002.hwpx | 1079.0/1141.0 | 607, 587, 576, 555, 559 | 647, 588, 552, 518, 531 | 288, 163, 173, 183, 170 | 341, 171, 155, 185, 167 |
| canvaskit/enabled/abel.hwp | 1162.0/1110.0 | 513, 522, 555, 534, 481 | 556, 523, 531, 514, 453 | 97, 94, 101, 96, 91 | 95, 98, 90, 92, 89 |
| canvaskit/enabled/abel.hwpx | 502.0/492.0 | 476, 489, 481, 481, 480 | 497, 474, 489, 458, 465 | 103, 87, 85, 88, 90 | 84, 89, 90, 92, 89 |
| canvaskit/enabled/biz_plan.hwp | 593.0/592.0 | 477, 488, 545, 520, 476 | 448, 468, 527, 518, 449 | 163, 197, 187, 122, 150 | 109, 133, 145, 107, 98 |
| canvaskit/enabled/form-002.hwpx | 1599.0/1124.0 | 1091, 1066, 1081, 1077, 1041 | 618, 597, 590, 564, 571 | 465, 279, 285, 291, 282 | 302, 172, 166, 172, 171 |

### 스크롤 관측

각 trial의 90개 간격에서 nearest-rank P95 및 최대값을 구했다. 표의 P95는 trial 5개의 중앙값이다.
마지막 두 열은 각 trial의 최대 간격 5개다. 평균 FPS로 변환하지 않는다.

| OS | renderer/설정 | P95 중앙값 기준/개선 | 최대 간격 기준 5회 | 최대 간격 개선 5회 |
|---|---|---|---|---|
| windows | canvas2d/disabled | 31.2/31.2 | 125, 46.9, 46.9, 31.3, 46.9 | 93.7, 46.9, 31.3, 31.3, 31.3 |
| windows | canvas2d/enabled | 1984.4/31.2 | 5328.2, 5390.6, 6046.9, 6093.9, 5890.7 | 78.1, 46.9, 46.9, 47, 46.8 |
| windows | canvaskit/disabled | 15.7/15.7 | 31.3, 15.7, 15.7, 15.7, 15.7 | 31.2, 31.3, 15.7, 15.7, 15.7 |
| windows | canvaskit/enabled | 109.4/15.7 | 453.2, 437.5, 421.9, 421.9, 421.9 | 31.1, 15.7, 15.8, 15.7, 15.7 |
| linux | canvas2d/disabled | 44/53 | 248, 183, 181, 178, 178 | 232, 180, 170, 173, 179 |
| linux | canvas2d/enabled | 45/42 | 2106, 2079, 2070, 2069, 2061 | 207, 196, 179, 175, 189 |
| linux | canvaskit/disabled | 59/51 | 79, 131, 106, 89, 101 | 124, 109, 103, 86, 91 |
| linux | canvaskit/enabled | 42/55 | 271, 331, 256, 244, 249 | 83, 118, 104, 79, 83 |

Windows on/Canvas2D의 trial 최대 간격 중앙값은 5,890.7→46.9ms, on/CanvasKit은 421.9→15.7ms다.
Linux on/Canvas2D는 2,070→189ms, on/CanvasKit은 256→83ms다. 빈번한 짧은 간격과 드문 큰 멈춤을 구분한다.

### 감지 설정과 longtask 보조 관측

설정 시간은 WebDriver click·대기·화면 동작을 포함하는 조건당 1회 wall 시간이다. 순수 catalog 시간이나 반복 중앙값이 아니다.

| OS | renderer/설정 | 설정 wall ms 기준/개선 |
|---|---|---|
| windows | canvas2d/disabled | 196/226 |
| windows | canvas2d/enabled | 3976/277 |
| windows | canvaskit/disabled | 251/158 |
| windows | canvaskit/enabled | 286/266 |
| linux | canvas2d/disabled | 757/192 |
| linux | canvas2d/enabled | 949/184 |
| linux | canvaskit/disabled | 174/183 |
| linux | canvaskit/enabled | 271/274 |

Windows on의 longtask는 첫 열기·snapshot·반복 조작·내보내기 전체 구간의 보조 관측이다. 입력만의 합계가 아니다.

| renderer/문서 | longtask 개수 기준/개선 | duration 합계 ms 기준/개선 |
|---|---|---|
| canvas2d/abel.hwp | 11/0 | 3068/0 |
| canvas2d/abel.hwpx | 11/0 | 2940/0 |
| canvas2d/biz_plan.hwp | 62/20 | 184872/1116 |
| canvas2d/form-002.hwpx | 28/28 | 199946/2696 |
| canvaskit/abel.hwp | 3/3 | 272/221 |
| canvaskit/abel.hwpx | 0/0 | 0/0 |
| canvaskit/biz_plan.hwp | 66/0 | 11035/0 |
| canvaskit/form-002.hwpx | 40/13 | 17666/872 |

### 실제 화면·내용과 기능

- 각 제품·OS의 16조건 첫 페이지 PNG를 SHA-256으로 대조했다. 동일 OS/조건의 기준·개선 16쌍 모두 byte-identical이다.
  개선본 화면 32개를 읽었으며 최종 run의 PNG는 앞서 검토한 run 37120738635와도 모두 동일하다.
- Abel on에서는 HWP/HWPX, Canvas2D/CanvasKit 모두 FontFace loaded 및 off와 다른 페이지 pixels를 확인했다.
  on의 CSS 표본 폭 628.09375px와 CanvasKit localTypefaceCount>0, unregisteredFontFallbacks=0을 보존했다.
- 모든 입력 trial 뒤 실제 export bytes를 bundled HwpDocument로 읽어 marker 본문을 확인했다. HWP/HWPX parser mock으로 대체하지 않았다.
- Linux local-fonts는 34개 관찰을 기록했다. 재감지·삭제/복구와 두 renderer의 새 창·사용/미사용 프로세스 재시작을 확인했다.
  복구 후 활성화 페이지 hash가 원래 활성화 페이지와 같고 HWP/HWPX roundtrip의 본문·Abel 이름을 유지했다.
- Linux full GUI는 6쪽 HWP/10쪽 HWPX native 저장·재열기, 새 문서 입력·저장·재열기, drag-in 및 PDF를 통과했다.
  GTK print-to-file·인쇄 취소·CUPS-PDF와 편집 화면 복원을 통과했다. 직접 PDF 6+10쪽, 인쇄 PDF 6+6쪽, 새 문서 PDF 1쪽의 PNG 29개를 읽었다.
- Windows PDF는 NSIS 설치본에서 편집·fresh/restart HWP 6쪽과 HWPX 10쪽을 확인했다. 페이지 수·한글·입력 marker가 유지됐다.
  fresh/restart의 16개 페이지 PNG는 대응 페이지별로 모두 동일했다. 중복을 제거해 모든 페이지를 읽었다.
- 기존 renderer 간 checkbox/metric 차이와 긴 표 셀의 일부 경계 clipping은 개선 전후 첫 페이지에 동일하다.
  특정 Hancom 원본과의 완전한 시각 fidelity나 모든 한글 face 수용으로 확대하지 않는다.

| 기능 증거 | artifact ID / digest |
|---|---|
| Linux local-fonts | 11272254357 / sha256:c9872c5209110d44498092c0ac09039fee098e4fc264d589f0c95e2135dca019 |
| Linux full GUI | 11273156953 / sha256:6a647d34aaae3cc83184889ece1c9142d456685106538268e75e66afc2b95384 |
| Windows PDF raw | 11272938093 / sha256:724b22544004d7a1d64e4af9b34c33a650b56fcf8b532bf5235508d7875a825c |
| Windows PDF analysis | 11272788573 / sha256:a7ff8f8b2a28f99899b9dbbb6e404abf16cedd0624c694be0d5a725c2f59628d |

### 실패 기록과 보정

- full 37114851835는 Windows Rust 1.99 deprecated 경고로 failure였다. 부분 Linux 성공을 full 성공으로 쓰지 않았다.
  [공식 Atomic 문서](https://doc.rust-lang.org/std/sync/atomic/struct.Atomic.html)의 alias 관계를 확인하고 승인된 한 줄 보정 후 새 full 37116980444를 성공시켰다.
- 비교 37119712473은 미지원 tauri-driver --version 호출로 앱 실행 전 실패했다. 기존 cargo install --list 방식으로 보정했다.
- 비교 37120027655는 Windows PowerShell 모듈 환경과 Linux 표 입력 위치 문제로 실패했다.
  37120421436은 Windows 설치는 성공했지만 두 플랫폼의 표 입력 pixels 대기로 실패했다. 기존 powershell shell·실제 표 셀 클릭으로 보정했다.
- 비교 37120738635는 두 job success였으나 Windows baseline 1028×769 / improved 1280×900을 확인해 동일 조건 수용을 보류했다.
  앱 준비 후 크기 지정과 매 configuration viewport assertion을 추가했다. 최종 37121708256은 모든 조건 1280×900으로 성공했다.
- 원시 JSON의 acceptance=unverified는 자동 실행만으로 사람의 화면 수용을 선언하지 않는 계약이다.
  이 보고서의 수용은 원시 bytes·조건·face·내용·페이지를 별도로 검토한 결과다.

## 잔여 위험

- 제보된 Wayland/WebKitGTK 2.52·하이브리드 GPU 장비와 작업지시자의 개인 Windows 문서는 직접 재현하지 못했다.
  CPU 80%만으로 GPU 우회/DMABUF 원인을 확정할 수 없다. 이번 결과는 공통 글꼴 조회 코드 병목의 실제 재현과 개선이다.
- hosted X11 및 CanvasKit software 결과는 Wayland DMABUF 비교나 GPU 하드웨어 렌더링 수용이 아니다. GPU 환경변수는 강제하지 않았다.
- 일반 MSI lifecycle raw passed와 full gate success를 모든 설치 시나리오의 raw 성공으로 혼동하지 않는다.
  NSIS thumbnail은 기존 0x80040154 진단 계약만 통과했다. MSI forced reinstall은 3010/reboot-required이며 재부팅 후 결과는 미검증이다.
- 실제 face 공급 fixture는 공개 Latin Abel이다. NanumSquare native name/alias와 adapter 회귀는 full CI에서 통과했지만 개인 한글 폰트 전체 화면 수용을 뜻하지 않는다.
- 성능 후보는 version 0.1.0의 unsigned bytes다. v0.1.1 metadata·새 signed bytes·공개 패키지 6종 exact-file 설치 수용은 Stage 4에 남아 있다.
- Actions artifact 보존 기간은 14일이다. 주요 반복 표본과 정확한 식별자는 본문에 보존했으며 전체 frame/probe/로그는 해당 artifact에 있다.

## 다음 단계 영향

- [구현계획서의 Stage 4 보정안](../plans/task_m010_97_impl.md#stage-4-진입-때-함께-검토할-보정안--새-릴리즈-후보의-exact-file-수용-승인-대기)을 함께 검토한다.
- v0.1.0 baseline 상수·기본 동작을 보존하고 새 version/source/run/artifact/package hash의 검증 입력만 추가한다.
  기존 dispatcher·Windows/Linux/Fedora 수용 경로에 연결하고 실패/누락/서명/파일 불일치를 거부한다.
- 제품 metadata 0.1.1, 기존 docs/architecture/LOCAL_FONTS.md의 조회 인덱스·무효화 계약을 최소 반영한다.
- 새 full 및 signed 후보를 만들고 NSIS/MSI, AppImage/DEB/RPM x64, DEB arm64의 실제 공개 bytes를 설치·실행·저장·재열기 수용한다.
- 최종 보고·devel PR, 이후 release PR·main source 확정·Release read-back·사이트/Pages 전달은 후속 승인 게이트를 따른다.

## 승인 요청

- Stage 3 산출물·실제 성능 및 기능 수용과 위 잔여 제한을 검토하고 Stage 4 진입을 승인받는다.
- 기존 Stage 4와 exact-file 후보 입력화 보정 범위를 함께 승인받는다. 현재 Stage 4 소스 수정·version 변경·PR·공개 배포는 미수행이다.
