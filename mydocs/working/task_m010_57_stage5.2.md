# Task #57 Stage 5.2 — 비교 테스트 보정과 fast 회귀 결과

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 5.2

## 단계 목적

이전 Windows 비교 job이 실제 실험 전에 중단된 negative-classification fixture를 보정하고,
순수 분류·원시 증거 회귀를 새 CI의 fast에서 검증한다. 이 보고서는 테스트 보정 하위 단계만
종료하며 Stage 5 전체 비교 완료·workflow full 수용·NSIS 제품 해결을 보고하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-thumbnail-context-tests.ps1` | FailedDocuments factory, 실패 필드 조합·JSON/원시 증거 round-trip·변조 반례 |
| `tests/windows-thumbnail-fast.test.ps1` | 순수 equality 함수 AST allowlist 의존성 보완 |
| `tests/windows-thumbnail-context-experiment.test.mjs` | 실패 fixture·fast 격리 경계 source-contract |
| `mydocs/plans/task_m010_57.md`, `task_m010_57_impl.md` | 승인·원격 결과·Stage 5.3 실행안 |
| `mydocs/orders/20260909.md` | 진행중 유지, full·비교 실행 승인 대기 |
| 이 보고서 | 검증 범위와 잔여 위험 분리 |

## 본문 변경 정도 / 본문 무손실 여부

분류기·증거 판정·registry 개입·제품/installer/handler/worker·앱 UI·workflow는 이번
Stage 5.2에서 변경하지 않았다. 문서 3개 × Shell/force-extract 실패를 실제 API 단계,
HRESULT `0x80040154`, exit 1, 빈 bitmap/width/height로 일관되게 만들었다.
JPG/연결/직접 COM 대조는 성공으로 유지했다. 성공 phase 잔존·크기 잔존 반례도 검사한다.
원시 증거 writer의 create-only 계약은 보존하고 테스트가 만든 알려진 임시 파일만 정리했다.
fast에는 registry 파일 전체 대신 순수 `Test-ContextEqual` 하나만 추가로 읽는다.

기존 계획의 과거 승인·결과 기록은 보존하고 상단 현재 상태와 후속 실행안을 갱신했다.
문서 위치는 기존 `mydocs/plans/`, `mydocs/orders/`, 중앙 템플릿의 `mydocs/working/`를
사용한다. 승인된 원격 후보/결과 기록 분리 예외에 따라 소스 `26ded31`과 이 보고 커밋을
분리하며 이미 게시한 후보 이력을 재작성하지 않는다.

## 검증 결과

실행 명령(보고 작성 시 로컬 재검증):

```bash
node --test tests/windows-thumbnail-context-experiment.test.mjs tests/ci-task57-integration.test.mjs tests/ci-fast.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
actionlint -shellcheck='' .github/workflows/*.yml
git diff --check
```

- 대상 17 passed, 전체 automation 681 passed / 0 failed / 0 skipped.
- product boundary 488 files 통과, 전체 workflow actionlint·diff 통과.
- 전체 automation 로그: `/private/tmp/task57-stage52-report-automation.log`.
- 현 호스트에서는 Windows PowerShell·Rust desktop·Tauri/native/설치를 실행하지 않았다.

원격 근거:

| 항목 | 결과 |
|---|---|
| Run | [34256381653](https://github.com/postmelee/alhangeul-tauri/actions/runs/34256381653), attempt 1, success |
| workflow/ref/head SHA | `ci.yml` / `publish/task57` / `26ded313dad49dfd8cd21145aff7e57e3c51cb77` |
| 전송 입력 | `profile=fast`, `scope=full`, `thumbnail_context_experiment=false` |
| 생성 / API 갱신 시각 | 2026-09-09 02:19:21 / 02:21:22 KST |
| select | job `102163152966`, success |
| Windows PowerShell | job `102163210743`, success; 50 sources, 5 isolated tests |
| Linux Node/Studio | job `102163210781`, success; automation 681, upstream 36, Studio 147·build, boundary 488·GUI typecheck 등 |
| artifacts / installer | skipped; 제품 생성·실제 설치 검증 없음 |

Windows 로그의 `Pure thumbnail assessment/context regressions passed; no native or installer acceptance.`와
`PowerShell contracts passed: 50 sources, 5 isolated tests`를 확인했다. Windows PS 5.1에서
실패 분류·JSON round-trip·임시 파일 원시 증거/변조 회귀가 통과한 근거다.
이는 전체 registry/token 테스트나 실제 Shell 비교 실험 성공을 뜻하지 않는다.

API metadata의 `alhangeul-fast-windows-script-contracts` artifact ID는 `10068045248`,
digest는 `sha256:dcb4330646b84279f740e98151f03e0d585197f7286a74d6466b07f977e6b81a`이며
조회 시 expired=false였다. 이번 결과 기록에서 archive를 다운로드해 hash를 재계산한 것은
아니다. 제품 bundle로 재사용할 artifact도 아니다. 입력은 dispatch 전송 기록이며 API에서
전체 입력 객체를 반환받은 것으로 표현하지 않는다. 문서 후속 커밋은 이 실행 SHA와 다르다.

## 잔여 위험

- 실제 비교를 막았던 테스트 오류는 보정됐지만 token/ACL/registry/COM·실험 복원은 아직 검증 전이다.
- NSIS Shell `0x80040154`와 MSI 강제 교체 `3010`의 이전 제품 실패는 미해결이다.
- #66 workflow 통합의 full 수용은 미실행이다. fast의 `scope=full`은 `profile=full`이 아니다.
- hosted 정상 Explorer/linked token 부재, DLL 잠금·캐시, 실제 한컴/VDI 차이를 계속 구분한다.
- API 성공은 Explorer 화면의 썸네일 성공을 대신하지 않는다. 현장·재부팅 검증도 남아 있다.

## 다음 단계 영향

Stage 5.3은 구현계획의 full+context 비게시 1회 실행안이다. Windows/Linux 새 제품과
같은 source/support를 생성해 NSIS/MSI 3개 및 격리 비교 2개를 검증한다. 현재 installer
재사용 경로에는 비교 opt-in이 없으므로 일반 재사용 검사로 이번 비교를 대체하지 않는다.
exact workflow/source SHA, artifact ID/digest, 실제 실패 gate와 복원 안전 조건을 유지한다.
비교가 관측 완료돼도 제품 gate가 실패하면 full 성공이나 #57 해결로 기록하지 않는다.

## 승인 요청

Stage 5.2 보고와 Stage 5.3 실행안을 검토한 뒤 후보 non-force 게시 및
`ci.yml profile=full, scope=full, thumbnail_context_experiment=true` 1회 실행을 승인받는다.
추가 runner 비용과 폐기 가능한 hosted VM의 제한된 임시 HKCU/HKLM·보호 경로 개입을 포함한다.
이번 기록 작업에서는 push·dispatch·제품 수정·#58·PR/close·배포를 수행하지 않는다.
