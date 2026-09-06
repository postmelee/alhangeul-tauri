# 변경 범위 기반 CI 검증

이 문서는 작업자가 필요한 검증을 선택하는 운영 계약이다. 개별 실행의 성패와 시간은 task 보고서에 기록한다. Actions artifact는 공식 릴리즈가 아니며 이 문서는 게시 권한을 부여하지 않는다.

## 계층과 책임

| 계층 | 입력 | 결과/소유권 | 대체하지 못하는 것 |
|---|---|---|---|
| 빠른 계약 | harness/source exact SHA | Node 계약·Studio·Windows PowerShell parser/회귀 | native ABI, 설치, Shell bitmap |
| core 진단 | product exact SHA, rhwp pin, OS | CLI release build·대표 fixture 성능/메모리 | installer와 desktop feature 조합 |
| 제품 생성 | product exact SHA, platform, tests 선택 | Rust 검사·Tauri·inventory·package lifecycle | 새 bytes의 별도 환경 수용 |
| 기존 artifact 검증 | product SHA + harness SHA + run/ID/digest | 같은 bytes의 installer/회귀 검사 | 변경된 제품 source 검증 |
| 전체 artifact 수용 | 모든 지원 platform 및 tests/core | 필수 job 상태 집계 | GUI·updater·공개 릴리즈 승인 |

빠른 계약 → 플랫폼별 제품 생성 → 해당 플랫폼 설치 검증 순서다. core 진단은 제품 생성과 병렬이며 전체 수용에서 합류한다. Windows 검증은 Linux 빌드 결과에 의존하지 않는다. 단계 자체가 실패하면 후속 gate는 실패·미검증 상태를 보존한다.

## 재사용 경계

제품 source가 달라지면 기존 installer는 새 source의 검증이 아니다. harness만 달라진 경우 product SHA와 harness SHA를 별도로 고정한다. source build workflow SHA와 실제 checkout SHA가 다를 수 있으므로 run head SHA만으로 제품 provenance를 단정하지 않는다. 재사용 경로는 같은 SHA로 workflow/source를 실행한 생산 run만 허용하고 archive metadata와 다운로드 bytes를 검증한다.

기존 artifact는 정확한 repository/run/workflow/ID/name/digest, 만료 여부 및 성공한 producer를 검사한다. 검증 전에 압축 bytes SHA-256을 재계산하고, 추출 후 inventory를 재계산한다. 누락·만료·불일치·중복·실패한 producer는 거부한다. latest 검색이나 artifact 이름만으로 대체하지 않는다.

새 제품 inventory에는 `sourceSha`를 기록한다. 과거 inventory는 일반 파일 검증에서 계속 읽을 수 있지만 sourceSha가 없는 과거 artifact를 새 재사용 profile에 넘기면 거부한다. 새로운 provenance를 갖춘 제품 artifact를 한 번 생성해야 한다. 검사 버전은 harness의 package.json이 아니라 product SHA의 package.json에서 가져온다.

#19의 GUI/PDF handoff와 #57의 installer 진단은 별도 진행 중인 기능이다. 이 작업은 해당 branch의 미완료 제품 source를 가져오지 않는다. 후속 통합 때 공통 handoff와 빠른 Windows test 목록에 연결하되 기존 실제 진단과 gate 의미를 보존한다.

## 상태 해석

- `passed`: 명시한 계층의 실제 검사 통과.
- `failed`: 실행 또는 필수 증거 검증 실패. 진단 upload 성공으로 상쇄하지 않는다.
- `skipped`: 선택하지 않았거나 선행 실패로 건너뜀. 통과가 아니다.
- `reused`: 고정된 기존 bytes 사용. 새 제품 빌드 통과가 아니다.
- `unverified`: 필요한 검사를 수행하지 않았거나 근거가 부족함.

부분 profile 성공에는 전체 artifact 수용이라는 표현을 사용하지 않는다. `run_tests=false`, 단일 platform, core 생략, 기존 artifact만의 검증은 부분 검증이다. 릴리즈에는 [최소 체크리스트](RELEASE_CHECKLIST.md)가 별도로 적용된다.

## 측정 기준

run ID·attempt·head SHA·workflow path와 job/step의 started_at/completed_at을 보존한다. job wall time과 step 합계를 구분하며 병렬 job 시간을 더해 사용자 대기 시간으로 표시하지 않는다. job 시작 전 경과 시간은 dependency/runner 대기 등이 섞여 있어 runner queue 시간으로 단정하지 않는다. 미완료·skipped step은 0초 통과로 환산하지 않는다.

| 기준 run | Windows 제품 build | core | Rust 검사 묶음 | thumbnail build | Tauri | Cargo restore |
|---|---:|---:|---:|---:|---:|---:|
| [34047889263](https://github.com/postmelee/alhangeul-tauri/actions/runs/34047889263) | 24:51 | 7:30 | 5:12 | 2:19 | 5:18 | 2:09 |
| [34052696931](https://github.com/postmelee/alhangeul-tauri/actions/runs/34052696931) | 34:37 | 10:24 | 6:40 | 3:14 | 7:33 | 2:11 |

두 run은 #57의 서로 다른 source이며 통제된 동일 SHA A/B 실험이 아니다. 동일 3.4 GB primary cache hit로 post-save가 생략됐지만 여러 profile/feature의 rhwp 컴파일은 반복됐다. 캐시 hit를 컴파일 재사용과 동일시하지 않는다. Tauri beforeBuild의 두 번째 thumbnail 빌드는 1초 미만이어서 우선 병목으로 취급하지 않는다.

비교 때 runner image/CPU 편차, toolchain, Cargo lock, feature/profile/target, cache restored key와 cold/warm 여부를 기록한다. core CLI host release와 desktop target release, debug test, protocol-only 조합을 근거 없이 하나로 합치지 않는다. 단계 누락으로 줄어든 시간과 동일 workload의 개선을 구분한다.

GitHub의 [reusable workflow 계약](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)과 [cache 전략](https://github.com/actions/cache/blob/main/caching-strategies.md)을 따른다. 같은 저장소의 상대 workflow 호출은 caller commit의 정의를 사용하며 checkout source와 별도로 기록한다.
