# Task #76 Stage 3 — 설치본 검증과 Windows 최종 점검 인계

GitHub Issue: [#76](https://github.com/postmelee/alhangeul-tauri/issues/76)
구현계획서: [task_m010_76_impl.md](../plans/task_m010_76_impl.md)
Stage: 3

## 단계 목적

v0.8.6 core·Studio·WASM 통합 설치본을 Windows/Linux CI와 Linux x64 실제 GUI에서 검증하고 Windows 사용자가 최종 점검할 동일 설치본을 인계한다.

## 산출물

| 경로 | 변경 요약 |
|---|---|
| Rust preview·COM 테스트 fixture, thumbnail manager probe | v0.8.6이 식별하는 손상 HWPX로 fallback 조건 복구 |
| tests/gui/support·linux/native-ui·specs | public ready 초기화, radio select/readback, 단일 drag 전달 관측, chooser 단일 제출, 새 문서 저장/PDF |
| docs/operations/WINDOWS_FONT_ACCEPTANCE.md | exact Windows ZIP·NSIS 해시, 무료 글꼴/공개 문서 링크와 필수 9개 점검 |
| docs/architecture/UPSTREAM.md·WINDOWS_THUMBNAILS.md | 수용 범위·과거 기준선 구분·upstream preview 실효 상한 |
| 계획·오늘할일·최종 보고 | 성공·실패 원시 범위와 인계 근거 |

## 본문 변경 정도 / 본문 무손실 여부

upstream submodule은 읽기 전용으로 유지했다. 제품 renderer나 Abel 폭 보정을 변경하지 않았고 로컬 글꼴 목록 UI도 추가하지 않았다. 최종 제품 source 이후 변경은 검증 harness·fixture·문서뿐이며 product directories, pin, dependency lock은 동일하다. 기존 실패 기록을 보존한다.

## 검증 결과

### 출처와 설치본

- 제품 SHA: `02388f59e88efbf37514894a28a69466bcde9a8b`.
- [full producer 36229142460](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460): Windows x64·Linux x64/arm64 core/native/Clippy/build·패키지 검증 success.
- full 당시 automation 970·upstream 39·Studio 235 통과. 최종 harness의 플랫폼 중립 automation은 977/977 통과, `typecheck:gui`·pin·제품 경계·diff 검사 통과. GUI Linux 계약 68개는 automation에 포함되므로 합산하지 않는다.
- [Windows artifact 10902469644](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460/artifacts/10902469644): ZIP `420c5b51ca4e38f7eb6010824c4b277aeb3d2396af2184dbcf87aa46e43bd84d`. 실제 archive와 내부 파일 4개의 크기·SHA256·inventory·source SHA를 대조하고 desktop artifact 검증기를 통과했다.
- NSIS `nsis/Alhangeul_0.1.0_x64-setup.exe`: `ee70185e47ab59a00904e5b9b9bbd97ebb16b85e2dcdf75b7f835b229ea6afb9`.
- Linux x64 [artifact 10902705329](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460/artifacts/10902705329): ZIP digest `c8f0243f4b13c4e8b3ef56f4ce989fc1eed0b72da28dbeb2638cc8aa996a5e2f`, 설치한 DEB `996c8b969a5da7a5186c7edbc32e46584753ce9464d007f8d9cac8219632147e`. GUI artifact handoff·inventory·설치 단계에서 같은 bytes를 검증했다.
- Linux arm64 [artifact 10902595215](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460/artifacts/10902595215): ZIP digest `9463638a35440b76462a92231a690d3cef3f117995e9e3ab2a559e61770bc795`. 두 Linux architecture의 DEB/RPM 설치·재설치·제거·복구 계약도 통과했다. arm64 GUI는 미실행이다.

### Linux 실제 GUI

| 실행 | 제품 / harness | 결과와 증거 |
|---|---|---|
| [전체 36277021792](https://github.com/postmelee/alhangeul-tauri/actions/runs/36277021792) | 제품 `02388f59`, harness `0bd29211c819205925b5b596c53edb81fc1e8a18` | success, WebDriver 7/7, nativePrint=0, 모든 step success |
| [글꼴 36273643047](https://github.com/postmelee/alhangeul-tauri/actions/runs/36273643047) | 제품·harness `02388f59` | success, Canvas2D/CanvasKit Abel 직접 공급·재감지·삭제/복구·새 창·재시작 |

전체 GUI artifact `10916948891` ZIP SHA256은 `cc5ea9cf017787920a0845dbb55562e4d0038fb5965c9239cab9827ac5440cc9`다. 실제 ZIP·workflow context·시나리오 참조 파일 61개의 크기/hash를 대조했다. 8개 scenario manifest가 모두 success이며 system print는 별도 실행이므로 WebDriver 7개와 구분한다.

- HWP/HWPX 파일 선택·native Save As·현재 저장·재열기 통과.
- 새 문서 입력 → HWP 저장/재열기 → PDF의 정확한 marker 보존 통과(1쪽, textCount 43).
- drag READY→STARTED→DATA→FINISHED, form-002.hwpx identity·10쪽 통과.
- 직접 HWP PDF 6쪽, HWPX 10쪽; GTK Print to File·CUPS 각 6쪽. A4·제목·쪽별 텍스트·nonblank 자동 판정과 취소·편집기 복원 통과.
- 최종 실행의 새 문서 PDF 1쪽, 직접 HWP 3쪽, CUPS 3쪽, HWPX 10쪽을 대표 이미지로 판독했다. marker·한글 본문/표·문서 구조가 보존됐다. 모든 글꼴·모든 페이지의 시각적 동일성을 뜻하지 않는다.
- Nautilus/Thunar 실제 HWP/HWPX 첫 render·cache 재사용·문서 변경 후 재생성 통과. realUse 호출은 두 manager 모두 각 형식 2→2→4이며 실패 fixture의 success PNG는 0이다.

글꼴 GUI artifact `10916865310` ZIP SHA256은 `546d72178d374d11dc2b22bae9937bce4a5a2a6643a159ede7563348d8790931`이다. 같은 DEB를 검증했고 화면 24개·process restart 6회·새 창 4개를 관측했다. 두 renderer의 설치 전/후 대표 4개 페이지에서 Abel glyph 변화와 본문 보존을 판독했다. CanvasKit localTypefaceCount 1→0→1, HWP/HWPX 저장본 Abel 이름 보존도 확인했다. raw observations의 `unverified` 표시는 관측기 기본값으로 유지하며 이 보고서에 별도 판독 결과를 둔다. Windows 나눔스퀘어의 최종 수용을 대신하지 않는다.

### 실패 기록과 보완

| 실행 | 실패와 후속 보완 |
|---|---|
| 36225178661 (cancelled) | core 명세 old pin, HWPX 식별 항목 없는 preview fixture. 출력/bytes 확인 후 pin·fixture 보완 |
| 36225908122 (failure) | 단순 text XML이 빈 문서로 수용됨. 실제 parser가 거부하는 불일치 닫는 태그 사용 |
| 36227541535 (failure) | Windows COM BMP fixture에도 HWPX 항목 누락. 네 번째 helper 보완; 후속 mutex poison도 해소 |
| 36273638799 (failure) | 초기화/스킨 경쟁, radio click capability 불일치, shell preview fixture 누락. ready RPC·select/checked·HWPX fixture 보완 |
| 36275362102 (failure) | drag FINISHED에 DATA 없음. 단일 gesture에 STARTED/DATA 관측 barrier 추가 |
| 36276264694 (failure) | drag 통과, Open File chooser 종료 실패와 다음 저장 검사 영향. entry activate+버튼의 이중 제출을 단일 고유 활성 버튼 제출로 정리 |

최종 전체 실행은 위 실패를 소급 통과시키지 않는 새 증거다. 상세 artifact/hash·최소 재현·가설의 한계는 구현계획서에 남겼다. 마지막 로컬 전체 계약 검사에서 진단 경로의 host `dirname` 사용 1건을 잡아 `posix.dirname`으로 보정했고 977개가 통과했다. 두 함수는 검증 대상 Linux에서 같으며 product/gesture/dialog 코드는 바뀌지 않아 실제 GUI 성공 증거를 재사용한다. macOS에서 native 빌드는 수행하지 않았다.

## 잔여 위험

- Windows MSI lifecycle 원시는 실제 passed. NSIS 원시는 failure 12건(0x80040154), lifecycle passed·thumbnail not-accepted로 hosted 진단 계약만 통과했다. MSI forced reinstall은 3010/reboot-required·post-reboot-unverified다. 이 제한을 전체 Windows Shell 수용으로 승격하지 않는다.
- Windows 최종 실제 글꼴·문서 점검은 사용자 결과 대기다. Linux arm64/RPM GUI·실제 프린터·모든 글꼴/문서를 수용하지 않았다.
- 공개 release, tag, 서명, updater, Pages 게시를 수행하지 않았다.

## 다음 단계 영향

최종 PR에 자동 후보 #78 이력을 포함해 devel에 반영하고 Windows 안내/설치본을 인계한다. 사용자는 나눔스퀘어·Abel을 유지한 채 재감지·실제 표시·새 창/재시작·저장/재열기·새 문서·PDF/인쇄를 확인한다. 그 결과는 #69에서 후속 릴리즈 준비 수용으로 반영한다.

## 승인 근거

2026-09-26 사용자의 순차 진행 승인에 따라 Stage 3 보고·PR 반영·Windows 인계를 진행한다. Windows 수동 결과와 공개 릴리즈 승인은 별도로 남긴다.
