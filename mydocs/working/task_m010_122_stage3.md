# Task #122 Stage 3 — Windows와 Linux 설치 파일 검증

GitHub Issue: [#122](https://github.com/postmelee/alhangeul-tauri/issues/122)  
구현계획서: [task_m010_122_impl.md](../plans/task_m010_122_impl.md)  
Stage: 3 · 2026-11-11 · 완료, 알려진 제한 포함 · Stage 4 승인 대기

## 단계 목적

rhwp v0.9.0을 반영한 Alhangeul v0.1.3의 실제 설치 파일 6종을 확인하고, 첫 후보에서 발견한 글꼴 재감지 회귀를 보정한다. 제품과 검증 도구의 커밋을 분리해 같은 파일의 출처·설치·문서 작업·출력 결과를 추적한다. 공개 배포 수용과 서명은 이번 단계에 포함하지 않는다.

## 산출물

| 파일/범위 | 변경 요약 |
|---|---|
| `apps/studio-host/local-font-entry-hooks.ts` 및 회귀 검사 | 글꼴 재감지·사용 변경 시 upstream 선언 프로그램·CSS face·별칭을 먼저 해제 |
| `scripts/ci/release-candidate-input.mjs` | 26.8 MB WASM의 출처를 버퍼 제한 없는 Git blob 해시로 대조 |
| `scripts/ci/release-file-candidate.mjs` 및 desktop/release-files workflow | 명시적 일반 파일 수용 모드, exact producer·archive·inventory·파일 hash 검증. 서명 검증은 별도 유지 |
| `tests/gui/specs/installed-workers.e2e.ts` | 설치된 번들의 폼·PDF Worker를 실제 실행하고 반환된 HWPX 내용 확인 |
| `scripts/windows-system-print.ps1`, `tests/gui/specs/windows-system-print.e2e.ts` | 앱 소유 인쇄 UI의 취소·PDF 저장, 정확한 파일명 HWND, 스풀 완료와 편집 복귀 검증 |
| `tests/gui/local-fonts/renderer-contract.*`, 글꼴 GUI·계약 검사 | 요청/실제 renderer 분리, 비활성 Abel·enforced CSP·독립적으로 확인한 글꼴 공급 부재만 전환 근거로 인정 |
| [task_m010_122.json](task_m010_122.json) | 새 producer의 NSIS·MSI·AppImage·RPM·arm64 고정 입력 |
| [v0.1.3 후보 기록](../../docs/releases/v0.1.3.md) | 설치 파일 6종과 archive의 크기·SHA-256, 실제 검증·제한·실패 이력 |
| 계획서·오늘할일·이 보고서 | 단계 결과와 다음 승인 범위 |

## 본문 변경 정도 / 본문 무손실 여부

기존 후보 기록은 첫 후보 이력으로 보존하고 새 후보의 결과를 구분했다. 제품 변경은 승인받은 글꼴 캐시 해제이며, `third_party/rhwp` 소스는 수정하지 않았다. Worker와 AI 범위는 선행 PR #123에서 정한 계약을 유지한다. 이후 커밋은 검증 도구·workflow·문서에 한정한다. 제품 CSP를 완화하거나 외부/전용 글꼴을 새로 번들하지 않았다.

## 검증 결과

### 제품과 도구 출처

| 항목 | 고정값 |
|---|---|
| upstream | Stable `v0.9.0`, `c9095c5f67632e6721e800ccc7fb43ea49d26682` |
| 제품 SHA | `2de5aa319d29e125bec0efc58f9e5526fc4a65d6` |
| 전체 producer | [42919676345](https://github.com/postmelee/alhangeul-tauri/actions/runs/42919676345), attempt 1, `alhangeul-desktop.yml`, all/full/run_tests=true, publish_release=false |
| 첫 추가 도구 | `e3d8a9522543ea937e5d6df51014d20b376b1149` |
| 글꼴·Fedora 도구 | `2250d10986af10b0c7f3afaefc22c7373e6183fa` |
| 최종 일반 파일 도구 | `c5f59294abefb6ad3251bb5f6a5083283ff8c6e0` |

Rust core·Studio·WASM은 같은 upstream pin이다. Windows x64·Linux x64/arm64의 전체 producer 필수 job이 성공했다. 다운로드한 archive 3종의 digest 및 설치 파일 6종의 크기·SHA-256을 재계산했다. 개별 값은 [후보 파일 표](../../docs/releases/v0.1.3.md#재검증-후보-2026-11-11)에 보존했다. 일반 파일 handoff의 목적은 `additional-validation-only`, 서명 확인은 false다.

실행 명령의 핵심 입력:

```sh
# publish/task122가 제품 SHA를 가리킬 때 실행한 전체 producer
 gh workflow run alhangeul-desktop.yml --ref publish/task122 \
  -f mode=artifact -f build_ref=2de5aa319d29e125bec0efc58f9e5526fc4a65d6 \
  -f artifact_platform=all -f validation_profile=full \
  -f run_tests=true -f publish_release=false
# 최종 도구 SHA에서 동일 파일 검증
 gh workflow run alhangeul-desktop.yml --ref publish/task122 \
  -f mode=artifact-file-acceptance \
  -f release_candidate_path=mydocs/working/task_m010_122.json \
  -f artifact_platform=all -f publish_release=false
 gh workflow run ci.yml --ref publish/task122 -f profile=fast -f scope=full
 pnpm run typecheck:gui
 pnpm run test:automation
 pnpm run check:release-notes
 git diff --check
```

`check:release-notes` 출력은 `Release notes check passed: 2 documents`였다. 이는 기존 typed notes 2건의 계약 검사이며, 아직 없는 v0.1.3 서명 inventory를 검증한 결과가 아니다. v0.1.3 Markdown 후보 기록은 실제 파일/실행 근거와 대조했고 로컬 링크 및 `git diff --check`를 통과했다.

원격 ref가 가리키던 실제 SHA는 위 표와 각 실행의 head SHA로 고정한다. 단계 끝의 문서 커밋은 새 제품 빌드를 뜻하지 않는다.

### 실제 설치본 수용

| 실행 | 도구 | 결과와 범위 |
|---|---|---|
| [42930152006](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930152006) Windows 직접 PDF | e3d8a952 | NSIS에서 HWP 6쪽·HWPX 10쪽 편집 후 새 출력/재시작 덮어쓰기 4건. 페이지·한글 검색·원본 hash 확인 |
| [42930156329](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930156329) Linux x64 전체 GUI | e3d8a952 | DEB HWP/HWPX 저장·재열기, 직접 PDF, GTK·CUPS 출력·취소 복귀, Nautilus·Thunar 첫 요청/캐시/변경 썸네일 성공 |
| [42930258952](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930258952) arm64 DEB | e3d8a952 | 실제 arm64 설치, HWP/HWPX 편집·native Save As·저장·프로세스 재시작·재열기. package acceptance exit 0 |
| [42932035740](https://github.com/postmelee/alhangeul-tauri/actions/runs/42932035740) Linux 글꼴 | 2250d109 | 삭제·재감지 후 face 0/초기 픽셀 복귀, 복구 후 적용 픽셀 일치. 새 창·재시작·비활성화 성공 |
| [42932221022](https://github.com/postmelee/alhangeul-tauri/actions/runs/42932221022) Fedora RPM | 2250d109 | Fedora 44 x64 QEMU/KVM·Xfce X11, 실제 RPM 설치·대표 문서 작업·재시작 성공. VM/package acceptance exit 0 |
| [42936058653](https://github.com/postmelee/alhangeul-tauri/actions/runs/42936058653) NSIS·MSI·AppImage | c5f59294 | 세 job 모두 성공. 문서 roundtrip·폼/PDF Worker, 각 16개 조합·80회 입력/저장. Windows 시스템 인쇄·취소 복귀·설치 제거·WebView 정책 복원 성공 |
| [42936062390](https://github.com/postmelee/alhangeul-tauri/actions/runs/42936062390) 빠른 CI | c5f59294 | Node·Studio·Windows PowerShell 성공. 로컬 타입 검사, 자동화 1,370/1,370 통과 |

RPM 제거·MIME 보존과 arm64 helper 렌더는 전체 producer의 패키지 검사 범위다. Fedora GUI 성공을 Fedora 파일 관리자 썸네일·제거 검증으로 확대하지 않는다. AppImage는 원본 파일을 FUSE로 직접 실행했으며 패키지 설치/제거 항목은 적용하지 않는다.

폼 Worker는 실제 설치된 main bundle이 참조하는 모듈을 실행했다. PDF Worker는 1쪽 텍스트 PDF를 가져와 HWPX를 반환했고 같은 WASM으로 다시 열어 `ALHANGEUL WORKER IMPORT`를 확인했다. 이는 모든 PDF·OCR·배치 옵션의 포괄 수용이 아니다.

글꼴 반복 검사의 16개 조합은 문서 4종 × 설정 2종 × 요청 renderer 2종이며 각 5회 수행했다. 활성 Abel HWP/HWPX는 실제 CanvasKit을 확인했다. 비활성 Abel, CSP가 차단한 HCRDotum, 원본 선언·공급 registry·native catalog에서 부재를 대조한 한양신명조는 실제 Canvas2D 전환으로 기록했다. 이를 CanvasKit 성공이나 이전 버전 대비 속도 개선으로 집계하지 않는다.

### 출력·시각 확인

- Windows 직접 PDF 새 출력/재시작 32쪽, Linux 직접·GTK·CUPS 28쪽의 전체 개괄과 대표 페이지 확대를 검토했다. 눈에 띄는 잘림·글자 누락은 발견하지 못했다.
- 최종 NSIS·MSI 시스템 출력은 각각 6쪽, 1,352,883바이트이며 PDF 헤더·끝 표시와 `pdfinfo` 페이지 수를 확인했다. 전체 개괄 및 표가 있는 대표 페이지 확대에서 한글·표·쪽 구성을 확인했다. SHA-256은 둘 다 `2b3f55f9a950196888b56763927c106af41d74c11824438de3c61cc89a28ee3e`다.
- Microsoft Print to PDF는 runner 기본 Letter 용지로 출력했으며 `pdftotext`의 검색 가능한 문자는 0개였다. 직접 PDF 내보내기의 한글 검색 성공과 구분한다. 모든 글자를 확대 대조하거나 픽셀 완전 일치를 주장하지 않는다.
- 글꼴 삭제·복구 페이지도 비교했고 face 수·픽셀 해시 검증과 일치하는 전환을 확인했다. 비공개 이미지·로그·다운로드는 T7 증거 영역에 보존하고 Git에 추가하지 않았다.

### 증거 archive

아래 archive는 실제 다운로드 bytes로 metadata의 SHA-256과 일치함을 확인했다. 모두 각 run의 attempt 1이다.

| 실행/용도 | archive ID | archive SHA-256 |
|---|---:|---|
| 42930152006 · windows-pdf-raw-42930152006 | [13816626923](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930152006/artifacts/13816626923) | `8a7dfddeeccde9ce8cdb39a52e6f684c51f106ac20e5c6dc7b35bfa09a439508` |
| 42930152006 · windows-pdf-analysis-42930152006 | [13816323331](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930152006/artifacts/13816323331) | `41faa79340fbf6657f2982a1143887e51fc78fd482264da45c251d31131aacdc` |
| 42930156329 · alhangeul-linux-gui-42930156329 | [13816022853](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930156329/artifacts/13816022853) | `a909de24591427e6ba7bc0c9357ffec19ede4de41b0bd2575edd79ca225039db` |
| 42930258952 · alhangeul-final-arm64-42930258952 | [13816063888](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930258952/artifacts/13816063888) | `8cccf36853c89f99040a2ebe2fef4b7892161d9a8f75035f72125cfd90d1f229` |
| 42932035740 · alhangeul-linux-gui-42932035740 | [13816264906](https://github.com/postmelee/alhangeul-tauri/actions/runs/42932035740/artifacts/13816264906) | `d0abc2b1e79a21ebce1d6c9ac9f5adc0ff96403151741a1e7719228e05c8970e` |
| 42932221022 · alhangeul-final-rpm-vm-42932221022 | [13817970034](https://github.com/postmelee/alhangeul-tauri/actions/runs/42932221022/artifacts/13817970034) | `720a9e9a002d6510fce579506c1f574d38c920a9d108368684dd93c4371c68ab` |
| 42936058653 · alhangeul-final-nsis-42936058653 | [13819475518](https://github.com/postmelee/alhangeul-tauri/actions/runs/42936058653/artifacts/13819475518) | `697819f3cf563ff13a6fc417430b7c7c0af06e2ff4bfc7c928fc024707756c68` |
| 42936058653 · alhangeul-final-appimage-42936058653 | [13819251416](https://github.com/postmelee/alhangeul-tauri/actions/runs/42936058653/artifacts/13819251416) | `1215d254769f4ddb8e37a7bd7c884d2234a41c7424b505d241e4069528c28885` |
| 42936058653 · alhangeul-final-msi-42936058653 | [13818004124](https://github.com/postmelee/alhangeul-tauri/actions/runs/42936058653/artifacts/13818004124) | `e6ccf4f2e8491cc31c9756c1398bb4b8e2f22df1601086c74f82cf7104f589f2` |

### 실패 이력과 보정

첫 제품 `08a825d7`의 글꼴 run `42751857930`은 삭제 후 Abel face가 남는 제품 회귀였다. 선언 프로그램·CSS face·별칭을 해제한 새 제품으로 6종을 재빌드했고 성공한 이전 제품의 GUI 결과를 새 제품 결과로 대신하지 않았다.

새 제품의 첫 추가 시도 `42930160784`와 `42930164791`은 비활성화 시 CanvasKit을 무조건 기대한 전제 및 Windows 인쇄 UI 선택에서 실패했다. `42932488095`는 대표 문서의 CSP 차단 전환과 저장창 입력 ID, `42934573187`은 미설치 한양신명조 전환과 스풀 쓰기 완료 전 읽기에서 실패했다. 각각 관찰된 진단·UI·파일로 검증 도구를 보정하고 같은 제품 파일로 다시 실행했다. 마지막 일반 파일 run `42936058653`과 글꼴 run `42932035740`이 해당 범위를 통과했다. 과거 실패를 소급 성공 처리하지 않는다.

## 잔여 위험

- 일반 MSI 설치/제거·Explorer 썸네일은 `strict-product`, raw exit 0이다. producer 증거 `13815222974`.
- NSIS 설치/제거는 성공했지만 사용자별 Shell 활성화 raw 실패 12건, `thumbnailStatus=not-accepted`가 남는다. `hosted-nsis-diagnostic` 계약 성공이며 전체 썸네일 수용이 아니다. 증거 `13815398068`.
- 강제 MSI 재설치는 재부팅 요구로 raw 실패 1건, `post-reboot-unverified`다. `msi-forced-reinstall-reboot` 계약 성공을 재부팅 후 성공으로 해석하지 않는다. 증거 `13815237974`.
- 대표 문서의 CanvasKit 전환과 Windows 시스템 출력의 검색 불가 텍스트는 위 관측 범위대로 공개 후보 기록에 명시한다.
- 공개 서명 파일·typed notes inventory·v0.1.2에서 실제 updater 업그레이드·공개 tag/Release/Pages/피드 전환은 미수행이다. 일반 파일의 검증이 공개 릴리즈 승인을 대신하지 않는다.

## 다음 단계 영향

Stage 4에서 후보 기록을 최종 정리하고 최종 보고서와 devel 대상 검토용 PR을 준비한다. 설치 파일은 제품 SHA `2de5aa319d29e125bec0efc58f9e5526fc4a65d6`의 고정 증거로 인계한다. 제품 코드가 다시 바뀌면 새 제품/파일 검증이 필요하다. 동기화 draft PR #124와 이슈 #122는 열린 상태로 유지한다.

## 승인 요청

Stage 3 결과와 명시한 제한을 검토한 뒤 Stage 4(후보 인계·최종 보고·검토용 PR) 진입 승인을 요청한다. production 서명·공개 배포는 별도 범위다.
