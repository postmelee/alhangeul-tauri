# Task #57 Stage 6.1.1 완료 보고 — 순수 CI 계약 수용 판정과 반례 회귀

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 6.1.1
작성일: 2026-09-14
상태: 구현·검증 완료, 단계 보고 검토 및 6.1.2 진입 승인 대기

## 단계 목적

실제 제품 관측과 CI 검사 계약의 성공 여부를 분리하는 순수 판정 기반을 만든다.
알려진 NSIS 실패 또는 MSI 재설치 3010을 무조건 성공으로 바꾸는 대신, 정해진 증거와
시나리오를 모두 충족한 경우에만 제한된 계약 수용을 반환한다. 이번 단계는 합성 회귀까지이며
실제 workflow gate, 파일 IO, artifact 집계와 재사용 자격 연결은 6.1.2로 남긴다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-installer-acceptance.ps1` | 43줄. 세 계약 선택·판정 순서·제한 상태 반환. 기본 실패, provenance/release 미검증, reuse 부적격 |
| `scripts/windows-installer-acceptance-evidence.ps1` | 187줄. 입력 정체성·배열/타입·정리·기본 연결·fixture 무결성·38개 probe 및 assessment 비교 |
| `scripts/windows-installer-acceptance-policy.ps1` | 113줄. lifecycle/rollback/reboot 재계산, 정확한 실패 집합과 step/exit 일치 검사 |
| `scripts/windows-installer-acceptance-test-fixtures.ps1` | 109줄. 시스템 변경 없는 합성 입력 생성 |
| `scripts/windows-installer-acceptance-tests.ps1` | 280줄. 정상·제한·누락/변조·JSON 왕복·입력 불변·wrapper 회귀 및 안전한 실패 위치 진단 |
| `tests/windows-installer-acceptance.test.ps1` | 7줄. 기존 Windows runner의 격리 프로세스 실행 진입 |
| `tests/ci-installer-acceptance.test.mjs` | 92줄. 순수 함수·정책 경계·회귀 구성·파일/함수 크기 소스 계약 |
| `mydocs/plans/task_m010_57*.md`, `mydocs/orders/20260914.md` | 승인·후보·실패 보정·검증 및 단계 상태 갱신 |

판정 결과의 범위:

| 계약 / 합성 관측 | 계약 결과 | 보존하는 제한 |
|---|---|---|
| `strict-product`: 정상 MSI 또는 NSIS lifecycle | passed | 해당 시나리오 관측만 수용; 릴리즈/출처 검증 아님 |
| `hosted-nsis-diagnostic`: 전체 정상 | passed | 알려진 제한이 재현되지 않았다는 reason을 반환 |
| `hosted-nsis-diagnostic`: 두 phase의 정확한 12건 `0x80040154` | passed | thumbnail은 not-accepted, raw smoke는 failed/exit 1 유지 |
| `msi-forced-reinstall-reboot`: 정상 종료 | passed | forced 시나리오의 명시적 launch/rollback 생략 유지 |
| 같은 forced 계약: 재설치만 3010, 필수 증거 일치 | passed | reboot-required와 post-reboot-unverified 유지 |
| 누락·혼합 오류·일반 MSI 3010·예상 밖 exit/step 상태 | failed | 일반 오류를 알려진 제한으로 확대하지 않음 |

## 본문 변경 정도 / 본문 무손실 여부

기존 앱 Rust/UI API, 썸네일 엔진, NSIS/MSI 설치 범위, 등록·제거, raw smoke collector,
workflow gate는 변경하지 않았다. 기존 thumbnail/reboot 순수 함수를 재계산에 사용하며
원시 입력 객체를 변경하지 않는다. 출력에는 원시 상태/종료 코드/실패 수와 고정 reason을
남기고 경로·개인 값·실패 메시지 원문은 복사하지 않는다.

계획·이력 문서는 기존 내용을 보존하고 최신 상태/보고 링크만 갱신했다. 새 보고 위치는
승인된 `mydocs/working/`이며 공식 제품 문서는 이번 단계에서 변경하지 않았다.

## 검증 결과

### 후보와 원격 실행

- 검증된 소스: `24fdf323d83cd57c286fe129cc9932b4f86c0dab`.
- [Alhangeul CI run 34775083252, attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/34775083252/attempts/1):
  `ci.yml`, `profile=fast`, `scope=full`, completed/success.
- [Windows PowerShell job 103771648517](https://github.com/postmelee/alhangeul-tauri/actions/runs/34775083252/job/103771648517):
  Windows PowerShell 실행과 새 합성 회귀의 끝까지 통과를 로그에서 확인했다.
- [Node/Studio job 103771648572](https://github.com/postmelee/alhangeul-tauri/actions/runs/34775083252/job/103771648572):
  automation 702개, Studio 25파일/147테스트 및 빌드 통과. upstream·GUI typecheck·제품/버전/릴리즈 메타데이터 검사도 통과.
- `artifacts`, `installer`, native `Unit tests` 및 별도 PDF cleanup은 profile 비선택으로 skipped다.
  이를 제품 패키징·설치 또는 전체 통합 검증 통과로 세지 않는다.

Windows 로그 핵심 출력:

```text
Pure installer acceptance regressions passed; no installed product, provenance, release or reuse acceptance.
PowerShell contracts passed: 59 sources, 7 isolated tests
```

### 단계 종료 로컬 재검증

실행 명령:

```sh
node --test tests/ci-installer-acceptance.test.mjs tests/windows-installer-smoke.test.mjs tests/windows-thumbnail-assessment.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

결과: 집중 Node **29/29**, automation **702/702**, product boundary **548파일** 통과,
diff whitespace 오류 없음. 문서 마감 과정에서 원격 CI를 추가로 실행하지 않았다.
이 단계 마감 커밋은 검증 후보 이후의 문서 변경만 포함하며, Windows 검증 SHA를 마감 SHA로
바꾸어 기록하지 않는다. 승인받아 먼저 게시한 `16eee2e`·`24fdf32` 후보 소스 커밋과 이번
보고 커밋을 같은 `local/task57` 이력에 보존하고 squash/rebase/force push하지 않는다.

### 실패 회복 및 보조 재현

초기 후보 `16eee2e8d8b84835c5434dbf19f6dafbda925f8e`의
[run 34773600774](https://github.com/postmelee/alhangeul-tauri/actions/runs/34773600774)은
첫 정상 MSI 합성 사례에서 `invalid-common-evidence`로 실패했다. 이는 의도된 negative가
아니며 당시 이후 사례는 미실행이었다. 이 실패 run의 상태를 소급 변경하지 않는다.

승인된 Linux 보조 재현에서 파이프라인으로 감싼 문자열이 `-is [pscustomobject]`에
일치하여 객체 키 비교로 잘못 들어가는 원인을 확인했다. 실제
`System.Management.Automation.PSCustomObject` 타입으로 구분하고 양방향 타입 불일치를
거부하도록 수정했다. wrapper 문자열·JSON fixture·타입/대소문자·배열 차이 반례를 추가했다.

Linux PowerShell 7.4.13의 JSON Int64 차이는 임시 driver에서만 Int32 범위 변환으로
맞췄다. 해당 보조 통과를 Windows 수용으로 사용하지 않았으며, 이후 실제 Windows fast에서
변경하지 않은 JSON/bitmap 타입 계약으로 전체 회귀가 통과했다. 일회성 컨테이너와 임시
driver는 정리했고 저장소/기존 이미지는 보존했다.

## 잔여 위험

- 이 결과는 순수 판정의 합성 검증이다. 실제 설치 증거의 파일 read-back, JSON 중복 key,
  raw summary hash, archive digest·출처, upload·matrix 집계는 아직 연결하지 않았다.
- `reuseEligible=false`, `releaseAcceptance=unverified`를 유지한다. 과거 실패 producer를
  재사용 가능으로 바꾸거나 새 제품 source 검증으로 취급하지 않는다.
- PC방 유사 환경의 NSIS 썸네일 제한을 해결한 단계가 아니다. MSI 재부팅 후 동작과 최신
  진단 suite를 포함한 VDI 설치 양성 근거도 이 fast 결과로 대체하지 않는다.
- 사용자에게 MSI 대안을 안내하는 앱 UI와 최종 설치 검증은 기존 6.2/6.3에 남아 있다.
- #57 전체 완료, PR 준비, 공개 릴리즈 수용을 선언하지 않는다.

## 다음 단계 영향

6.1.2는 승인된 계획에 따라 IO adapter·실제 smoke gate·matrix 집계·producer 재사용 검증을
연결한다. 원시 실패를 보존하고 계약 성공과 제품 제한을 함께 표시한다. 기존 reusable
workflow의 소유 경계를 유지하며 Desktop entry에 옮겨진 job을 복제하지 않는다.
fast는 빠른 회귀용이며 workflow 연결의 최종 통합은 별도 승인된 exact full 실행으로 확인한다.

## 승인 요청

- Stage 6.1.1 산출물과 검증 결과를 검토하고 Stage 6.1.2 진입을 승인받는다.
- 이번 지시는 단계 완료 보고·커밋까지만 수행하며, 6.1.2 구현·추가 CI·원격 push·PR/이슈 종료는 하지 않는다.
