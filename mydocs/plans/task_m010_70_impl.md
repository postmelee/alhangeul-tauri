# Task #70 구현계획서 — updater 키 교체·복구·서명 검증

수행계획서: [task_m010_70.md](task_m010_70.md)
GitHub Issue: [#70](https://github.com/postmelee/alhangeul-tauri/issues/70)
마일스톤: M010

작성일: 2026-09-20. 상태: Stage 3 full·서명 attempt 2·산출물 독립 검증 완료, Stage 4 승인 대기.
기준 source: `cf0aac9de32451e55a686aa09677d1d00bd4648b`.
실행 계획과 진행 기록을 함께 관리한다. 최종 Stage 3 수용 근거는
[Stage 3 보고서](../working/task_m010_70_stage3.md)에 고정한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 보관·실행 준비 | 비밀을 제외한 보관/책임·도구·입출력 안전성 결정 | 보관 수단, 도구와 기존 공개 상태 확인 |
| 2 | 생성·백업·복구 | 저장소 밖 키/백업, 공개 fingerprint, 복구 시험 결과 | 복구 키 서명 성공·변조 자료 거부 |
| 3 | 신뢰 키 전환·CI | 공개키·계약·운영 문서, 두 Secret, 미게시 서명 산출물 | fast/full 및 세 installer 서명·inventory |
| 4 | 최종 보고·인계 | 최종 보고서와 #69 인계 | 증거 정합성·한계·비밀 비포함 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 운영 정책 | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | 현재 fingerprint·복구 책임 최소 수정 |
| 현재 신뢰 계약 | `docs/architecture/` | `docs/architecture/UPDATER.md` | OK | Stage 1 보고 후 승인된 현재 fingerprint 정합화 |
| 필요 시 현재 버전 기록 | `docs/releases/` | `docs/releases/v0.1.0.md` | OK | 과거 키 증거는 보존, #69 작업과 통합 시 대조 |
| 계획 | `mydocs/plans/` | `task_m010_70.md`, `task_m010_70_impl.md` | OK | 승인 상태와 실행 경계 |
| 단계 보고 | `mydocs/working/` | `task_m010_70_stage{N}.md` | OK | 비밀·실제 보관 경로 제외 |
| 최종 보고 | `mydocs/report/` | `task_m010_70_report.md` | OK | 공개 fingerprint와 수용 근거 |
| 오늘할일 | `mydocs/orders/` | 실제 작업일의 날짜 파일 | OK | #69 원래 worktree는 수정하지 않음 |

기존 300 LOC 초과 운영/버전 문서는 필요한 절만 보완하며 재구성하지 않는다.

## 실행 승인 경계

- 구현계획 승인 후 Stage 1 조사·준비만 시작한다.
- **A — 생성·복구**: 저장 수단·책임, 도구 버전/환경, 안전한 암호 입력, 복구·정리 절차를
  확정하고 승인받은 후 Stage 2를 실행한다. 비밀이나 실제 보관 경로는 승인 메시지에 넣지 않는다.
- **B — Secret 전환**: 복구 성공, 새 공개 fingerprint, 변경할 두 Secret 이름,
  signing run 부재와 부분 실패 대응을 확인하고 승인받는다.
- **C — 원격 검증**: push할 exact SHA/ref와 workflow/입력·비게시 조건을 제시하여 승인받는다.
  fast 확인과 최종 full/signed 실행 사이에 source가 달라지면 변경된 SHA를 다시 제시한다.
- **D — PR**: 모든 단계 수용·최종 보고 후 PR 게시와 merge를 해당 절차로 진행한다.
- Release·tag·Pages 게시와 updater 활성화는 어떤 단계 승인에도 포함하지 않는다.

## Stage 1 — 보관·실행 준비

### 준비 조사 현황 (2026-09-20)

- 사용자는 비밀번호 보관 수단으로 Apple 암호 앱을 선택했으며, 이후 새 암호화 키를 iCloud에
  백업하는 방향으로 진행 승인했다. 원본은 저장소 밖 접근 제한 위치에 둔다. 암호 앱에 키와
  암호를 함께 넣지 않는다. 같은 Apple 계정 의존 위험은 남으며 클라우드 동기화·복구를 확인해야 한다.
- 사용자가 기존 백업 후보를 찾았다. 형식 검사는 Tauri/Minisign 암호 보호 표식을 확인했으나,
  별도 승인한 빈 암호 1회 시험에서 checksum이 불일치했다. 암호 불일치와 파일 손상은 구분하지
  못하며 현재 제품과 같은 키인지도 미확인이다. 후보는 그대로 보존하고 새 키 전환을 계속한다.
- GitHub 공개/초안 Release 0개, `v0.1.0*` tag 없음. 저장소의 in_progress/queued/waiting
  run 조회는 각각 0개였다. 실행 직전에 다시 확인해야 하는 일시적 관측이다.
- release 환경의 두 Secret 이름과 기존 갱신 시각을 확인했다(값 미조회). required reviewer는
  postmelee이며 deployment branch policy는 null이었다. 보호 규칙은 변경하지 않았다.
- lock에 고정된 Tauri CLI는 2.10.1이다. 해당 [generate 소스](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.10.1/crates/tauri-cli/src/signer/generate.rs)는
  write-keys 생략 시 개인키를 출력하며, CI 모드에서 암호를 생략하면 빈 암호를 사용한다.
  따라서 두 경로를 금지하고 사용자 직접 암호 입력·파일 저장·출력 격리를 준비해야 한다.
- [key helper 소스](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.10.1/crates/tauri-cli/src/helpers/updater_signature.rs)에서
  암호 미지정 시 interactive prompt, 파일 생성은 기본 파일 권한에 의존함을 확인했다.
  `umask 077`, 원본과 public 파일 모두 없는 새 위치, 비밀 argv 금지 등의 실행 검토가 필요하다.
- Colima는 실행 중이고 Docker server는 linux/arm64 29.2.1이다. 하지만 image 목록 조회가
  containerd blob의 input/output error로 실패했다. 사용 가능한 생성 환경으로 아직 수용하지 않는다.
  restart/prune/reset/삭제·새 container 실행은 하지 않았다. 환경 복구나 대안은 별도 제안한다.
- 후속 읽기 전용 확인에서 Mac 여유 약 31 GiB, Linux VM root 약 18 GiB,
  containerd volume 약 42 GiB였다. 단순 디스크 포화로 단정할 근거는 없다.
  VM 직접 Linux shell은 동작하나 Node/pnpm/minisign은 없었다. 기존 컨테이너는 변경하지 않았다.
- **계획 변경 승인**: Docker 복구/추가 Linux 런타임 설치 대신 기존 Mac의 고정
  Tauri CLI 2.10.1을 키 생성·복구 관리에만 사용한다. 이는 Rust/Tauri 제품 build·native 검증이나
  Mac 배포 지원이 아니며 제품 검증은 기존 Windows/Linux CI에 유지한다. 사용자 `진행해줘`로
  변경을 승인받은 뒤 실제 `--version`, `signer generate --help`, `signer sign --help`를 확인했다.
- 현재 fingerprint는 `docs/architecture/UPDATER.md`에도 있다. Stage 1 보고 후 Stage 2 진행
  승인과 함께 정합성 대상 추가를 승인받았다(기존 architecture 루트, 현재 신뢰 계약의 단일 값 보정).
  #16 계획·보고서의 과거 fingerprint는 그대로 보존한다.
- 키 생성·복구는 아래 사용자 직접 입력 절차로 준비 완료했다. Stage 2 승인 전 키 생성은 하지 않는다.

### 사용자 직접 입력 절차

1. 사용자가 Apple 암호 앱에 이 작업 전용의 충분히 긴 무작위 암호를 저장한다. 암호 값은
   에이전트 도구·채팅·스크린샷·명령 인자로 전달하지 않으며 저장 완료 여부만 확인한다.
2. 생성은 사용자의 별도 로컬 터미널에서 수행한다. 화면/터미널 내용을 에이전트가 캡처하지 않는다.
   저장소·동기화 폴더 밖 새 원본 디렉터리를 선택하고 기존 키와 `.pub` 모두 없는지 확인한다.
3. `umask 077`, core dump 금지, tracing 금지, `CI`와 signing 관련 상속 변수를 제거한 환경에서
   고정 CLI의 `signer generate --write-keys`를 사용한다. `--password`, `--ci`, `--force`는 쓰지 않는다.
   암호 앱의 암호를 숨김 프롬프트에 직접 입력한다. 빈 암호는 허용하지 않는다.
4. CLI stdout은 표시하지 않아 실제 보관 경로가 수집되지 않게 한다. 오류 발생 시 원문 출력을
   붙여넣지 않고 에이전트가 비밀을 제외한 확인 절차를 안내한다. 자동 private-key 출력 경로는 금지한다.
5. 생성 후 암호화 파일과 public 파일을 새 iCloud 백업 항목으로 복사한다. 이전 백업은 덮어쓰지 않는다.
   클라우드 동기화 완료 및 별도 내려받기를 확인하기 전 로컬 복사 성공을 원격 백업 완료로 기록하지 않는다.
6. 실제 내려받은 백업에서 별도 임시 위치로 복구하여 동일 CLI의 `signer sign` 숨김 입력으로
   공개 테스트 자료에 서명한다. 서명 검증에는 저장소의 기존 공개키 검증 도구를 사용한다.
   변조 자료 거부, 공개 fingerprint 일치, 파일 권한을 확인한 뒤 정확한 임시 대상만 정리한다.
7. 암호 앱 저장·iCloud 복구는 사용자 확인이 필요하다. 완료되지 않으면 Stage 2를 완료하지 않고
   Secret도 유지한다. 양쪽 보관이 같은 Apple 계정에 의존한다는 위험을 인계한다.

### 산출물

- `mydocs/working/task_m010_70_stage1.md`, 필요 시 본 구현계획의 실행 입력 보정.
- 오늘할일 상태. 제품/공개키/Secret은 변경하지 않는다.

### 변경 내용

1. 사용자에게 보관 수단 종류와 책임 확인만 요청한다. 실제 경로·암호·키를 채팅에 요구하지 않는다.
   원본 저장소 밖 접근 제한, 독립 암호화 복구본, 별도 암호 관리의 세 조건을 확인한다.
   동일 디스크의 복사본이나 Docker volume만으로 독립 백업을 충족했다고 보지 않는다.
2. 승인된 키 관리 실행 환경과 고정 CLI 버전을 확인한다. 기존 컨테이너는 재사용/중지하지 않는다.
3. 고정 CLI의 생성·서명 동작을 공식 문서/소스로 확인한다. private material 자동 출력,
   암호 argv 노출, env dump, tracing, container inspect/log, 임시 파일 잔류 위험을 점검한다.
   안전성이 불분명하면 실행하지 않고 도구/입력 방식을 보정해 승인받는다.
4. 생성·복구는 user가 직접 비밀 입력을 제어할 수 있는 절차를 우선한다. CLI가 키를 출력한다면
   민감 출력은 보호된 로컬 경로로만 격리하고 tool response에는 성공 여부와 공개 정보만 전달한다.
   반복 사용할 안전 helper가 꼭 필요하면 파일·테스트·범위를 별도 승인받으며 즉시 추가하지 않는다.
5. 공개 Release/tag 존재 여부, release 환경 Secret 이름·권한·보호 규칙과 실행 중/대기 중
   signing run을 읽기 전용으로 확인한다. 타인의 run을 취소하거나 보호 규칙을 완화하지 않는다.
6. 공개키 및 fingerprint 소비 지점을 분류한다. 현재 정책은 변경 대상으로, 과거 보고서/실행
   근거는 보존 대상으로 나눈다. GitHub Secret 값은 조회하거나 추출하려 하지 않는다.

### 검증

- 보관 책임·독립 백업·암호 관리 수단 확인. 미확정이면 Stage 1은 완료하지 않는다.
- 안전한 생성/복구/정리 절차와 고정 CLI 버전, 승인된 키 관리 환경의 실행 가능성을 확인한다.
- `git diff --check`; #69 원래 worktree 변경 보존 확인.

### 커밋

`Task #70 Stage 1: 키 보관 책임과 안전한 생성·복구 절차 확정`

## Stage 2 — 생성·백업·복구

진행 상태(2026-09-22): 승인 A에 따라 사용자가 생성·암호 앱 저장·iCloud 백업 및
별도 내려받은 복구본 서명 절차의 완료를 보고했다. 에이전트는 공개 자료만으로 서명 성공,
변조 거부와 백업 공개키 일치를 검증했다. 실제 클라우드 내려받기는 사용자 확인에 근거한다.
사용자가 원본·iCloud 백업을 보존하고 시험용 복구 파일 두 개의 정리를 완료했다고 확인했다.
복구 당시 권한은 독립 확인하지 못했으며, 정리 확인으로 임시본 보유 종료를 기록한다.
Stage 2 검증은 완료했고 Secret은 변경하지 않았다.
상세 근거는 [Stage 2 보고](../working/task_m010_70_stage2.md)에 기록한다.

### 산출물

- 저장소 밖의 접근 제한된 암호화 원본과 독립 복구본, 별도 credential store의 암호.
- 공개키/fingerprint와 `mydocs/working/task_m010_70_stage2.md`의 결과만 기록.

### 변경 내용

1. 승인 A의 절차로 새 키를 생성한다. 기존 파일 덮어쓰기나 기존 키 삭제는 하지 않는다.
2. 독립 보관소로 암호화 백업을 옮기고 사용자에게 보관·접근 가능 여부를 확인받는다.
3. 실제 백업을 새 격리 위치로 복구한다. 원본 파일을 다시 읽는 시험으로 대체하지 않는다.
4. 별도로 보관된 암호를 사용하여 공개 테스트 자료에 서명한다. 새 공개키로 서명을 검증하고
   변조한 자료는 거부되는지 확인한다. 이 결과를 installer 서명 성공으로 확대하지 않는다.
5. 권한·입출력·정리 결과를 확인한다. 임시 민감 자료만 정확한 대상·복구본 보존을 확인한 뒤
   승인된 절차로 정리하며 원본/백업을 삭제하지 않는다. SSD의 완전 소거를 보장한다고 하지 않는다.
6. 보관 확인, 공개 fingerprint, 복구 서명과 negative 결과만 보고한다. Secret은 아직 유지한다.

### 검증

- 실제 복구 키의 서명을 새 공개키로 검증 성공, 동일 signature의 변조 자료 검증 실패.
- 별도 credential store의 암호로 복구 키 사용 성공; 원본·복구본 존재와 보관 책임 확인.
- 저장소 diff/추적 대상에 private material 없음. `git diff --check` 통과.

### 커밋

`Task #70 Stage 2: 새 updater 키의 독립 백업과 복구 검증 기록`

## Stage 3 — 신뢰 키 전환·CI 검증

### 로컬 후보 진행 결과 (2026-09-22)

- Stage 2 보고 후 사용자의 `진행해줘`로 공개키·검증 기준 교체와 로컬 회귀를 승인받았다.
- tracked overlay, metadata 계약·회귀, 운영·아키텍처 문서의 현재 fingerprint를 새 값으로 교체했다.
  과거 #16 기록은 보존하고 정상 형식의 이전 공개키도 거부하는 회귀를 추가했다.
- `pnpm run check:product-version`, `pnpm run check:release-metadata` 통과.
- `node --test tests/release-metadata.test.mjs tests/updater-release.test.mjs tests/pages.test.mjs`:
  69 tests, 69 pass, 0 fail, 0 skipped.
- 새 tracked 공개키와 복구 공개키의 일치, 해당 키로 복구 시험 서명 성공·변조 거부를 재검증했다.
- `git diff --check` 통과. #69 원래 worktree diff hash 불변을 확인했다.
- version·endpoint·native·installer·lock·workflow는 변경하지 않았다. Secret과 원격은 미변경이다.
- 이 결과는 로컬 후보 검증이며 Stage 3 전체 완료나 실제 installer 서명 수용이 아니다.
  후보 커밋의 exact SHA를 제시하고 `publish/task70` push 및 `ci.yml profile=fast` 승인을 받았다.

### 원격 fast 결과 (2026-09-22)

- 승인한 `70fa1dd407ec4abcbe3cf496f7ec01aee884377c`를 `publish/task70`에 push했다.
- [run 35681649719](https://github.com/postmelee/alhangeul-tauri/actions/runs/35681649719),
  attempt 1, `.github/workflows/ci.yml`, `workflow_dispatch`, head SHA는 위 후보와 일치한다.
- 입력: `profile=fast`, `scope=full`, `thumbnail_context_experiment=false`.
- 전체 conclusion `success`: select, Windows PowerShell contracts, Node and Studio contracts 성공.
  artifacts, installer, native Unit tests 및 Windows PDF cleanup은 범위 밖으로 skipped다.
- fast 성공은 제품 빌드·설치·새 키 installer 서명 성공이 아니다. full/signed 검증은 미실행이다.
- release 환경의 required reviewer postmelee, branch policy null을 재확인했다. Secret 두 이름은
  존재하며 갱신 시각은 기존 2026-08-29로 유지됐다. 원문은 읽지 않았고 값을 변경하지 않았다.
- 최근 100개 run 조회에서 미완료 실행은 없었다. 전환 직전에는 활성/대기 상태를 다시 확인한다.
- 다음은 승인 B로 두 signing Secret을 함께 전환하는 절차다. 부분 실패 시 서명을 실행하지 않고
  새 키·암호 쌍 정합화를 완료한다. 기존 키로 rollback 가능하다고 가정하지 않는다.
- 이 결과 기록은 로컬 문서에만 남긴다. 검증 후보 SHA를 바꾸는 추가 push는 하지 않았다.

### Secret 전환 확인 (2026-09-22)

- 사용자가 승인 B로 전환을 지시하고 로컬 터미널의 두 Secret 등록 완료를 확인했다.
  입력 절차는 복구 검증 공개키와 원본의 공개키를 비교하고, 암호는 숨김 입력·stdin으로 전달했다.
- 전환 전 in_progress/queued/waiting/pending을 각각 조회해 실행이 없음을 확인했다.
- 두 Secret의 갱신 시각이 모두 `2026-09-22T03:22:13Z`로 바뀌었다. 값은 조회하지 않았다.
  사용자 완료 확인과 metadata 변경은 등록 근거이며 키·암호 쌍의 암호학적 정합성 증거가 아니다.
- 원격 `publish/task70`은 `70fa1dd407ec4abcbe3cf496f7ec01aee884377c`를 유지한다.
- 승인 C 요청: 같은 후보에서 `ci.yml profile=full scope=full` 및
  `alhangeul-desktop.yml mode=updater`, exact `build_ref`, `run_tests=true`,
  `release_version=0.1.0`, `release_tag=v0.1.0`,
  `release_notes=Task 70 signing verification only; no publication`, `publish_release=false`.
  썸네일 환경 실험은 false로 유지한다. 아직 두 workflow를 실행하지 않았다.
- 서명 build에는 release 환경 수동 승인이 필요하다. full 성공과 별도로 생성된 세 installer의
  실제 bytes·서명을 새 공개키로 검증한다. Release/tag/Pages 게시와 updater 활성화는 제외한다.

### 원격 통합·서명 검증 실행 (2026-09-22)

- 사용자 `진행해줘`로 승인 C를 받은 뒤 원격 후보 SHA와 중복 실행 부재를 확인했다.
- [full run 35683014919](https://github.com/postmelee/alhangeul-tauri/actions/runs/35683014919):
  `ci.yml`, `profile=full`, `scope=full`, `thumbnail_context_experiment=false`.
- [서명 run 35683016977](https://github.com/postmelee/alhangeul-tauri/actions/runs/35683016977):
  `alhangeul-desktop.yml`, `mode=updater`, `run_tests=true`, `artifact_platform=all`,
  `validation_profile=full`, `thumbnail_context_experiment=false`, `release_version=0.1.0`,
  `release_tag=v0.1.0`, `release_notes=Task 70 signing verification only; no publication`,
  `publish_release=false`.
- 두 실행의 head SHA와 서명 build_ref는 모두 `70fa1dd407ec4abcbe3cf496f7ec01aee884377c`다.
- 초기 관측: full queued, 서명 waiting 및 release 환경 승인 대기. 사용자에게 승인을 요청한다.
  보호 규칙을 변경하거나 환경 승인을 대신 수행하지 않았다. 완료·서명 성공은 아직 미확인이다.

### 서명 실행 실패 관측 (2026-09-22)

- run 35683016977은 failure다. 두 플랫폼 모두 `Build signed updater bundles`에서
  `incorrect updater private key password: Wrong password for that key`로 실패했다.
- Windows는 MSI·NSIS bundle 경로 출력 후 키 복호화가 실패했다. 업로드 artifact는 0개이며
  inventory 검증과 publish job은 skipped다. 생성 중인 파일을 수용된 서명 산출물로 간주하지 않는다.
- workflow는 release 환경의 두 signing Secret을 Tauri 환경변수에 직접 매핑한다.
  source에서 별도 암호 변환은 확인되지 않았다. 로컬 복구 서명 성공과 달리 CI에 전달된 조합은
  복호화되지 않았다. 잘못된 암호 입력·다른 개인키 선택·전달 문제 중 세부 원인은 아직 미확정이다.
- 별도 full run 35683014919는 조회 시 Windows 제품 build 진행 중이었다. fast, 세 core 및
  Linux 두 target build는 성공했으나 전체 full 성공으로 기록하지 않는다.
- Secret을 다시 바꾸거나 실패 run을 재실행하지 않았다. 다음 조치는 사용자 로컬에서 실제
  등록할 개인키와 암호의 조합을 먼저 검증한 뒤 승인된 Secret 재등록을 수행하는 것이다.
  새 키 생성·제품 코드 변경이 필요하다는 근거는 현재 없다.

### 암호 불일치 보정과 재등록 (2026-09-22)

- 사용자 승인으로 원본·iCloud 백업 개인키의 바이트 동일 여부만 비교해 일치를 확인했다.
  파일 내용·hash는 출력하지 않았으며 키 파일을 변경하지 않았다.
- 사용자가 키 생성 때 입력한 암호와 암호 앱에 저장했던 자동 생성 암호가 달랐음을 확인했다.
  실제 생성 암호로 Tauri 직접 입력 서명이 성공했고 암호 앱 항목을 수정했다고 보고했다.
- 이후 사용자가 수정한 암호를 한 번 입력해 로컬 서명·tracked 공개키 검증을 수행하고,
  검증된 동일 메모리 값으로 두 Secret을 등록하는 절차의 완료를 확인했다.
- 두 Secret 갱신 시각은 모두 `2026-09-22T04:20:59Z`다. 원문 read-back은 하지 않았다.
  실제 CI에서 같은 키로 서명되는지는 아직 재검증 전이다.
- full run 35683014919는 최종 success이며 source는 `70fa1dd407ec4abcbe3cf496f7ec01aee884377c`다.
  원격 후보도 동일 SHA를 유지한다. full 성공은 모든 사용자 환경의 썸네일 성공 보장이 아니다.
- 기존 서명 run 35683016977 attempt 1의 실패는 보존한다. full을 반복하지 않고
  같은 후보·미게시 입력의 서명 workflow만 재실행하도록 승인을 요청한다.
- 새 키 생성·제품 변경·원격 추가 push·CI 재실행·릴리즈 게시를 수행하지 않았다.

### 산출물

- `apps/desktop/src-tauri/tauri.updater.conf.json`의 공개키.
- `scripts/check-release-metadata.mjs`의 공개 fingerprint 및 직접 영향받는 회귀 테스트.
- `docs/operations/DESKTOP_RELEASE.md`의 현재 fingerprint, 필요 시 현재 버전 기록.
- GitHub release 환경의 두 signing Secret과 비게시 CI 증거.
- `mydocs/working/task_m010_70_stage3.md`.

### 변경 내용

1. 공개키·fingerprint를 같은 변경으로 적용하고 과거 기록은 유지한다. version/endpoint,
   updater native/설치 로직·lock·workflow는 변경하지 않는다.
2. 아래 로컬 회귀를 통과한 후보를 `publish/task70`에 게시할 승인을 받는다.
   CI 선행 push는 검증용이며 최종 보고 전 PR은 만들지 않는다. 원격 `local/task70`은 만들지 않는다.
3. fast 계약 성공 후 승인 B로 두 Secret을 전환한다. 실행 직전 signing run과 보호 규칙을
   다시 확인한다. 입력은 안전한 stdin/비밀 입력 경로를 쓰고 argv·명령 출력·shell history에 넣지 않는다.
   일반 GitHub Secret 목록의 존재/갱신 시각은 내용 일치 증거가 아님을 명시한다.
4. 두 쓰기는 원자적이지 않다. 일부만 성공하면 signed build를 실행하지 않고 전환 미완료로
   보고한다. 기존 원문 복구는 가정하지 않으며 승인된 새 쌍으로 일치시킨 뒤 진행한다.
5. 승인 C로 같은 exact SHA의 `ci.yml profile=full`과 기존 desktop `mode=updater`,
   `publish_release=false`를 실행한다. 모든 입력·run/attempt/head SHA를 기록한다.
   updater 입력은 현재 version `0.1.0`, tag 문자열 `v0.1.0`, 비어 있지 않은 검증용 notes로
   제안하되 실행 직전에 제품 version과 대조한다. 문자열 입력만으로 tag를 생성하지 않는다.
6. 한 성공 signing run의 Windows MSI·NSIS·각 sig, Linux AppImage·sig 및 complete inventory를
   내려받는다. archive ID/digest/만료, 실제 bytes hash와 새 공개키 서명, source SHA를 검증한다.
   기존 `check:updater-artifacts` 도구로 재계산하고 complete inventory와 대조한다.
7. publish job skipped와 Release/tag/Pages 미게시를 확인한다. 재사용/부분 통과를 새 제품
   수용으로 격상하지 않는다. full의 NSIS 제한 계약과 실제 bitmap 관측을 구분해 기록한다.

### 검증

```sh
pnpm run check:product-version
pnpm run check:release-metadata
node --test tests/release-metadata.test.mjs tests/updater-release.test.mjs tests/pages.test.mjs
git diff --check
```

- 빠른 원격 계약은 `ci.yml profile=fast`, 최종 통합은 `profile=full`.
- ordinary workflow와 checkout SHA를 일치시킨다. signed run도 같은 SHA를 사용한다.
- 기존 `check:updater-artifacts`에 root/version/tag/source-sha/public-key-env를 명시하여
  세 target의 서명을 확인한다. public key env에 private key를 넣지 않는다.
- old key의 서명 시험 성공 기록은 새로운 key/installer 수용 근거로 사용하지 않는다.
- Mac에서는 Rust desktop/Tauri build를 실행하지 않는다. 새로운 설치 GUI 반복 수용은 #69 범위다.

### 커밋

- 필요 시 CI 후보: `Task #70 [Stage 3.1]: updater 공개키와 검증 계약 전환`
- 단계 완료: `Task #70 Stage 3: 새 키 CI 서명과 산출물 재검증 완료`

## Stage 4 — 최종 보고·인계

### 산출물

- `mydocs/working/task_m010_70_stage4.md`, `mydocs/report/task_m010_70_report.md`, 오늘할일.
- 필요 시 현재 버전 기록의 키 전환 사실만 최소 보완한다.

### 변경 내용

- 보관/복구 완료 여부, 공개 fingerprint, 두 Secret 전환, 검증한 SHA/run/attempt/bytes를 정리한다.
- 기존 시험 설치본 재설치와 #69 최종 공개 후보의 별도 bytes 검증 필요성을 인계한다.
- #69의 원래 worktree·미커밋 변경은 유지한다. merge 후 #69를 재개할 때 보드와 버전 기록의
  양쪽 변경을 보존하여 통합한다. #70 종료로 #69를 완료 처리하지 않는다.
- 최종 보고 및 PR은 `task-final-report`, merge 후 정리는 `pr-merge-cleanup` 절차를 따른다.

### 검증

- 단계별 근거/공개 fingerprint 일치, 비밀·실제 보관 경로 비포함, `git diff --check` 통과.
- PR 준비 전 #70 clean, #69 변경 보존. 공개 동작 미실행 확인.

### 커밋

`Task #70 Stage 4 + 최종 보고서: 서명 키 교체 수용과 첫 공개 인계`

## 검증

- 각 단계 검증 후에만 해당 보고서를 완료로 기록한다. 실패나 증거 누락을 통과로 표시하지 않는다.
- [CI 검증 가이드](../../docs/operations/CI_VALIDATION.md)의 profile과 exact artifact 경계를 따른다.
- 문서-only 결과 기록 후 native 재실행은 제품/검사 영향이 없음을 diff로 확인한 경우 생략한다.
- 새로운 도구·제품 변경·보관 수단 변경이 필요하면 실행 전에 계획을 보정하고 승인받는다.

## 커밋

- 각 단계 산출물과 단계 보고서를 함께 커밋한다. 키/암호/백업은 어떤 커밋에도 포함하지 않는다.
- Stage 3 CI 후보 push는 필요한 예외이며, 최종 보고 이전 PR 게시·merge를 허용하지 않는다.

## 단계 의존성

Stage 1 승인 및 실행 승인 A → Stage 2 복구 성공 → Stage 3 승인 B/C 및 검증 → Stage 4 인계.
키/Secret 전환 전 보관·복구가 미확정이면 기존 상태를 유지하고 차단 조건을 보고한다.

## 위험과 대응

- **보관 수단 미정**: Stage 1에서 사용자 선택. 비밀번호나 실제 보관 위치 공개를 요구하지 않는다.
- **Secret과 옛 source 불일치**: 전환 뒤 옛 ref로 signed build 금지. 새 후보로만 검증한다.
- **원본 분실 반복**: 백업과 암호의 복구 경로를 책임자가 관리하며 보고서에는 확인 여부만 기록한다.
- **민감 자료 임시 노출**: 출력 캡처/권한/정리를 생성 전에 검토하고 노출 의심 시 작업 중단.
- **검증 과장**: 서명 성공, full 계약 성공, 실제 앱 설치, 공개 후 N→N+1을 구분한다.

## 승인 요청 사항

- 4단계 산출물·검증·커밋과 실행 승인 A/B/C/D, 검증용 선행 push 예외.
- 승인 후 Stage 1 보관 수단과 안전한 실행 절차를 확인한다. 키 생성·Secret 변경은 아직 하지 않는다.
