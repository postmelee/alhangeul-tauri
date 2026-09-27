# Task #74 최종 보고 — 로컬 글꼴 상태·선택 지속·실제 공급

GitHub Issue: [#74](https://github.com/postmelee/alhangeul-tauri/issues/74)
마일스톤: M010

## 작업 요약

- 4개 Stage에서 감지 adapter와 upstream 소비자 상태를 합치고 사용자 선택을 native 설정으로 지속했다.
- 문서 진입·재감지·새 창·프로세스 재시작에 필요한 글꼴을 공급하며 오래된 성공/실패 cache를 회수한다.
- 설치본 검증 중 발견한 CanvasKit 재감지 손실과 나눔스퀘어 이름·중복 경로 문제를 보정했다.
- Windows 사용자 적용 확인과 Linux exact 설치본 수용을 완료했으며 최종 Windows 릴리즈 통합 점검은 후속 후보에서 수행한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/desktop/src-tauri/src/local_font*` | 선택 전용 원자 저장·복원·revision·명령 | 사용자 기기 설정 |
| `apps/desktop/src-tauri/src/font_*` | 실제 face 이름 보존·canonical identity | native 목록과 지원 파일 읽기 |
| `apps/studio-host/src/core/local-font*` | 통합 상태·세대·캐시·별칭·bytes 공급 | CSS/Canvas2D/CanvasKit |
| Studio entry/import hook·설정 UI | upstream 소비자 연결·수동 재감지 | 문서 로드와 설정 |
| GUI workflow·public fixtures·회귀 | exact 설치본/renderer/새 창/재시작 | 검증 전용 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| LOCAL_FONTS·UPSTREAM | `docs/architecture/` | 동일 | OK | 구현계획의 기존 공식 경계 보정 |
| fixture·수용 근거 | `tests/gui/local-fonts/` | 동일 | OK | 공개 bytes·hash·상태 기록 |
| 단계/최종 보고 | `mydocs/working/`, `mydocs/report/` | 동일 | OK | Hyper-Waterfall 산출물 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 소비자 상태 | 감지 후 모달 판단이 별도 snapshot | 동일 adapter 상태 사용 |
| 선택 지속 | 메모리 snapshot | native version 1 선택 설정 |
| 공식 NanumSquare Bold 재현 | 요청 매칭 null·bytes 조회 0 | 실제 이름 보존·동일 파일 통합·native/Studio 회귀 통과 |
| CanvasKit 재감지 | Typeface 0으로 소실 | 사용·복구·새 창에서 1 유지 |
| 설치본 Linux 수용 | 최신 후보 미검증 | 화면 24개·프로세스 재시작 6회·새 창 4개 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 단일 감지/판단 상태 | OK — 실제 upstream 소비자 연결 회귀 |
| 선택 지속·실패 안내 | OK — native 디스크·손상·동시 쓰기와 UI 회귀 |
| 대표 지원 글꼴 실제 적용 | OK — Windows 사용자 NanumSquare/Abel, Linux 두 renderer Abel |
| 재감지·삭제/복구·새 창·재실행 | OK — Linux exact GUI와 frontend/native 회귀; Windows 최종 통합 재확인은 후속 |
| HWP/HWPX 보존 | OK — 설치본 export 재열기에서 글꼴명·본문 확인 |
| native 회귀 | OK — full 36104289925; installer별 raw 제한 별도 유지 |
| 제한 정책·upstream 경계 | OK — root·family 제한과 v0.8.4 pin 유지 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_74_stage1.md): 감지 소비자/import 단일화.
- [Stage 2](../working/task_m010_74_stage2.md): native 선택 지속·오류·창 revision.
- [Stage 3](../working/task_m010_74_stage3.md): 필요한 face 공급·실패/성공 cache 회수.
- [Stage 4](../working/task_m010_74_stage4.md): Windows/Linux 실제 수용·이름/경로 보정·새 창 검증.

## 잔여 위험과 후속 작업

### 잔여 위험

- NSIS Shell 썸네일과 MSI 강제 재설치 제한은 유지한다. full CI success를 모든 환경 성공으로 확대하지 않는다.
- 사용자 최종 Windows 점검은 후속 v0.8.6 새 설치본의 재실행·새 창·글꼴 적용을 포함한다.
- 모든 글꼴/container·Linux arm64 GUI·모든 출력 경로 수용이 아니다. Abel iii 조판은 upstream 범위다.

### 후속 작업 후보

- 승인된 별도 이슈: sync 운영 gate와 v0.8.6 core/Studio/WASM 수용, 새 Windows/Linux 검증·사용자 인계.
- #69 공개 준비는 최종 Windows 사용자 결과 후 별도 release gate로 이어진다. 본 task는 공개하지 않는다.

## 작업지시자 승인 기록

2026-09-26 '#74 남은 검증 정리·반영 → 별도 이슈 ...' 지시를 최종 보고·PR·devel 반영
진행 승인으로 적용했다. 글꼴 목록 안내 개선은 사용자의 결정에 따라 제외했다.
