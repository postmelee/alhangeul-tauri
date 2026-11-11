# Task #126 Stage 3 — 실제 게시 파일과 노트 수용

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md) · Stage 3

## 단계 목적

Stage 2에서 고정한 실제 설치 파일 6종을 지원 환경에 설치하고 문서·해당 GUI 검증을 완료한다. GitHub Release에 올릴 bytes와 본문을 확정한다.

## 산출물

입력·원문은 [Stage 3.1](task_m010_126_stage3.1.md)의 `cf8e3f7d83f578119d3eaf6d6d238d5b699bb027`에 고정했다. 아래 모든 수용 실행의 harness도 이 SHA다. 제품 source는 `bcb892d49a9003615f3acd980babd71e59e147dd`, 일반 producer `42996821567`, 서명 producer `42996892999`다.

| 검증 | run | 결과 |
|---|---|---|
| 서명 NSIS·MSI·AppImage | [43014348295](https://github.com/postmelee/alhangeul-tauri/actions/runs/43014348295) | Windows 2025 x64 / Ubuntu 22.04 x64, 세 job 및 전체 success |
| DEB x64 전체 GUI | [43014353293](https://github.com/postmelee/alhangeul-tauri/actions/runs/43014353293) | Ubuntu 22.04 x64, 전체 success |
| RPM 실제 Fedora VM | [43014483197](https://github.com/postmelee/alhangeul-tauri/actions/runs/43014483197) | Fedora 44 x64 QEMU/KVM·Xfce X11, 전체 success |
| DEB arm64 | [43015977384](https://github.com/postmelee/alhangeul-tauri/actions/runs/43015977384) | Ubuntu 24.04 arm, 실제 aarch64, 전체 success |
| fast 계약 | [43014690142](https://github.com/postmelee/alhangeul-tauri/actions/runs/43014690142) | Node/Studio·Windows PS success |

| 수용 archive | ID | SHA-256 |
|---|---:|---|
| alhangeul-final-appimage-43014348295 | 13852876207 | `a6c29df34f81f735afa3b02fa4f5c0b81a0c3bbcf2064c61b664a3b4e01fcb00` |
| alhangeul-final-msi-43014348295 | 13852462258 | `12a67844d0c605611639b7abf224dc00f82c782152e553784503a6577d7fde90` |
| alhangeul-final-nsis-43014348295 | 13851704728 | `5675713132fc442c5d773ac7739f824b3545bd587901724ecc30c9d46c47d32e` |
| alhangeul-linux-gui-43014353293 | 13853485320 | `43248198cbd4f4fd894ccfba66cb02c41ddc75da63076b96d9a4fff4d5be1bbc` |
| alhangeul-final-rpm-vm-43014483197 | 13852199158 | `58335fee7b8dbc793d2091d5a37c1a283443194b9473dfe4a463997aa2af2de7` |
| alhangeul-final-arm64-43015977384 | 13852469819 | `df081e1f3f624b5a5628d84f8a38ceda026f1387c9ad2f620ac05d7413813dfa` |

## 본문 변경 정도 / 본문 무손실 여부

Stage 3.1의 candidate와 draft 노트 원문을 그대로 사용했다. 기존 제품 코드·키·endpoint·공개 v0.1.2 데이터는 변경하지 않았다. 본 보고서만 추가한다.

## 검증 결과

- 각 수용 archive SHA-256과 API digest 일치. context/identity의 product·harness·producer·candidate archive/file hash를 Stage 2 입력과 대조했다. 생성 문서·화면 파일의 실제 bytes를 evidence.json의 크기·SHA-256과 대조했다.
- NSIS/MSI: 설치·실제 GUI·정리·시험용 WebView 정책 복원 모두 success. AppImage: 원본 FUSE 실행이며 파일/부모 폴더 writable. 이 단계는 실제 production 업그레이드 시험이 아니다.
- 세 서명 설치본에서 HWP/HWPX native Save As, 편집 후 현재 파일 저장, 프로세스 재시작, 재열기, 원본 fixture 보존 성공. 각각 문서/글꼴 구성 16개·입력/스크롤 표본 80개를 기록했다.
- 글꼴 관측의 실제 backend는 각 설치본에서 Canvas2D 14개, CanvasKit 2개다. 전자는 명시적 Canvas2D 선택과 폴백을 포함한다. 실제 CanvasKit은 글꼴 활성 Abel fixture 2개다. performance.json의 acceptance=unverified를 유지하며 성능 향상이나 전 구성 CanvasKit 통과로 쓰지 않는다.
- 새 signed mode는 문서·글꼴 시험을 실행하며 ordinary 전용 PDF Worker/Windows system print spec은 실행하지 않는다. 해당 기능의 [Task #122 일반 후보 42936058653](https://github.com/postmelee/alhangeul-tauri/actions/runs/42936058653) 및 [Windows 직접 PDF 42930152006](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930152006)은 제품 코드·의존성 무변경 근거로 재사용한다. 이전 제품 SHA와 새 게시 파일 SHA를 혼동하지 않는다.
- Linux DEB: step-outcomes의 14개 항목 모두 success, nativePrint=0/webdriver=0. 문서 2종, native 저장/drag-in, 새 문서, 직접 PDF 2종, 시스템 인쇄의 8개 scenario 성공.
- Linux PDF: HWP direct/GTK/CUPS 각 6쪽, HWPX direct 10쪽, 새 문서 1쪽, 제목 텍스트 확인. CI 원본 렌더링 전체 29쪽을 검토해 표·한글·머리말·쪽 번호와 페이지 경계를 확인했다. 검토용 시트는 원본을 보존한 채 축소 배치했다.
- Nautilus/Thunar의 실제 HWP/HWPX 사용·캐시/변경 관측과 실패 fixture에 성공 PNG가 생기지 않음을 확인했다. Fedora 파일 관리자 썸네일 전체 수용으로 확대하지 않는다.
- Fedora: exact RPM 전송·설치, HWP/HWPX 편집 저장·재시작·재열기 성공, 실제 프로세스 종료 4건과 VM cleanup 확인.
- arm64: installed package `alhangeul arm64 0.1.3`, GUI architecture aarch64. 문서 2종·실제 프로세스 종료 4건 성공. 마지막 API 504는 증거 조회만 재개해 회복했고 CI 재실행은 하지 않았다.
- 대표 NSIS/MSI/AppImage/Fedora/arm64 재열기 화면을 확인했다.
- fast: automation 1370/1370, upstream 39/39, Studio 290/290; Windows notes 124/124, 추가 Node 계약 88/88 및 PowerShell 격리 회귀 성공. 빌드/타입·경계 검사도 해당 fast job에서 성공했다.
- Stage 3.1의 notes 계약 124/124, candidate 5종, Pages source=19/output=23을 인계한다. 본문 6,125 bytes·SHA-256 `703b8ab6049c813b572149d4861781da98356d5d0fe0daa1f3fa52583b7273aa`를 고정했다.
- 게시 파일은 [Stage 2](task_m010_126_stage2.md)의 11개 그대로다. SHA256SUMS는 976 bytes·`c26fba7d51546b28c38602d19f5905c6424a8998798ddf5caae17f3228361f82`.
- `git diff --check` 성공. 성공한 입력에 대한 불필요한 재빌드는 하지 않았다.

## 잔여 위험

기존 hosted NSIS 썸네일 제한·강제 MSI 3010 이후 미검증·Authenticode 미서명은 노트에 명시했다. 모든 배포판/Wayland/GPU/글꼴/물리 프린터/PDF 가져오기 옵션을 검증한 것은 아니다. GitHub Release·Pages·production 피드 및 실제 0.1.2→0.1.3 업그레이드는 다음 단계다.

## 다음 단계 영향

담당 postmelee의 기존 권한을 다시 확인하고 최종 main SHA에 새 annotated v0.1.3 tag를 생성한다. 승인된 유지관리자 CLI 경로로 위 11개와 고정 본문을 draft 게시하고, 새 다운로드 폴더의 모든 bytes·서명·inventory·본문을 대조한 뒤 stable/latest로 공개한다. 공개 뒤 다시 다운로드하고 actual publishedAt을 원문에 반영한다. 기존 tag 이동·force·파일 재빌드/교체는 하지 않는다.

## 승인 기록

“등록하고 릴리즈 완료까지 계속 진행해줘.”는 수행계획서에 기록한 기존 키 사용, 동일 bytes의 유지관리자 CLI 게시, Pages/피드와 실제 업그레이드까지의 계속 진행 승인이다. 위 실제 입력과 결과를 기록하고 Stage 4로 진행한다.
