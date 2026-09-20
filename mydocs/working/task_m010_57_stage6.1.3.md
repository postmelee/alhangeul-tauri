# Task #57 Stage 6.1.3 완료 보고 — CI·릴리즈 판정 문서 정합화

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 6.1.3
작성일: 2026-09-17
상태: 문서 정합화·검증 완료, 단계 보고 검토 및 6.2 진입 승인 대기

## 단계 목적

검증된 6.1.2 구현과 공식 안내를 일치시킨다. CI 검사 계약 통과, 실제 썸네일 생성 관측,
추가 테스트용 artifact 재사용 자격, 공개 릴리즈 수용을 분리한다. `e662271` 보고 뒤
작업지시자의 “진행해줘”로 진입했으며 제품 기능·CI 고도화·공개 실행은 범위 밖이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/operations/CI_VALIDATION.md` | 이전 MSI→NSIS 순차 설명을 세 격리 job으로 정정. 경량 집계·세 계약·raw/평가/upload 판독·테스트 전용 전달·PDF 소비자 경계 |
| `docs/operations/PUBLIC_RELEASE_RUNBOOK.md` | Gate 2의 계약 판독과 Gate 3의 실제 파일 수용 분리. inventory 명령에 source SHA 대조 명시, 원래 게시·승인·read-back 절차 유지 |
| `docs/operations/DESKTOP_RELEASE.md` | CI 진입점과 Windows 계약 의미 보정. 과거 실패 run 보존, 현재 추가 검사 입력과 공개 입력 구분 |
| `docs/operations/RELEASE_CHECKLIST.md` | 제한·재부팅 후 미검증·최신 VDI 및 필수 증거 확인. #67을 첫 릴리즈 선행으로 추가하지 않음 |
| `docs/releases/v0.1.0.md` | `6ffb3af` fast/full 및 기존 bytes open-only 근거 추가. 초기 `f1cdd07` 실패와 #9 역사적 판단 보존 |
| `docs/architecture/WINDOWS_THUMBNAILS.md` | 과거 #14 VDI와 최신 CI 구분, 현재 제한·조건부 MSI 대안 설명. 앱 진단 UI/최신 VDI는 아직 완료되지 않았음을 명시 |
| 기존 계획 두 문서·오늘할일·본 보고서 | 승인·문서 검증·잔여 작업·6.2 승인 대기 상태 정합화 |

## 본문 변경 정도 / 본문 무손실 여부

승인된 기존 경로의 관련 절만 수정했다. 과거 source/run/artifact hash·실패 결과·공개 No-Go
기록을 삭제하거나 현재 성공으로 재분류하지 않았다. 기존 상대 링크와 주요 앵커를 유지했다.
문서 300줄 권장 상한을 넘는 기존 정책/runbook/버전 기록은 단일 책임·이력 연결을 유지하기
위한 제한적 예외로 구현계획에 기록했다. 새 공식 루트나 내부 매뉴얼을 만들지 않았다.

제품 코드·workflow·tests·manifest·lock·upstream pin·`site/release.json`은 변경하지 않았다.
지원 묶음에 포함되는 thumbnail 문서는 다음 빌드부터 새 복사본이 들어가므로 기존 archive를
편집하지 않는다. 이 문서 커밋을 native 검증 source로 소급하지 않는다.

## 검증 결과

```sh
pnpm run check:release-metadata
node --test tests/release-metadata.test.mjs tests/release-checksums.test.mjs tests/ci-task57-integration.test.mjs tests/ci-handoff.test.mjs tests/ci-installer-status.test.mjs tests/windows-thumbnail-support.test.mjs tests/pages.test.mjs
git diff --check
```

- `Release metadata check passed: Alhangeul 0.1.0`.
- 관련 계약 회귀 **113 passed / 0 failed / 0 skipped**. 문서의 모든 의미를 자동 입증하는
  테스트는 아니므로 실제 workflow/script 및 6.1.2 증거와의 수동 대조도 수행했다.
- 공식 문서 6개의 상대 링크·앵커 **88개** 확인. 신규 단계 보고 및 계획 링크도 확인했다.
- 이전 순차 설치 설명 제거, 현재 출력 enum과 문서 표현 일치, source `unreleased` 유지 확인.
- diff whitespace 오류 없음. 추가 CI·제품 빌드·서명·게시·설치 실험은 실행하지 않았다.

### 6.1 근거 종합과 경계

최신 코드 근거는 `6ffb3afce47608bf512f4145ec741d9ce8137eb4`의
[full 35115949615, attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/35115949615/attempts/1)과
[Stage 6.1.2 보고서](task_m010_57_stage6.1.2.md)다. native/플랫폼 build·설치 진단 기반·계약
연결의 검사 범위를 통과했으며, 이번 문서 수정에서 그 검사를 반복하지 않았다.
기존 bytes의 [open-only 35114102129](https://github.com/postmelee/alhangeul-tauri/actions/runs/35114102129/attempts/1)는
제품 `6f5c939`/harness `6ffb3af`의 문서 열기 검사이며 최신 full bytes의 PDF 수용은 아니다.

CI 원시 NSIS 실패 12건(`0x80040154`), MSI 성공, forced MSI 3010·재부팅 후 미검증은
그대로다. 이를 반영한 CI 계약 성공은 일반 사용자 NSIS 성공·사용자 UI·최신 VDI·릴리즈
수용을 뜻하지 않는다. 독립 재검산 #67은 백로그이며 6.1 완료 조건으로 되돌리지 않았다.

## 잔여 위험

- PC방 유사 환경의 NSIS 실패를 해결하거나 모든 환경의 원인을 특정한 것은 아니다.
- 일반 사용자 VDI의 최신 후보·앱 진단 결과 및 MSI 재부팅 후 관측은 미검증이다.
- 앱에서 제한·MSI 대안을 보여주는 사용자 UI는 6.2에서 구현해야 한다.
- 공개 시에는 실제 게시 bytes·서명·설치·지원 범위/위험 승인·read-back이 별도로 필요하다.
- #57 전체 완료·#58 선택 설치·#67 고도화·release Go는 선언하지 않는다.

## 다음 단계 영향

6.2에서 기존 native 진단 기반을 호출하는 Windows 사용자 UI, 동의 기반 검사, 조건부 MSI
안내와 비식별 요약 복사를 구현한다. Linux 비노출·오류 처리·bridge 회귀를 기존 계획대로
검증한다. 이후 6.3은 최신 설치본과 일반 사용자 VDI·최종 통합 확인으로 진행한다.
전체 사용자 NSIS나 UAC/HKLM 환경 실험은 재개하지 않는다.

## 승인 요청

Stage 6.1.3 문서 정합화·검증 및 6.1 근거 정리를 검토하고 **Stage 6.2 사용자 진단 UI**
진입을 승인받는다. 이번 단계에서는 6.2 코드 수정·원격 push·PR·이슈 종료를 하지 않는다.
