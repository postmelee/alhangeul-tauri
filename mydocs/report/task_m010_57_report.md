# Task #57 최종 보고서 — Windows 썸네일 진단·조건부 MSI 안내

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
마일스톤: M010
작성일: 2026-09-20
상태: 승인된 최소 범위 구현·검증 완료, PR 리뷰·merge 승인 대기

## 작업 요약

- 목적: NSIS/MSI 설치 환경 차이를 관측하고 실제 실패 시 사용자에게 진단과 다음 행동을 제공한다.
- 결과: 격리 설치/실제 Shell 검증, 독립 지원 묶음, native 진단, 앱 동의·형식별 결과·조건부 MSI
  안내·정제 요약 복사를 제공한다. 등록 성공을 실제 썸네일 성공으로 오인하지 않게 했다.
- 단계: 초기 1~4 완료, 추가 5 환경 개입 실험은 사용자 결정으로 중단, 6의 재조정된 최소 범위
  (6.1 계약/연결/문서, 6.2 UI, 6.3 패키지·VDI·통합) 완료다. Stage 5 미수용 실험을 성공으로 세지 않는다.
- **완료하지 않은 것**: 모든 환경의 NSIS 썸네일 지원, 원인 완전 규명, 전체 사용자 NSIS,
  MSI 재부팅 후 성공, 선택 설치/설정, 독립 재검산 고도화, 공개 릴리즈.

제품 검증 기준은 `d36294ac92b66e52bbe27d76ddf6d72ed8f8e8a8`,
[full 35482436949 / attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/35482436949/attempts/1)이다.
그 뒤 최종 보고 커밋은 문서만 바꾼다. 검증 제품 SHA와 문서-only PR head를 구분한다.

## 변경 파일 목록과 영향 범위

| 경로/묶음 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/desktop/src-tauri/src/thumbnail_diagnostics/`, build 참조·tests | 설치 형식/참조 bytes/등록/환경, 제한된 child·공개 fixture suite·판정·창 소유권 | Windows native 진단; 자동 등록/보안 정책 변경 없음 |
| `apps/studio-host/src/core/desktop-thumbnail-diagnostics*`, `src/ui/thumbnail-diagnostics*`, `about-dialog.ts`, `style.css` | 동의·결과·MSI 안내·요약 복사, 중앙 배치·고정 footer | Windows 앱 UI, Linux/browser 진입점 숨김 |
| `scripts/windows-thumbnail-*`, `windows-installer-*`, 대응 `tests/` | Shell/캐시/강제 추출·설치 lifecycle·실패 분류·지원 묶음·앱 검증 | Windows CI/수동 진단. 실험 코드는 opt-in만, 실행 재개 없음 |
| `scripts/ci/`, `.github/workflows/` | NSIS/MSI/강제 재설치 격리, raw 결과와 계약 분리, 경량 필수 상태 집계·exact artifact 연결 | #66 구조 보존; 독립 replay 미수용 자산은 필수 gate로 쓰지 않음 |
| `README.md`, 기존 `docs/` 6개, 내부 계획/단계/최종 보고 | 사용법·관측·CI와 릴리즈 경계 정합화 | 공개 상태·tag·updater 활성화 변경 없음 |

전체 파일 목록은 PR diff를 따른다. #66 merge `f154b4d`를 포함한 최신 devel이 기준이며
옮겨진 job을 Desktop entry에 복제하지 않았다. handler/worker 엔진이나 NSIS 설치 scope를
이 문제의 추정 해결책으로 바꾸지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 사용자·통합자 썸네일 안내 | `docs/architecture/WINDOWS_THUMBNAILS.md` | 동일 | OK | 수행계획의 6.3/최종 정합화 위치 판단 |
| CI·릴리즈 운영 계약 | 기존 `docs/operations/` 4개 | 동일 | OK | Stage 6.1.3 승인 경로·보고서 |
| 버전 근거 | `docs/releases/v0.1.0.md` | 동일 | OK | 실패/공개 No-Go 보존, 최신 사실만 추가 |
| 단계·최종 보고 | `mydocs/working/`, `mydocs/report/` | 동일 | OK | 중앙 템플릿과 M010 파일명 |

새 공식 문서 루트나 제품용 manual은 만들지 않았다. 기존 긴 계획은 역사적 실패/승인 기록을
삭제하지 않고 상단 현재 상태와 보고서 링크로 정렬했다. 공식 안내 문서가 향후 지원 묶음에
복사되더라도 기존 artifact의 문서·bytes는 바꾸지 않는다.

## 변경 전·후 정량 비교

| 지표 | 변경 전/기준 | 변경 후/확인 결과 |
|---|---|---|
| 앱 진단 UI | #57 이전 없음 | HWP/HWPX 2개 형식의 결과·다음 행동·복사 제공 |
| 설치 격리 | 기존 순차 검사의 혼입 위험 | NSIS/MSI/강제 MSI 3개 독립 runner |
| UI 창 크기 | 신규 진단 UI 검증 필요 | 1280×800, 900×600, 480×640 3개 DOM 검사 통과 |
| 로컬 회귀 | 최종 코드 후보 | Studio 166, automation 959, upstream 36 통과 |
| branch 규모 | devel `f154b4d` → 제품 후보 `d36294a` | 229파일, +24,419/-159행 (최종 문서 커밋 전; 성능 개선 지표 아님) |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 격리 설치/원시 실패 보존 | OK — NSIS raw 실패 12건을 thumbnail not-accepted로 유지, 세 계약/IO 통과 |
| 실제 정상 경로 | OK — MSI HWP/HWPX 앱 진단 thumbnail-api-ok·cleanup=true 및 설치 lifecycle 통과 |
| 알려진 제한의 안내 | OK — NSIS 식별과 실제 per-user Shell 실패 패턴에만 조건부 MSI 안내. 진단 중단/미검사 별도 표시 |
| 개인정보·사용자 통제 | OK — 명시 동의, 취소/닫기, 공개 fixture, allowlist 요약. 자동 전송·UAC/등록 변경 없음 |
| UI 가시성/복사 | OK — 실제 DOM 상태/배치·성공/실패/재시도 회귀와 사용자 화면 승인 |
| 일반 사용자 VDI | OK(범위 한정) — `29a25c4` NSIS 실제 썸네일·앱 진단·중앙 배치, 이후 복사 UI는 추가 설치 생략 승인 |
| 최종 Windows/Linux 통합 | OK — `d36294a` full의 필수 fast/core/native/package/설치 집계 통과 |
| 문서-only 마무리 | OK — 관련 계약 113 passed/0 failed/0 skipped, release metadata·상대 링크/앵커 48개·diff 통과 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_57_stage1.md): 관측 계약과 원시 API/bitmap 구분.
- [Stage 2](../working/task_m010_57_stage2.md): 설치별 격리 재현; 당시 전체 실패 보존.
- [Stage 3](../working/task_m010_57_stage3.md): 수동 진단 묶음·Windows 실제 실행·MSI 안내.
- [Stage 4](../working/task_m010_57_stage4.md): 문서·회귀·#58 인계.
- [Stage 5.2](../working/task_m010_57_stage5.2.md): 비교 회귀 보정. 후속 실험 관측/정리 실패는
  구현계획에 보존하며, 사용자 결정에 따라 환경 개입을 중단했다. 전체 실험 성공 보고가 아니다.
- [Stage 6.1.1](../working/task_m010_57_stage6.1.1.md): 엄격한 제한/실패 계약 및 반례.
- [Stage 6.1.2](../working/task_m010_57_stage6.1.2.md): 최소 CI 연결·테스트 전용 artifact handoff.
- [Stage 6.1.3](../working/task_m010_57_stage6.1.3.md): CI·릴리즈 문서 정합화.
- [Stage 6.2](../working/task_m010_57_stage6.2.md): 사용자 UI·native 연결·VDI 보정·복사 피드백.
- [Stage 6.3](../working/task_m010_57_stage6.3.md): 최종 source/run/artifact·실제 관측·VDI 수용 경계.

### 통합 검증 해석

마지막 문서 변경 검증은 `pnpm run check:release-metadata`와 release metadata/checksums,
CI task57 integration/handoff/installer status, Windows 지원 묶음 및 Pages의 Node 회귀다.
113건이 통과했고 새 보고서 3개와 공식 안내 2개의 상대 링크/앵커 48개를 확인했다.
로그는 `/private/tmp/task57-final-report-tests.log`다. 문서-only 차이에 새 full을 요구하지 않는다.

MSI 일반은 raw exit 0/실패 0이다. NSIS는 raw exit 1/실패 12이지만
`hosted-nsis-diagnostic` 계약을 충족한다. 강제 MSI는 재부팅 필요에 따른 raw 실패 1건을
보존하고 `post-reboot-unverified`로 평가한다. 이를 기능 성공으로 뭉뚱그리지 않는다.
선택하지 않은 독립 native/installer/PDF/환경 실험 job의 skipped는 통과가 아니다.

VDI 정제 JSON/화면은 사용자가 제공했다. 최신 `d36294a` installer를 VDI에서 재검증했다고
표시하지 않는다. 브라우저 DOM 검사는 합성 bridge/clipboard이며 자동 CI/실제 WebView2·
모든 DPI/스크린리더 수용이 아니다. 제품 archive digest는 API metadata 기준이며 최종 분석에서
제품 압축 bytes를 새로 다운로드·재계산하지 않았다. 자료 재사용 시 출처·만료·해시를 다시 확인한다.

## 잔여 위험과 후속 작업

### 잔여 위험

- PC방 NSIS 실패를 모든 환경에서 해결하거나 하나의 원인으로 완전히 특정하지 못했다.
  VDI와 CI/PC방의 권한·등록 문맥 차이는 근거이나 한컴 버전/UAC 단일 원인으로 단정하지 않는다.
- MSI는 확인된 대안이며 조직 정책·관리자 권한·동일 빌드 확보가 필요하다. 모든 환경 해결책이 아니다.
- MSI 강제 재설치의 재부팅 후 정리·동작 및 Windows/한컴 전체 조합은 검증하지 않았다.
- 기존 독립 재검산/환경 실험 참고 코드가 남아 있으나 기본 실행/필수 수용으로 활성화하지 않았다.
- 첫 공개에는 실제 게시 bytes·서명·최소 설치 검증·위험 승인·게시 후 대조가 별도로 필요하다.
  이 PR은 릴리즈 Go, production updater 또는 태그/배포 승인이 아니다.

### 후속 작업 후보

- [#58](https://github.com/postmelee/alhangeul-tauri/issues/58): 구성요소 선택 설치·앱 활성화 설정. 이번 구현 밖이다.
- [#67](https://github.com/postmelee/alhangeul-tauri/issues/67): 독립 재검산·재사용 고도화. 첫 릴리즈 필수 선행이 아니다.
- 미검증 환경은 위 한계와 공개 체크리스트로 인계하며 현재 task에서 새 실험/이슈를 자동 확대하지 않는다.

## 작업지시자 승인 요청

사용자의 최종 보고·PR 정리 승인으로 보고서와 Open PR을 게시한다. 완료 표시는 승인된 최소
구현·검증 범위이며 작업 시간 종료를 뜻하지 않는다. PR 리뷰 및 merge 승인을 요청한다.
이슈 close·브랜치/worktree 정리·릴리즈는 merge 확인 또는 별도 승인 절차 후 진행한다.
