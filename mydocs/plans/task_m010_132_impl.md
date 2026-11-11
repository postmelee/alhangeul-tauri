# Task #132 — Windows 썸네일 수정 구현계획서

수행계획서: [task_m010_132.md](task_m010_132.md)
GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)
마일스톤: M010

2026-11-11 수행계획 승인과 이슈 해결까지 연속 진행 지시를 적용한다. PR 생성 전 보고한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 공개 NSIS 실행 문맥 비교 | 격리 Windows 관측 workflow/helper | hash, token, 실제 Shell probe, cleanup |
| 2 | 원인에 따른 최소 수정 | handler/등록/installer 또는 실행 문맥 | 수정 전/후 기능 회귀 |
| 3 | 실제 Windows 수용 | 설치 생명주기·Explorer 증거 | 새 이미지/타사 연결/MSI 회귀 |
| 4 | 최종 보고 | 기존 공식 문서·최종 보고 | 계약 일치, PR 전 보고 |

## 문서 위치 확인

계획에 승인된 docs/architecture, docs/operations, 필요 시 README 및 mydocs 작업 산출물만 사용한다.
새 공식 문서 루트나 제품 매뉴얼을 만들지 않는다.

## Stage 1 — 공개 NSIS 실행 문맥 비교

### 산출물

- `scripts/windows-thumbnail-user-context.ps1`: 폐기 가능한 hosted VM에서만 실행하는 부모.
- `scripts/windows-thumbnail-user-probe.ps1`: 해당 사용자의 실제 profile에서 설치·probe·제거.
- `.github/workflows/alhangeul-thumbnail-user-context.yml`, `ci.yml`의 기본 false opt-in.
- `tests/windows-thumbnail-user-context.test.mjs`: 정책 개입 없는 opt-in 및 고정 입력 회귀.

### 변경 내용

공개 v0.1.3 NSIS를 고정 URL/SHA256로 다운로드하고 원본 bytes를 변경하지 않는다.
서로 별도 VM에서 기존 elevated runner와 신규 임시 표준 사용자(관리자 그룹에 추가하지 않음)의
profile에 동일 설치 파일을 설치한다. 후자는 OS 전역 UAC/제품 HKLM 등록을 변경하지 않고
`Start-Process -Credential -LoadUserProfile`로 실제 비관리자 로그인 token을 사용한다.
임시 credential은 무작위로 메모리에서만 생성하며 로그·artifact에 기록하지 않는다.
계정·profile은 해당 VM이 소유한 것만 정리한다. 각각 다른 계정이므로 동일 사용자 token
일변수 실험으로 주장하지 않으며 registry/hash/token 증거와 기존 VDI 결과를 함께 해석한다.

probe는 공개 fixture 고유 복사본을 쓰고 기존 state/association/activate/Shell/force-extract를
재사용한다. 설치 파일·설치 DLL/worker·fixture hash와 각 HRESULT/bitmap을 보존한다.
미실행·실패를 원인 확정/제품 수용으로 바꾸지 않는다. Explorer 실제 표시는 Stage 3 별도다.
기존 #57 HKLM overlay/보호 경로 실험은 실행하지 않는다.

### 검증

- 로컬 `node --test tests/windows-thumbnail-user-context.test.mjs`, `pnpm run test:automation`,
  `pnpm run check:product-boundary`, `actionlint -shellcheck='' .github/workflows/*.yml`, `git diff --check`.
- 승인된 publish/task132의 exact SHA로 `ci.yml profile=fast, thumbnail_user_context=true`.
  fast 뒤 격리 Windows 두 환경에서 공개 설치 파일만 관측한다. workflow 변경이지만 이번 run은
  기존 제품의 조사 전용이며 새 제품/full 수용을 주장하지 않는다. 최종 후보 검증은 기존 CI 정책을 따른다.
- private raw 자료는 실제 연결된 T7의 task132 output에 보존한다.

### 커밋

`Task #132 [Stage 1.1]: 공개 NSIS의 표준 사용자와 관리자 문맥 관측 추가`

원격 실행에 필요한 후보 커밋을 먼저 게시하고 실행 뒤 별도 Stage 1 보고 커밋에 exact SHA를
연결한다. 실행 후보와 결과 문서의 SHA가 다른 사실을 명시하며 이력을 재작성하지 않는다.

## Stage 2 — 원인에 따른 최소 수정

Stage 1 결과에 따라 필요한 제품 파일과 회귀를 확정해 이 절을 보완한다.
기본 HKCU/격리 경계 안의 수정은 연속 진행한다. 보안·설치 범위 변경이 필요하면 구체안으로 보고한다.
제품 변경은 Windows Rust test/clippy, windows-package 및 실제 probe로 검증한다.
커밋: `Task #132 Stage 2: Windows 썸네일 실패 원인 수정과 회귀 검증`.

## Stage 3 — Windows 실제 수용

새 설치·재설치·공개 v0.1.3에서 업데이트·제거, MSI 일반 회귀·타사 연결 보존을 검증한다.
새 bitmap의 내용과 실제 Explorer 표시를 확인한다. hosted에서 불가능한 현장 수용은 명시한다.
커밋: `Task #132 Stage 3: Windows 썸네일과 설치 생명주기 수용 검증`.

## Stage 4 — 문서·최종 보고

수행계획의 기존 문서만 필요한 범위 수정한다. 최종 보고/보드 정리와 검증 후 PR 생성 전에 알린다.
같은 버전 재릴리즈는 기존 tag provenance, installer product identity, updater의 동일 버전 판단,
asset/feed 캐시와 기존 사용자 업데이트 경로를 검토하여 구체적 배포안으로 제시한다.
커밋: `Task #132 Stage 4 + 최종 보고서: Windows 썸네일 수정 결과 정리`.

## 검증·단계 의존성

각 단계 실제 검증 후 보고한다. 이전 단계 실패가 남으면 성공으로 보고하거나 다음 단계 수용을
대신하지 않는다. 사용자의 연속 진행 승인 범위 안에서 원인 보정과 검증을 계속한다.

## 위험과 대응

표준 사용자 profile의 생성/로딩 실패는 Shell 제품 실패가 아니다. 부모/자식 종료와 cleanup을
독립 기록하고 원인을 분리한다. 비관리자 실행도 interactive Explorer 전체 수용은 아니다.

## 승인 적용

수행계획 승인과 이슈 해결까지의 연속 진행 지시 범위에서 실행한다. PR 생성 직전 보고한다.

## Stage 1.1 로컬 검증과 원격 후보

- 후보 `563dae612eba52e0b5ea5d7c25a84111b2752775`, run [43039943503](https://github.com/postmelee/alhangeul-tauri/actions/runs/43039943503),
  profile=fast/scope=full/thumbnail_user_context=true. 제품 빌드나 게시가 아닌 관측 전용이다.
- Node v24.15.0 / pnpm 10.33.0에서 automation 1,384 passed, boundary 839 files, actionlint/diff 통과.
  최초 실행은 host PATH에 Node가 없어 검사 실행에 실패했고, 이어 workflow inventory 1건 누락을
  보완한 뒤 전체 통과했다. 이 실패들을 Windows 기능 결과로 간주하지 않는다.
- updater `service.rs::valid_metadata`는 `update_version > current_version`을 요구한다.
  동일 v0.1.3 재배포는 기존 v0.1.3 사용자에게 자동 업데이트되지 않는다. 수동 재설치,
  MSI product identity, 기존 파일 provenance 보존과 tag/feed 변경안을 수정 수용 후 확정해야 한다.

## Stage 1.2 — 실제 사용자 profile 환경과 제거 증거 보강

첫 비교 run 43039943503은 전체 failure다. 표준 사용자 실제 Shell/force-extract 6개와 JPG가
모두 성공했지만 제거 exit 0 이후 child cleanup=false였다. 부모의 계정/profile/scratch 정리는
통과했다. 관리자 쪽은 동일 DLL/worker로 6개가 모두 0x80040154, lifecycle cleanup 통과다.
표준 사용자 token은 medium 8192/elevated=false, 관리자는 high 12288/elevated=true다.
표준 사용자 제거의 실패 위치를 더 좁히기 위해 디렉터리/등록 잔존 상태를 별도 기록한다.
대체 자격 증명 실행은 부모 환경변수를 상속할 수 있으므로 해당 token의 known-folder 값으로
자식 프로세스의 profile/Temp 변수만 정합화한다. 전역·사용자 레지스트리 환경은 변경하지 않는다.
같은 두 환경에서 재검증하고 첫 실패를 소급 성공 처리하지 않는다.

## Stage 2 설계 선택안 — 설치 범위 변경은 승인 대기

### 관측에 따른 문제 구분

공개 v0.1.3의 같은 NSIS/DLL/worker bytes는 표준 사용자에서 HWP/HWPX 6개 실제 bitmap을
생성했고, elevated runner에서는 6개가 0x80040154로 실패했다. 첫 run의 표준 사용자 제거
검증은 실패여서 비교 전체를 수용하지 않는다. 환경 정합화/제거 진단 재검증은 진행 중이다.
일반 사용자에서 제품 렌더러 결함을 새로 발견한 것은 아니다. 관리자 Shell까지 사용자별
설치로 지원할 수 있다고 가정한 범위가 문제이며 HKCU 가시성을 강제로 완화하지 않는다.

### 제안 A — NSIS도 시스템 설치로 전환

- tauri.conf.json의 NSIS installMode를 perMachine으로 바꿔 Program Files/HKLM64를 사용한다.
- windows/nsis-hooks.nsh의 regsvr32 /i:user 등록/제거를 machine 방식으로 정합화한다.
  사용자 쓰기 가능한 경로의 DLL을 HKLM에 등록하는 절충은 하지 않는다.
- updater target.rs, target/native.rs의 NSIS HKCU-only 판정을 명시적 system NSIS 증거까지
  확장한다. 기존 per-user NSIS 식별과 중복/모호한 설치 거부를 보존한다.
- 썸네일 진단의 installer 식별, installer/업데이트 검증의 scope/경로/shortcut/sentinel도
  system NSIS에 맞게 수정하고 MSI 회귀 및 두 사용자 token의 실제 bitmap을 검사한다.
- 기존 per-user v0.1.3은 동일 버전 자동 업데이트가 없으므로 앱을 종료하고 기존 NSIS를 제거한
  뒤 새 NSIS를 수동 설치하는 전환을 검증한다. 사용자 문서와 앱 설정은 보존되어야 한다.
  기존 per-user와 새 system 설치의 공존/이전 DLL 우선순위로 성공을 오판하지 않는다.
- 영향: 최초 설치/업데이트에 관리자 승인 필요. 관리자 권한이 없는 사용자의 단독 설치 능력이
  달라지는 제품 정책 변경이다. Tauri 고정 CLI schema의 both 모드도 per-user 선택 시조차
  관리자 권한이 필요하므로 무권한 설치 유지 대안으로 제안하지 않는다.
- 코드 변경과 추가 Windows build/설치 실행은 이 범위 확장 승인 후 진행한다. 검증은
  windows-package로 시작하고 shared/updater/CI 영향 최종 full을 시행한다.

### 제안 B — 현재 설치 범위 유지

NSIS는 일반 사용자용으로 유지하고 관리자/UAC 비활성 환경은 기존 MSI 시스템 설치를
사용한다. 일반 사용자 NSIS의 실제 기능 gate를 CI에 추가할 수 있으나 이것을 관리자
NSIS 실패 수정이라고 보고하거나 issue의 원래 전체 해결 조건을 자동 충족시키지 않는다.

수행계획의 “제품 설치 범위 변경은 별도 설계 승인 대상이다”에 따라 A/B 방향을 확인한다.
어느 선택도 UAC 전역 정책/Windows Shell 격리 완화나 기존 release tag 교체 승인이 아니다.

## 2026-11-11 지원 정책 선택 확정

작업지시자가 “사용자별 NSIS 유지, 관리자 환경은 MSI 사용”을 선택했다.
Stage 2의 시스템 NSIS 전환안 A는 채택하지 않는다. 현재 설치 형식과 제품 권한 범위를 보존한다.
이 결정은 관리자 NSIS 실패가 고쳐졌다는 의미가 아니다. 이슈의 완료 범위는 다음과 같이 정렬한다.

- 일반 사용자 NSIS와 관리자 MSI의 실제 HWP/HWPX 썸네일 생성 및 lifecycle을 검증한다.
- 관리자 NSIS 결과는 지원 제한 관측으로 분리하며 기능 수용에 포함하지 않는다.
- 실패를 허용하는 diagnostic contract와 지원 환경의 필수 bitmap gate를 명시적으로 분리한다.
- 사용자 안내는 NSIS의 일반 사용자 용도와 MSI의 관리자 환경 용도를 구체적으로 설명한다.
- renderer/worker 제품 코드를 근거 없이 변경하거나 새 버그 수정이 있었다고 주장하지 않는다.
- PR 생성 전 보고를 유지한다. 같은 버전 재배포는 최종 변경과 실제 배포 필요성을 기준으로 별도 정리한다.

Stage 2는 위 지원 matrix를 검증하는 fail-closed 판정과 공개 MSI 대조,
Stage 3은 설치/재설치/제거 및 실제 bitmap/Explorer 범위 확인,
Stage 4는 기존 승인 문서와 최종 보고로 구체화한다.

## Stage 1.3 — 사용자별 제거 잔존의 잠금 판별

run 43042356555도 전체 failure다. 표준 사용자 썸네일 6개 성공과 관리자 6개 실패는 재현됐다.
표준 사용자의 inheritedProfileMatches/localAppDataMatches는 모두 true여서 환경변수 가설은
배제한다. 제거 exit 0, handlerRegistered=false지만 처리기 DLL 한 개가 남았다.
변경 후에는 dllhost의 해당 DLL 로드 여부와 30초 이후 정확한 소유 DLL 1개의 삭제 가능성을
관측한다. 파일 hash/이름/reparse 검사를 통과한 disposable 설치의 잔여물만 삭제를 시도한다.
이는 제품 제거 성공이 아니며 productUninstallPassed=false를 보존한다. 실패를 통과로 숨기거나
Explorer/dllhost를 강제 종료하지 않는다. 원시 실패와 시험 환경 정리를 분리한다.
반복 checkout 비용을 줄이기 위해 관측 job은 upstream 전체 submodule 대신 고정 rhwp SHA의
공개 fixture 4개만 받아 각각의 기존 hash를 대조한다. fast의 submodule 검증은 유지한다.

## Stage 2 확정 — NSIS 처리기 삭제 재시도와 지원 환경 기능 gate

Stage 1은 43044745096에서 관측·시험 환경 정리를 수용했다. 실제 기존 제품 제거 실패는 유지한다.
표준 사용자에서 Shell 사용 직후 NSIS가 처리기 DLL을 남기고, 30초 뒤 같은 파일 삭제는 성공했다.
고정 Tauri CLI 2.10.1 installer template은 resource Delete를 한 번 수행하고 재시도하지 않는다.

- windows/thumbnail-cleanup.nsh를 분리해 최대 60초의 제한된 대기/재시도를 구현한다.
- 새 설치기 PREINSTALL에서는 기존 처리기 파일이 있을 때 수정 가능한 상태인지 기다린다.
  기존 파일 내용을 바꾸지 않고 append open/close만 시도하며 timeout은 실패로 종료한다.
- POSTUNINSTALL은 처리기 DLL 하나의 삭제를 재시도하고 빈 설치 폴더만 제거한다.
  실패하면 0으로 숨기지 않으며 Explorer/dllhost 종료, 전역 캐시 삭제, 재부팅 예약은 하지 않는다.
- 공개 v0.1.3에서 새 같은 버전 installer로 수동 재설치, 새 후보 반복 재설치와 제거를 검증한다.
- 새 Windows bundle을 기존 provenance/inventory로 확인한 뒤 표준 사용자에서 실제 bitmap과
  productUninstallPassed=true를 요구하는 기능 gate를 추가한다. 시험용 잔여물 삭제로 대체하지 않는다.
- 기존 관리자 MSI strict-product와 관리자 NSIS limitation 관측을 유지하며 서로 대체하지 않는다.
- 제품 변경은 Windows installer hook뿐이다. Rust renderer/등록 scope/upstream은 그대로다.
- Windows package 후보를 먼저 실행하고 최종 CI 변경 범위 검증은 CI_VALIDATION 기준으로 확정한다.

## Stage 2·3 검증 구체화 — 2026-11-12

- Stage 2.1 후보 `a647bcc927f92bd72e4d0fea8583599e68588363`의 Windows package 검증은
  [43048470765](https://github.com/postmelee/alhangeul-tauri/actions/runs/43048470765)에서 진행한다.
  초기 로컬 자동화 1,403개, product boundary, actionlint(shellcheck 제외), diff 검사가 통과했다.
  전역 shellcheck 경고는 변경하지 않은 font-performance workflow의 SC2016이며 별도로 남긴다.
- 장기 잠금에서 제거 파일·등록을 먼저 지우지 않도록 PREUNINSTALL에도 내용 보존 대기를 적용한다.
  POSTUNINSTALL의 정확한 DLL 삭제 재시도는 경쟁 조건에 대한 마지막 정리다.
- 같은 Tauri가 내려받은 NSIS 3.11 compiler로 작은 fixture를 Windows에서만 컴파일·실행한다.
  wait/remove 각각에서 잠금을 2초 후 해제하는 경우와 60초 timeout을 검사한다.
  성공/1603, 기존 내용, 무관한 파일과 레지스터 보존을 확인한다. 컴파일러나 잠금 테스트를
  이 Mac에서 실행하지 않는다. fixture는 제품 설치/등록/서비스를 만들지 않는다.
- 새 후보의 일반 사용자 새 설치·반복 재설치와 별도로, 공개 v0.1.3의 고정 hash를 설치하고
  baseline Shell/force-extract를 실행한 직후 같은 버전 후보를 수동 재설치한다.
  source/artifact inventory/설치 파일/DLL/worker hash와 baseline bytes를 각각 확인한다.
- 수동 재설치 경로에서 기존·수정·반복 재설치 세 단계의 문서 bitmap 18개와 JPG 6개를 요구한다.
  사용자 Local/Roaming AppData의 제품 경로에 만든 합성 파일 두 개가 제거까지 보존되는지 확인한다.
  이는 실제 앱 설정 UI의 의미 검증이 아니라 installer의 사용자 데이터 비삭제 검사다.
- NSIS 원본 uninstaller가 임시 실행본을 띄울 수 있어 최종 제거 상태는 최대 90초 확인한다.
  실제 제품 제거 실패를 시험 도구의 파일 삭제로 대체하지 않는다.
- 표준 사용자 토큰으로 만든 고유 fixture 폴더의 Explorer 창을 열어 관측한다.
  창의 process owner SID와 session이 시험 사용자와 같을 때만 보기 변경·캡처·창 닫기를 한다.
  프로세스를 종료하거나 전역 캐시·UAC·thumbnail 정책을 바꾸지 않는다.
  capture 성공도 이미지 직접 검토 전까지 Explorer 수용이 아니다. hosted에서 확보하지 못하면
  미검증으로 남기고 지원되는 실제 Windows 환경을 요청한다.
- CI/shared 변경 때문에 최종 후보는 `profile=full`로 검증한다.
  기존 관리자 NSIS 진단·MSI strict·MSI 3010 관측의 의미는 유지한다.

### 같은 버전 이력 검증의 실행 경계 보정

`0a147c1b`의 full run 43050331554는 재릴리즈 후 일반 CI가 최초 공개본 URL/hash에
상시 종속되는 구조를 발견해 2026-11-12 중단했다. 성공으로 수용하지 않는다.
새 설치·반복 재설치·제품 제거는 항상 필수로 유지한다. 최초 공개본→같은 버전 후보 검사는
`thumbnail_same_version_upgrade=true`로 명시 선택하며, 선택 시 step 실패·생략을 집계에서 거부한다.
이번 task의 최종 full 실행에서는 이 옵션을 켠다. 공개 파일이 교체된 뒤에는 과거 해시 불일치를
무시하지 않으며, 원본 bytes 보관·재검증 위치는 같은 버전 재배포 계획에서 확정한다.

중단된 43050331554의 Linux x64 core job 130629046273은 중단 요청 직전에 Ubuntu mirror DNS
해석 실패로 apt-get exit 100을 반환했다. 제품/테스트 실패가 아니라 의존성 확보 실패이며 통과로
처리하지 않는다. 원시 로그를 보존했고 변경된 최종 후보의 새 runner에서 다시 확인한다.
작업지시자는 현재 접속 가능한 Windows 10/11 테스트 환경이 없다고 답했다. hosted Explorer
관측은 계속하되 Windows 10/11 현장 검증을 수행했다고 기록하지 않는다.

### Linux 검증 환경 복구 — Canonical DNS 장애

최종 후보 run 43053237859의 linux-x64 core job 130638159708에서도 동일 DNS 오류와
apt-get exit 100이 재현됐다. 로컬 읽기 전용 DNS 조회에서도 archive/security/ports/Azure
Ubuntu 이름을 해석하지 못했다. [runner-images #15296](https://github.com/actions/runner-images/issues/15296)에
동시간대 동일 장애가 보고돼 있다. 제품 결함과 구별하고 이 실패를 수용하지 않는다.

전체 검증을 완료하기 위해 일회용 GitHub-hosted Ubuntu CI에 한정해 DNS 실패 시 HTTPS
미러를 사용하는 준비 helper를 추가한다. 지원 image는 jammy/noble, amd64/arm64뿐이다.
TUNA 대학 미러의 해당 archive/ports InRelease가 HTTP 200인 것을 확인했다. runner 이미지에
원래 있는 Ubuntu archive keyring으로 base/updates/security 세 InRelease의 gpgv 검증을
모두 마친 뒤에만 알려진 Ubuntu URI를 치환한다. suite/component/Signed-By/타사 source는
보존하며 apt의 서명·유효기간 검사를 그대로 유지한다. 외부에서 새 신뢰 키를 받지 않는다.
DNS가 정상이면 source를 바꾸지 않는다. 제품·릴리즈 파일이나 이 Mac의 DNS/apt 설정을
변경하지 않는다. 실패 시 닫히는 guard와 URI 변환·서명 선행 순서를 회귀 검사한다.

### Linux 미러의 지역별 접근 실패 보정

run 43056867702의 x64 제품 job 130651397704는 TUNA InRelease 요청에 HTTP 403을 받아
source를 변경하기 전에 실패했다. 같은 run의 x64/arm64 core는 기존 Ubuntu keyring의
서명 세 개와 apt 설치를 통과했다. 이 차이를 제품 실패나 전체 성공으로 처리하지 않는다.
amd64는 [Linux Kernel Archives 미러](https://mirrors.edge.kernel.org/)를 먼저 사용하고,
HTTPS fetch 실패에만 다음 고정 미러를 시도한다. 서명 실패는 즉시 중단한다.
모든 후보가 실패하면 원래 source를 유지한 채 실패하며 임의 URL·새 key·검증 생략은 허용하지 않는다.

첫 Windows 후보 a647bcc9의 표준 사용자 job 130660728668은 24개 probe와 제품 자체 제거를
통과했다. 문서 bitmap 12개는 모두 181×256, JPG 4개는 256×134이고 추가 잔여물 삭제는 없었다.
이 증거는 초기 후보에만 해당하며 최신 후보의 장기 잠금·공개본 수동 재설치를 대체하지 않는다.
