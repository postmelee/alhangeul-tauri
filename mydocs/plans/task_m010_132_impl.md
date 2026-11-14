# Task #132 — Windows 썸네일 수정 구현계획서

수행계획서: [task_m010_132.md](task_m010_132.md)
GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)
마일스톤: M010

현재: Stage 5 비게시 서명·최종 파일 검증 완료 — #138/#139 병합, 제품4e99e883 고정, 최종 signed Windows 10/11 여덟 경로와 설치 파일6종 수용. 검증 후속 PR을 준비하며 태그·Release·Pages 교체는 사전 보고·승인 대기다.

2026-11-11 수행계획 승인과 이슈 해결까지 연속 진행 지시를 적용한다. PR 생성 전 보고한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 공개 NSIS 실행 문맥 비교 | 격리 Windows 관측 workflow/helper | hash, token, 실제 Shell probe, cleanup |
| 2 | 원인에 따른 최소 수정 | handler/등록/installer 또는 실행 문맥 | 수정 전/후 기능 회귀 |
| 3 | 실제 Windows 수용 | 설치 생명주기·Explorer 증거 | 새 이미지/타사 연결/MSI 회귀 |
| 4 | 최종 보고 | 기존 공식 문서·최종 보고 | 계약 일치, PR 전 보고 |
| 5 | 비게시 재릴리즈 준비 | 병합 source·signed 후보·복구/교체안 | Windows8경로·파일6종·서명·full CI |

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

당시 재검증 후보는 `4558204669f82a450a3ee66f3c3081a4b57e3ef0`,
[run 43061139226](https://github.com/postmelee/alhangeul-tauri/actions/runs/43061139226)의
full + thumbnail_same_version_upgrade=true다. 선행 43056867702는 x64 미러 403 실패를
보존한 뒤 중단했으며 수용하지 않는다. 새 후보는 첫 Windows 성공 build의 동일 workload
cache를 사용할 수 있으나 실제 cache hit·테스트 결과 확인 전까지 재사용 성공으로 기록하지 않는다.

같은 버전 재배포 준비의 읽기 전용 확인에서 기존 release 441647361의 11개 asset metadata와
#126 public-readback 보관본의 크기·SHA256이 모두 일치했다. 기존 tag/asset/feed는 변경하지 않았다.
새 source와 서명 파일을 확정하고 같은 버전 수동 설치와 복구안을 검증하기 전에는 교체하지 않는다.

### 파일 분리 기준

신규 실행 helper는 모두 300줄 미만으로 유지한다. 기존 Windows smoke(437줄)와 native build
workflow(422줄)는 CI_VALIDATION의 지정 소유 파일이며 이번 변경만으로 재분할하지 않는다.
새 기능 판정·입력 검증·잠금 검사·화면 관측은 별도 helper로 분리해 workflow에는 전달과 의존관계만 둔다.

### Explorer 관측의 무한 대기 분리

full run 43061139226은 실패다. Windows/Linux core·native·패키지와 MSI 계약,
최종 후보의 일반 사용자 fresh 24개 probe·설치/재설치/제품 자체 제거는 통과했다.
NSIS 잠금 회귀 4개도 통과했다(해제 후 2.0~2.6초 성공, 영구 잠금은 약 60.2초 후 1603).
공개본 수동 재설치는 baseline/installed/reinstalled의 36개 원시 probe를 모두 남겼지만,
마지막 COM 활성화 뒤 Explorer 관측 구간에서 15분 child-timeout이 발생했다.
그 경로의 observation/제거/합성 사용자 데이터 보존 완료 증거가 없어 수용하지 않는다.
계정·profile·scratch 정리는 통과했고 제품 제거 성공으로 대체하지 않는다.

화면 관측은 같은 표준 사용자 token의 별도 PowerShell 자식으로 실행하고 45초로 제한한다.
종료 대상은 직접 만든 관측 PowerShell뿐이며 Explorer/dllhost는 종료하지 않는다.
interactive desktop 및 기존 Shell의 사용자/session이 시험 사용자와 같을 때만 창을 연다.
불일치는 unavailable로 기록하고 실제 화면 미검증을 유지한다. 관측 직전 lifecycle의 미완료
checkpoint와 화면 관측 단계별 JSON을 남겨 전체 시간 초과가 기존 증거를 잃게 하지 않는다.
독립 Windows fast 회귀에서 0/7 종료 코드와 3초 timeout 후 직접 만든 자식의 종료를 확인한다.
실패한 run의 artifact를 성공 producer로 재사용하지 않으며 보정 후 새 full을 실행한다.

### Windows 캐시 저장 제한 초과와 동일 후보 재검증

run 43074541367(a2796fc0)은 Windows 제품 빌드·native 검사·잠금 회귀·artifact 업로드를
통과했지만 job의 90분 제한으로 마지막 Cargo source cache 저장 중 취소됐다. 전체 결과는
cancelled이며 후속 설치 검사는 실행되지 않았다. 부분 성공을 전체 수용으로 기록하지 않는다.
원시 job 130712882531 로그와 artifact metadata를 T7에 보존했다.

19:39:09 UTC에 동일 SHA의 Windows desktop target cache 저장은 완료됐다.
GitHub cache API에서 ID 10374390010, 4,864,860,214 bytes와 exact SHA key를 확인했다.
이 준비 상태 변화에 근거해 같은 source를 새 full run으로 검증한다. 검사·90분 제한·제품 코드는
바꾸지 않으며 이전 실패 run의 설치 파일을 성공 producer로 재사용하지 않는다.
실제 cache hit와 모든 필수 검사 결과는 새 실행에서 별도로 확인한다.

동일 SHA 재검증은 [43089630194](https://github.com/postmelee/alhangeul-tauri/actions/runs/43089630194)다.
2026-11-12 05:45 KST 확인 시 Windows 제품 검사·Tauri bundle·잠금 회귀와 세 core 검사가
통과했다. Linux arm64의 native/package lifecycle도 통과했지만 package evidence upload가
실패해 필수 gate가 실패했다. job 130764889488의 steps JSON을 보존했으며 로그 다운로드는
CLI에서 HTTP 502, GitHub connector에서 ReadTimeout을 반환했다. run은 아직 in_progress다.
Windows 및 Linux x64 증거 upload와 후속 Windows 설치 수용은 아직 확인되지 않았다.
제품 결함이나 GitHub 전체 장애로 단정하지 않고, 원시 로그·필수 증거 확보 전에는 완료 처리하지 않는다.

후속 로그 조회가 복구돼 Linux arm64의 원시 로그를 보존했다. artifact 생성 요청이 JSON 대신
HTML(`<!DOCTYPE ...`) 응답을 받아 5회 재시도 뒤 `Failed to CreateArtifact`로 실패했다.
Linux x64도 package evidence upload와 필수 gate가 실패했다. 기능 검사 통과를 증거 전달
성공으로 바꾸지 않으며, 서비스 응답 이상을 제품 코드 변경으로 우회하지 않는다.
실제 Windows 10/11 Explorer 조건을 유지해 PR을 보류할지, 명시적으로 후속 검증으로
이관하고 CI·설치 수용 후 PR을 진행할지 작업지시자에게 확인했다. 아직 답변 전이므로 기존
수용 기준은 유지한다. 이 확인은 실제 재릴리즈의 tag/asset/feed 교체 승인이 아니다.

2026-11-12 06:16 KST에도 Windows support upload가 진행 상태로 남아 90분 job 제한을 넘겼다.
Linux 두 필수 gate가 이미 실패한 실행의 취소를 요청했다. 제품/installer 수용은 미완료다.
전체 build를 바로 반복하지 않고 동일 SHA의 fast 실행으로 작은 Windows script evidence의
생성·upload·다운로드 digest 경로가 다시 동작하는지 확인한다. 이는 전송 복구 관측이며
native·설치·Explorer 성공을 대신하지 않는다. 전송 실패가 계속되면 전체 build 재시도는 하지 않는다.

전송 복구 관측 [43101751100](https://github.com/postmelee/alhangeul-tauri/actions/runs/43101751100)은
같은 a2796fc0의 fast 전체 success다. Windows evidence artifact 13893020909(7,741 bytes)를
다운로드했고 SHA256 37fc947b33b0932c1eba8208374ad3c2099bfc78c341676d962d391d979943a3이
GitHub metadata와 일치했다. 이 외부 상태 변화에 근거해 동일 후보를 새 full run으로 검증한다.
이전 run은 cancelled로 보존한다. 새 run ID를 사용해 기존 attempt의 artifact·이름·결과와
섞지 않으며, fast 전송 성공을 설치/전체 수용으로 승격하지 않는다.

### Stage 2 완료와 Stage 3 잔여 수용 — 2026-11-12

[full run 43102583324](https://github.com/postmelee/alhangeul-tauri/actions/runs/43102583324),
source a2796fc0fd93002ccdcf1e5c313701525b1668c6, attempt 1이 success로 끝났다.
Windows/Linux core·native·패키지, 표준 사용자 fresh 24개/public-upgrade 36개 probe,
제품 자체 제거, 합성 사용자 데이터 보존, MSI 및 기존 제한 관측 계약이 모두 통과했다.
증거 다운로드 digest와 raw JSON을 대조했다. 자세한 식별자·성공 범위는
[Stage 2 보고서](../working/task_m010_132_stage2.md)에 기록한다.

Explorer는 interactive-shell-owner-mismatch로 preflight에서 unavailable을 기록했다.
캡처는 없으며 실제 Windows 10/11 시각 수용은 미검증이다. 화면 조건 처리에 대한 답변 전에는
Stage 3 완료, PR 생성, issue close, release/tag/asset/feed 교체를 진행하지 않는다.
같은 버전 재설치는 설치기를 /S /UPDATE로 직접 실행한 자동화 경로다.

## Stage 3.1 — 무료 hosted 자원 관측 (2026-11-12 승인)

1. ci.yml에 기본 실행과 분리된 수동 scope=hosted-ui-probe를 추가한다. fast 계약 뒤 reusable 조사 workflow를 실행한다. 무료 windows-2022/windows-2025와 ubuntu-24.04만 사용한다.
2. Windows는 현재 runner·Shell SID/session/token 및 OS build를 기록한다. 같은 사용자/session의 대화형 desktop을 확보할 때만 고정 run 43102583324/artifact 13896135792를 digest 검증 후 다운로드한다. 기존 inventory 검증기로 MSI/DLL/worker/source를 검증하고 MSI 설치 → 공개 fixture Explorer 캡처 → 제거를 실행한다. 일반 NSIS 표준 사용자 gate를 완화하지 않는다. capture 성공은 사람 검토 전 시각 수용이 아니다.
3. Linux는 /dev/kvm의 KVM_GET_API_VERSION, KVM_CREATE_VM ioctl 실제 성공 여부와 VM fd close, CPU/memory/disk/Docker를 기록한다. 이 관측은 Windows 부팅·Windows 10/11 검증을 의미하지 않는다. 자원 부족은 실제 남은 용량으로 설명한다.
4. 파일은 scripts/ci/hosted-ui-* 및 .github/workflows/alhangeul-hosted-ui-probe.yml로 분리한다. hosted 가드와 bounded child timeout을 적용하고 자기 창/프로세스만 정리한다. 공개 fixture/합성 데이터 외 화면은 캡처하지 않는다.
5. 로컬 Node/automation·boundary·action pins·actionlint·diff 검사 후 후보를 publish/task132에 push하고 scope=hosted-ui-probe로 실행한다. 조사용 부분 검증이며 제품 rebuild/full 수용은 수행하지 않는다. 원시 JSON/PNG/로그를 T7 task132 output에 보존하고 각 OS 결과와 제한을 기록한다.

T7 실제 mount는 확인했다. 기존 routing 도구는 Tauri 저장소 루트에 Cargo.toml이 없어 실패했으며 routing 완료로 주장하지 않는다. 로컬 private 산출물은 기존 T7 rhwp/workspaces/main/output/alhangeul-task132 아래 절대 경로에만 생성하고 로컬 output/target을 만들지 않는다. 기존 task worktree와 추적 source를 사용한다.

원격 실행 전 후보 커밋과 실행 후 증거 보고 커밋을 분리하고 SHA를 연결한다. Stage 3 전체의 Windows 10/11 시각 수용이 남으면 완료 보고를 만들지 않고 구현계획에 조사 결과를 기록한다. PR 생성 전 보고는 유지한다.

### Stage 3.1 첫 관측과 표시 설정 대조

run 43175177459(84402ee7)은 fast와 무료 세 환경의 관측을 통과했다. Windows Server 2022/2025는 동일 Shell 사용자/session에서 PNG를 캡처했고 MSI 설치·제거 및 네 fixture의 force-extract를 통과했다. 직접 PNG를 확인한 결과 HWP/HWPX뿐 아니라 JPG도 기본 아이콘이다. 캡처 성공을 썸네일 표시 성공으로 바꾸지 않는다. Explorer 사용자별 IconsOnly와 DisableThumbnails 정책을 읽고, IconsOnly만 테스트 동안 0으로 적용한 뒤 원래 존재 여부·값·type을 복원하는 대조 실험을 추가한다. UAC/보안 정책/전역 캐시/다른 계정은 변경하지 않는다. 원본 PNG와 raw 결과를 보존하고 새 후보/run으로 비교한다.

Ubuntu의 KVM API 12 및 실제 VM fd 생성·정리는 성공했고 CPU 4개, RAM 16,760,344,576 bytes, 여유 디스크 92,019,437,568 bytes다. Windows guest 부팅은 미실행이며 별도 이미지/설치 검증이 필요하다.

### Stage 3.1 결과 — 무료 hosted 관측 완료

설정 대조 run 43176532755(252a9c96, attempt 1)이 success다. 두 Server 이미지에서 IconsOnly=1을 관측하고 테스트 동안 0 적용 후 원래값 복원까지 통과했다. 에이전트가 원본 PNG를 직접 열어 HWP 시험 문서/HWPX 양식/JPG 실제 내용 표시를 확인했다. API 8개, MSI 설치·제거, 소유 창 닫기와 설정 복원 모두 성공했다. 자동 이미지 판정과 Windows 10/11 guest·일반 NSIS 시각 수용은 미검증으로 유지한다. [Stage 3.1 조사 보고](../working/task_m010_132_stage3.1.md)에 입력·증거·제한을 기록한다. 사용자 PC 준비는 무료 hosted 관측의 선행 조건이 아니다.

## Stage 3.2 — 남은 hosted 검증 (2026-11-12 연속 진행 승인)

작업지시자가 남은 검증도 가능하면 진행하도록 지시했다. Windows ISO/사용 권한은 아직 없고 무료 평가판 준비 방법 안내를 선택했다. 따라서 Windows guest 설치는 등록된 정식 이미지 확보를 기다리며, 무료 hosted에서 가능한 다음 항목을 실행한다.

- 표준 사용자 NSIS: 폐기 가능한 VM에서 임시 Users 계정을 만들고 고정 candidate를 설치/재설치한다. 배경 desktop Shell은 다른 계정일 수 있음을 관측으로 남기고, 해당 사용자가 연 탐색기 창의 실제 process SID/session과 child의 non-elevated medium token을 모두 확인한다. 이를 위해 별도 실험 플래그를 사용하며 기존 정식 표준 사용자 gate를 완화하지 않는다. 소유 창 외에는 닫거나 종료하지 않는다. 계정/profile/scratch를 정리하고 원시 미검증 상태를 보존한다.
- 이미지 회귀: Stage 3.1에서 에이전트가 확인한 공개 fixture 화면의 내용 영역을 임시 기준으로 고정하고 source/artifact/PNG hash를 기록한다. 정상 이미지와 실제 기본 아이콘/빈 화면/다른 문서 대조군으로 자동 비교가 실패를 검출하는지 확인한다. 임시 기준은 작업지시자가 승인한 최종 golden image가 아니며 제품 시각 수용 전체를 자동 승인하지 않는다.
- 검증은 local automation/boundary/diff와 무료 hosted-ui-probe scope를 사용한다. 제품 rebuild/full 수용·유료 자원·UAC/정책 변경·Explorer/dllhost 전역 종료는 제외한다. 로컬 산출물은 T7 기존 task132 output에만 기록한다. 원격 실행에 필요한 후보 커밋과 결과 보고의 SHA를 연결한다.

### Stage 3.2 결과 — 관측 완료, 실제 Windows 수용은 진행 중

run 43207576327(f564d1bf)과 43209155519(57ce3d75)가 success다. 후속 MSI는 두 Server에서 HWP/HWPX/JPG 내용 비교 6/6 matched, IconsOnly 복원·창 닫기 성공이다. NSIS는 medium token에서 설치/재설치/엄격 제거와 API 8/8을 통과했지만 다른 사용자의 desktop에서 Shell.Open이 90초 시간 초과됐다. raw open-folder/unavailable, restored=false를 유지하고 신규 임시 profile/account/scratch 제거를 별도로 확인했다. 화면 수용으로 올리지 않는다. 자동 비교 기준은 provisional-agent-reviewed이며 releaseAcceptance=unverified다. [Stage 3.2 보고](../working/task_m010_132_stage3.2.md)에 exact 입력·증거·평가판 준비 절차를 기록한다. Windows 11 ISO는 사용자 등록·확보 대기이고 Windows 10의 기존 평가 링크는 지원 종료 안내로 이동한다. PR·같은 버전 재릴리즈는 미완료다.

## Stage 3.3 — NSIS Explorer timeout 원인 분리 (2026-11-12 연속 진행 승인)

작업지시자가 timeout 원인 분석과 무료 runner 해결 가능성 실험을 계속 지시했다. 같은 #132/local task worktree에서 진행하며 PR 전 알림을 유지한다.

- 제품 설치 전 공개 빈 폴더를 Shell.Application.Open으로 여는 음성 대조군을 실행한다. 설치 후 문서 폴더는 Shell.Open, Microsoft 문서의 CLSID_ShellBrowserWindow/IWebBrowser2.Navigate2, explorer.exe 직접 실행을 비교한다. 각 child에는 유한 timeout을 두고 COM 호출 단계·시간·실제 창 process owner/session을 보존한다.
- API 원인은 로그로 단정하지 않는다. HWND를 native 열거해 COM 호출이 멈춰도 실제 창이 생겼는지 관측한다. 시험 폴더와 일치하고 test user SID/session을 확인한 창만 닫는다. 기존 background Shell, UAC, DCOM RunAs/보안 정책, HKLM 등록, 설치 범위는 바꾸지 않는다.
- child timeout 뒤에도 부모의 같은 임시 사용자 문맥에서 표시 설정 복원을 시도하고 별도 증거를 기록한다. 신규 계정/profile/scratch 정리와 제품 자체 제거를 각각 검증한다.
- 성공 시 기존 캡처·내용 비교로 이어가되 창 owner/session과 실제 PNG 내용이 확인되지 않으면 미검증으로 유지한다. 조사 workflow/회귀만 바꾸며 exact product a2796fc0/producer43102583324/artifact13896135792를 재사용한다.
- local automation/boundary/actionlint/diff, 무료 hosted-ui-probe fast 후 Server 2022/2025 matrix로 검증한다. 원격 후보 커밋과 결과 보고 SHA를 연결한다. private 출력은 연결된 T7 기존 task132 output에 둔다.
- 문서 위치는 기존 impl, mydocs/working/task_m010_132_stage3.3.md, 오늘할일이다. 사용자가 질문한 T7/VM 가능성은 조사로 안내하며 이번 지시만으로 VM 앱 설치·디스크 포맷·새 Windows 설치를 시작하지 않는다. Mac은 VM 호스트일 뿐 제품 실행 검증 대상은 Windows guest다. M4 Pro ARM 호스트에서 x64 guest는 에뮬레이션이고 ARM64 guest는 x64 수용과 별도임을 명시한다.

### Stage 3.3 첫 관측과 COM 조회를 제거한 후속 실험

run 43212274409(0f6f8e68)은 success이며 두 OS 모두 설치 전 빈 폴더와 설치 후 Shell.Open이 약 60초 timeout이다. ShellBrowserWindow 생성과 ShellWindows 조회는 E_ACCESSDENIED이고 두 COM AppID의 RunAs=Interactive User를 읽기 전용으로 확인했다. 표준 token/SID와 로그인 desktop owner의 불일치에 따른 COM 경계 문제를 강하게 시사하며 제품 설치가 timeout 발생 조건은 아니다.

직접 explorer.exe 실험도 뒤에서 ShellWindows를 조회했으므로 이를 직접 실행 자체의 실패로 결론 내릴 수 없다. 후속에서는 일반 실행과 /separate 실행 모두 COM 없이 native HWND를 기다리고 실제 SID/session을 확인한다. 창을 얻으면 소유 foreground 확인 후 큰 아이콘 단축키로 표시를 시도하고 PNG를 남긴다. 이 경로는 IconSize=192 기준과 다른 실험 레이아웃이므로 기존 MSI 기준을 통과한 것으로 기록하지 않고 experimental-capture-awaiting-reference로 남긴다. MSI 기존 192px 비교는 계속 필수다. 스크린샷 내용을 확인한 뒤 다음 판정 여부를 결정한다.

### Stage 3.3 결과 — 현재 hosted 사용자 문맥의 Explorer 활성화 실패

첫 run 43212274409(0f6f8e68)과 COM 없는 후속 43214335047(5095fa45)이 success다. 두 OS 모두 설치 전 빈 폴더에서도 timeout이며 ShellWindows/ShellBrowserWindow AppID의 Interactive User 설정과 실제 E_ACCESSDENIED를 확인했다. 일반·/separate explorer.exe는 native 창 탐색으로도 exit 1, 소유 문서 창 없음이다. NSIS 화면은 미검증이고 표시 설정 복구·제품 제거·임시 계정/profile/scratch 정리는 통과했다. [Stage 3.3 보고](../working/task_m010_132_stage3.3.md)에 관측·추론의 구분과 T7/UTM 가능성을 기록했다. 현재 Mac M4 Pro에서 x64 ISO는 에뮬레이션이 필요하다. ISO 경로/에디션/아키텍처를 요청했으며 무료 Linux KVM 또는 T7 Windows guest 검증이 후속 경로다. PR·재릴리즈로 넘어가지 않는다.

## Stage 3.4 — 공식 Windows 11 ISO와 무료 KVM guest 실험

기존 연속 진행 지시와 사용자가 제공한 ISO 입력에 따라 무료 Ubuntu runner의 후속 실험을 구체화한다. 로컬 Mac VM 앱 설치/포맷은 계속 범위 밖이다.

- 입력은 Microsoft Windows 11 Enterprise Evaluation 26H2 한국어 x64 ISO다. 파일 크기 8,225,404,928 bytes 및 SHA256 b7ec51f0d332ac2aa4f7faeffbefac961ce6eb7204b5876b48fa8d9f1cf0a9a6을 공식 KO-KR x64 검증 항목과 대조했다. 원본 ISO는 수정/재배포하지 않으며 runner가 공식 고정 URL에서 받아 같은 digest를 검증한다.
- ci.yml의 별도 수동 scope=windows-guest-probe에서 fast 계약 뒤 무료 ubuntu-24.04 한 대만 사용한다. QEMU/KVM, Ubuntu 서명 패키지의 OVMF/TPM2로 Windows 11을 새 임시 가상 디스크에 설치한다. Windows 요구사항 우회, UAC/보안 정책 완화, 원격 데스크톱 공개 포트, activation/rearm 변경은 추가하지 않는다.
- Microsoft unattended 설정으로 폐기 가능한 관리 계정과 Users 전용 표준 계정을 만들고 표준 계정의 실제 자동 로그인/Explorer 소유권을 확인한다. 무작위 시험 암호와 answer media/guest disk는 로그·artifact에서 제외하고 runner 종료 시 폐기한다. 설치 XML의 disk wipe 대상은 코드가 새로 만든 guest disk 0뿐이다.
- guest는 네트워크 없이 입력 CD와 직렬 포트로 공개 fixture/시험 증거만 교환한다. 제품 a2796fc0/producer43102583324/artifact13896135792의 ZIP·inventory·개별 해시를 재검증하여 같은 NSIS bytes를 사용한다. 설치/재설치/API/표준 사용자 Explorer/제거를 관측한다. 기존 엄격한 desktop owner gate를 유지한다.
- QEMU 전체는 45분, 설치기/캡처는 각 유한 timeout으로 제한한다. host 화면은 설치/시험 guest만 캡처하고 결과 JSON/PNG를 보존한다. 부팅·표준 로그인·제품 기능·실제 그림 표시를 별개 판정하며, Windows 10 및 MSI/최종 golden 비교·재릴리즈 수용은 자동 완료 처리하지 않는다.
- source는 scripts/ci/guest-ui-*와 별도 reusable workflow로 분리한다. 문서는 기존 impl/orders와 mydocs/working/task_m010_132_stage3.4.md 위치를 사용한다. local automation/boundary/actionlint/diff, fast Windows parser, 실제 guest run 순서로 검증한다. 원격 실행용 후보 커밋과 결과 보고 커밋을 연결한다. private output은 기존 T7 task132 경로만 사용한다.

### Stage 3.4 첫 실행과 host 준비 수정

run 43221610929(d155bf97)은 fast Node/Studio 및 Windows PowerShell 계약이 성공했지만 guest job이 Ubuntu 준비에서 실패했다. sudo에 GITHUB_ACTIONS/RUNNER_ENVIRONMENT를 전달하지 않아 기존 hosted-linux-ci-required guard가 차단했다. Windows ISO 다운로드/설치 전의 harness 연결 오류다. 기존 다른 workflow와 동일하게 두 환경 변수를 보존하고 회귀 검사를 추가한다. 시작 단계에서도 preparation.json을 남겨 준비 실패와 guest 실행 실패를 구분한다. guard 자체는 완화하지 않는다.

### Stage 3.4 KVM 설치 진행 관측과 후속 조정

run 43222471710(550eedb8)은 공식 ISO/inventory 검증과 KVM 실행까지 성공했다. 약 20분에 중간 증거 회수를 위해 관측을 취소했다. PNG는 120초 설치 12%, 300초 32%, 600초 55%, 재부팅 후 1080/1140초 설치 42%를 보여 준다. Windows guest 부팅/설치 진행은 확인했지만 설치 실패나 완료로 단정하지 않는다. ZIP 13948292587의 SHA256 a94094d9c63d8ec83f6bbb2a912ac0c58c1e7ba3768eebec2e2ab585fa44eb56을 검증했다. 취소 후 QEMU가 살아 있어 disk-in-use guard가 삭제를 거부했으며 runner teardown에 맡겨졌다. 자체 정리 성공으로 기록하지 않는다.

후속은 실행 중 5분/20분 checkpoint artifact를 제공한다. QEMU 문서의 Windows Hyper-V timer/APIC/spinlock 최적화를 적용하되 보안/설치 요구사항은 유지한다. /dev/kvm에 폐기 가능한 runner 사용자 접근만 부여하여 sudo supervisor 대신 같은 사용자 프로세스로 실행한다. PID+Linux starttime+UID/pidfd로 이번 실행의 프로세스만 정리하고 정리 결과도 최종 증거에 포함한다. 실제 설치 진행 관측에 따라 guest 상한은 60분, job은 준비/증거 포함 90분으로 둔다. 중간 화면으로 진행 여부를 판단하며 로그인/썸네일 성공을 추정하지 않는다.

### Stage 3.4 두 번째 전송 지연 원인

run 43227392794(fdedc7ac)의 fast 계약은 성공했다. guest 준비 중 실시간 웹 로그에서 curl이 1,200,000ms에 8,225,404,928 bytes 중 8,024,752,128 bytes(약 97.6%) 수신 후 timeout을 기록했다. 아직 Windows guest를 시작하지 않았다. 반복 전송을 중단하고 공식 URL·digest를 유지한 HTTPS 분할/재개 전송(서명된 Ubuntu aria2 패키지)으로 바꾼다. ISO 다운로드와 payload 준비를 별도 step으로 분리하고 fixture 요청에도 시간 제한을 둔다. ISO 전체 전송은 30분 상한, guest는 기존 60분 상한이며 준비·증거 여유를 포함한 job 상한은 105분이다. ISO/디스크를 cache나 공개 artifact로 올리지 않는다.

### Stage 3.4 Windows 11 실제 로그인 성공과 설치기 대조

run 43231951712(a9d014ac)은 ISO 전체 digest 검증 후 약 771초에 Windows 11 Enterprise Evaluation 설치와 표준 사용자 실제 로그인을 완료했다. ProductType=1/build=26300, medium token/관리 그룹 없음, desktop owner·session 일치다. NSIS는 exit 2로 실패해 재설치/썸네일/API 수용은 미실행이다. 증거 artifact 13952016906의 digest 9bb37043c411fb5a718fa138f34470fbc1135c36147feb952b70855bf6997f55를 검증했고 소유 QEMU/TPM/supervisor 종료·정리는 통과했다. PNG의 평가판 만료 watermark와 CIM build 불일치는 관측으로 남기며 원인을 추정하지 않는다.

공식 Tauri CLI 2.10.1 NSIS 템플릿은 WebView2 pv가 없으면 bootstrapper 다운로드/설치 실패 시 Abort한다. 현재 제품은 기본 downloadBootstrapper이고 guest는 오프라인이다. 단, 제품 handler hook도 Abort하므로 exit 2만으로 WebView2 원인을 확정하지 않는다. 다음 대조는 같은 신규 guest에서 먼저 NIC link down 상태로 설치하고 WebView2 두 hive/view의 pv, 설치 파일 해시·handler 등록 여부를 기록한다. 실패 시 직렬 phase 신호를 받은 host가 해당 guest NIC만 user-mode NAT로 연결한 뒤 같은 installer bytes를 재시도한다. host forwarding/public port는 없으며 표준 계정/UAC/제품 설치 범위는 유지한다. 온라인 성공도 앞선 offline 실패를 보존하고 원인과 실사용 수용 범위를 구분한다. guest 평가판은 activation/rearm 우회 없이 원래 라이선스 상태를 유지한다.


대조 run 43236490785(993690d4)은 Node fast 성공 후 guest 시작 전 중단했다. exact producer ZIP과 두 binary SHA256을 로컬에서 다시 검증하고 PE import를 읽어 handler/worker 모두 VCRUNTIME140.dll 동적 의존성을 확인했다. 이것만으로 설치 실패를 확정하지 않는다. 재실행에는 System32 런타임 존재/로드 오류와 검증용 동일 handler DLL의 LoadLibraryEx 오류를 추가한다. 검증 DLL은 등록하지 않으며 로드 성공 시 즉시 해제하고 thread error mode를 원복한다. 제품 파일/등록 범위는 변경하지 않는다.

## Stage 3.5 — 깨끗한 Windows의 VC 런타임 의존성 제거

run 43237334829(9d026c2e)는 Windows 11 실제 표준 로그인과 온라인 재시도까지 약 816초에 완료했으나 두 설치 모두 exit 2다. 공식 ISO에는 WebView2 152.0.4191.66이 이미 있고 bootstrapper 다운로드는 없었다. System32 VCRUNTIME140.dll 없음, 해당 DLL과 exact handler의 LoadLibraryEx 오류 126, 제품 파일은 복사됐으나 handler 등록은 없음이다. 온라인 전환 뒤에도 같은 상태다. 앞서 확인한 두 binary의 VCRUNTIME140.dll import와 일치하여 필수 VC 런타임 누락이 handler 로드/설치를 막는 근거다. 증거 artifact 13953209802 digest 7e9e4aa8a32e72f89c989e9f5b1f05cf28aa4414445441ba141fc6c86ec7971b를 검증했다. 제품 제거는 미실행이며 private VM/disk 정리와 구분한다.

기존 이슈 해결까지 연속 진행 승인과 수행계획의 원인별 최소 수정 범위로 다음을 진행한다.

- Windows 전용 sidecar build에서 Rust의 crt-static을 명시해 handler와 worker에 CRT를 정적으로 연결한다. 사용자별 NSIS/UAC/HKCU·MSI/HKLM 정책은 유지하고 사용자에게 별도 관리자 권한 VC 설치를 요구하지 않는다. COM 객체는 모듈 안에서 할당/해제하고 외부에는 COM/GDI 경계만 노출하므로 CRT heap을 모듈 경계에서 공유하지 않는다.
- 별도 helper scripts/windows-thumbnail-crt.mjs에서 Cargo 환경의 명시된 기존 flags를 보존하고 정적 CRT flag를 적용한다. scripts/windows-pe-imports.mjs에서 생성된 PE의 일반·delay import를 검사해 VCRUNTIME/MSVCP 등 외부 재배포 런타임 의존성이 남으면 staging을 중단한다. 실제 old artifact가 이 gate에서 실패하는지 확인한다.
- tests/windows-thumbnail-crt.test.mjs에서 flag 우선순위 보존, 외부 CRT/지연 import 거부, 손상된 PE 거부를 검사한다. 기존 thumbnail build와 전체 automation/boundary/action pins/actionlint를 로컬에서 실행한다. Rust/Tauri는 Windows/Linux CI에서만 실행한다.
- 공통 build script 영향에 따라 새 product source의 profile=full을 실행한다. 모든 지원 target 검사와 새 설치/재설치/public upgrade/MSI·타사 연결·제거를 검증한다. 성공한 새 Windows producer SHA/run/artifact/digest로 guest 입력을 명시적으로 갱신하고 같은 공식 clean ISO에서 오프라인 설치·reference DLL 로드·실제 일반 Explorer/API·제품 제거를 다시 확인한다. 외부 CRT 없는 조건에서 실패→성공을 확인하기 전에는 수정 완료로 주장하지 않는다.
- 기존 impl/orders와 mydocs/working/task_m010_132_stage3.5.md, 승인된 docs/architecture/WINDOWS_THUMBNAILS.md의 빌드 경계를 필요한 부분만 갱신한다. PR 전 보고와 실제 Windows 10 미검증, 재릴리즈 미완료 상태를 유지한다.

Stage 3.5 로컬 검증: automation 1,420/1,420, boundary 882 files, action pins 32 workflows/182 references/11 pins, Python AST 및 diff 통과. 실제 기존 producer의 DLL/worker 두 개 모두 새 PE gate에서 VCRUNTIME140.dll 의존성으로 예상대로 거부됐다. 전체 actionlint는 변경하지 않은 alhangeul-font-performance.yml:114의 기존 shellcheck SC2016 안내를 반환한다. shellcheck 제외 전체 workflow 구조 검사는 통과했으며 이 무관한 스크립트는 수정하지 않는다. 새 helper와 검증 함수는 파일 300/함수 50 LOC 권장 범위 내로 분리했다.

2026-11-13 연속 진행: product source 1e08891d6411e17806a5b3a48635a5fbca7a639f의 full run 43241666433을 시작했고 fast 두 job이 성공했다. Tauri CLI 2.10.1은 본체에 STATIC_VCRUNTIME=true를 설정하고 tauri-build는 static_vcruntime::build를 호출하지만 독립 sidecar에는 이 경로가 없음을 공식 소스에서 확인했다. handler의 DllMain은 module handle 저장만 하며 정적 CRT에 필요한 thread 알림을 비활성화하지 않는다. 후속 guest gate는 시스템 VC runtime 부재/로드 오류 126, reference handler 로드 성공 0, offline install exit 0과 네트워크 재시도 없음까지 요구한다. 실제 PNG 내용 확인과 제거 결과는 별도 필수다.


Stage 3.5 후속 후보: product source 1e08891d의 Windows artifact 13960733196(186,351,819 bytes)을 내려받아 ZIP SHA256 b9a9f28916954bcf6f7cef1b86904e09b38583a38421224c64e44fafd07267cf와 inventory를 확인했다. 새 handler/worker PE import에 VCRUNTIME 등 외부 VC 런타임이 없고 Windows 시스템 DLL만 남았다. NSIS SHA256은 22e9c4d17d4b3669510c6af70d5721ea0feed7a51f3d7911d11d989b56aa3a68, MSI는 09cd65ac1e3af59251fb058f777edbdc7d2527f6b14a1df01d6265eab56eb58c다. full producer 전체 success 확인 전 guest를 실행하지 않는다. 기존 시각 기준 fixture의 a2796fc0 provenance는 역사적 기준으로 유지한다.

후속 harness는 네 개 fixture ID·각 bitmap·소유 사용자/세션·표시 설정 복원·제품 제거를 모두 요구하는 순수 판정 함수를 분리했고 누락/불일치 대조 12개를 검사했다. 패키징 거부 시 기존 두 staged binary가 덮어써지지 않는 회귀 검사를 추가했다. 로컬 automation 1,421/1,421, boundary 882 files, action pins 32/182/11, shellcheck 제외 actionlint와 diff가 통과했다.


Stage 3.5 제품 full 결과: run 43241666433/attempt 1이 success로 완료됐다. Windows/Linux x64·arm64 native/build/package gate와 필수 Windows 설치 계약이 통과했다. Windows 빌드 후 target cache 압축·저장은 약 11분 33초였으며 제품 빌드/설치 timeout이 아니다.

- 표준 사용자 NSIS evidence 13963150860(digest f2bdcb6b915c6d266a4f01deaf0a7032efd28e45bbb258c927587414ca7de130): 새 설치·재설치 문서 bitmap 12개/JPG 4개, 제품 제거·계정/profile/scratch 정리 통과. 화면은 아직 미검증이다.
- MSI lifecycle evidence 13963201773(digest 9bb0d4cdccaee96ff171b29edbe652e3f5c08cae8c1f7467dfa201f8c3dcc805): strict-product, thumbnail/lifecycle passed.
- 관리자 NSIS evidence 13962582179(digest 2cd26b42aaaacfc068ce76f66d0db04791cd6d051fb9b403a464b95fd6bc2e66): raw failure 12개와 thumbnail not-accepted가 유지된다. 지원 범위 제외 진단 통과이지 기능 해결이 아니다.
- MSI forced evidence 13962223356(digest 069e49646ecb719f7a6ac350efe3d2983152aea61078ae53ef5895a36e6053c4): thumbnail passed, lifecycle reboot-required/3010, post-reboot-unverified이며 기존 제외 범위를 유지한다.
- 이번 full 입력에는 thumbnail_same_version_upgrade를 선택하지 않았다. 공개본→새 CRT 후보의 동일 버전 수동 업그레이드는 이 full 결과로 새로 수용하지 않으며 후속 exact-artifact 검증으로 남긴다. 기존 a279 후보 결과도 새 bytes 수용으로 옮기지 않는다.

후속 guest run 43259686576은 harness 84f852c916771642273ff543766ddcb514acf1ba와 product 1e08891d를 분리해 고정했다. fast 두 job이 통과했고 공식 ISO digest 확인 후 2026-11-13 01:36 KST에 새 Windows guest를 시작했다. 결과 확인 전 화면/clean 설치 성공으로 판정하지 않는다. 로컬 T7에는 약 398 GiB가 남아 있고 ARM64 Mac에서 x64 UTM VM 전체를 T7에 보관하는 구성이 가능하다. 로컬 VM 앱 설치/디스크 포맷/Windows 설치는 실행하지 않았다.


문서 위치 보완: 기존 승인된 공식 운영 문서 CI_VALIDATION.md에 guest 실행·exact 입력·비밀/디스크 정리·시각 판정 경계를 추가하고 RELEASE_CHECKLIST.md에 clean VC runtime 부재 검사를 추가한다. 검증 작업자가 재현할 절차이므로 기존 운영 문서가 소유하며 새 문서 루트는 만들지 않는다. 실행별 성공/실패 근거는 현재 impl과 Stage 3.5 보고에 둔다.


Stage 3.5 guest 결과: run 43259686576/attempt 1이 success다. 같은 ISO에 VC runtime이 없는 상태(로드 오류 126)를 유지하며 reference handler는 로드 0, 오프라인 설치·재설치·제거는 모두 0이다. 실제 non-admin/medium 사용자와 desktop/창 SID·session 일치, HWP 2/HWPX/JPG force-extract bitmap 4/4, 설정 복원·제품 자체 제거, owned VM 종료와 private disk/credentials 제거가 통과했다. guest 관측 880.86초, 네트워크 재시도 없음이다. artifact 13965300396/ZIP SHA256 33d35b1f9e4f72b0a480bde5744ba5502e3ebcdacbf2e4106c4aee8ca4e21a34와 PNG SHA256 42e59df5afca7836c96b5d3cff50c53e536f25af2478408141bbd5309c2cb6dd를 검증했다. 원본 화면에서 HWP 시험지·HWPX 표/본문·JPG를 직접 확인했고 빈 HWP는 내용 판정에서 제외했다. 사용자 golden 승인이나 전체 릴리즈 수용은 아니다. [Stage 3.5 보고](../working/task_m010_132_stage3.5.md)에 범위와 잔여 검증을 기록한다.


## Stage 3.6 — MSI 실제 클라이언트와 동일 버전 업그레이드, Windows 10 확장

2026-11-13 작업지시자가 남은 MSI 클라이언트 화면·동일 버전 업그레이드와 무료 runner의 Windows 10 가능한 범위 검증을 명시 지시했다. 기존 #132/local/task132 및 성공 제품 1e08891d/run43241666433/artifact13960733196/digest b9a9f28916954bcf6f7cef1b86904e09b38583a38421224c64e44fafd07267cf를 재사용한다. PR 생성 전 보고 요구는 유지한다.

- 서로 다른 fresh guest에서 MSI와 NSIS public-upgrade를 수행한다. MSI는 protected payload의 고정 MSI만 SYSTEM 예약 작업으로 설치/일반 재설치/제거하고, 실제 로그인한 non-admin 사용자가 Explorer/API를 검증한다. UAC/DCOM·설치 범위는 바꾸지 않는다. 요청은 고정 operation marker뿐이며 임의 경로/명령을 privileged actor에 넘기지 않는다. 관리자 결과는 Users가 쓰지 못하는 경로에 생성한다.
- NSIS upgrade는 고정된 최초 공개 v0.1.3 bytes와 binary 해시를 확인한 뒤 후보 /UPDATE·재설치·제거, 설정 sentinel 보존과 실제 화면/API를 검증한다. 이전 공개본이 필요로 하는 VC runtime은 이 시나리오에서만 공식 Microsoft 서명·hash가 확인된 재배포 패키지로 별도 준비한다. clean CRT 부재 수용과 구분하고 수정 후보를 위해 제품 prerequisite 정책을 바꾸지 않는다.
- Windows 10은 공식 Microsoft 22H2 evaluation ISO의 제공 여부·공식 SHA256을 확인한다. 확보되면 동일 KVM 경로에 OS/locale/build 입력을 명시해 fresh NSIS/MSI 및 가능한 upgrade를 실행한다. 오래된 ISO의 WebView2 prerequisite는 공식 패키지/서명·hash 확인 또는 원래 installer의 명시된 다운로드 경로로 구분해 기록한다. OS activation/rearm·설치 요구사항 우회·비공식 ISO는 사용하지 않는다. 확보/사용권 확인이 안 되면 그 경계와 가능한 정적/hosted 결과를 보고한다.
- guest 선택 입력과 concurrency를 분리해 서로 다른 실행이 취소되지 않게 한다. source는 기존 scripts/ci/guest-ui-*와 reusable guest workflow를 역할별 helper로 확장한다. 파일 300/함수 50 LOC 권장 범위를 유지하며 제품 rebuild는 하지 않는다.
- parser·bounded process·고정 operation·시나리오별 evidence 누락/불일치 회귀, automation/boundary/action pins/actionlint/diff, fast 계약, 실제 guest 관측·PNG 검토·제품/VM 정리를 검증한다. 부분 실패를 전체 수용으로 올리지 않는다.
- 문서 위치는 기존 impl/orders, mydocs/working/task_m010_132_stage3.6.md와 이미 승인된 CI_VALIDATION/RELEASE_CHECKLIST다. 새 공식 문서 루트는 만들지 않는다. 로컬 private 출력은 T7 연결을 확인한 기존 task132 output만 사용한다.


Stage 3.6 실행 준비 기록(2026-11-13): T7 재연결을 확인한 뒤 private 증거 저장을 재개했다. 제품은 1e08891d의 성공 artifact를 그대로 재사용한다. 로컬 automation 1,421/1,421, boundary 891 files, action pins 32 workflows/182 references/11 pins, shellcheck 제외 actionlint 및 diff가 통과했다. Python guest helper는 파일/함수 권장 크기 안에 있다. Windows에서는 새 PowerShell 회귀가 세 단계의 원본 파일 분리, binary 해시 불일치, 사용자 데이터 변조, Microsoft 서명 실패/3010을 검사한다.

- MSI guest: harness c1cdff2b, run 43361879933. Windows/Node fast 성공 후 새 Windows 11 guest 실행 중.
- NSIS 공개본 업그레이드: harness 940d0c4c, run 43362414253. Windows/Node fast 성공 후 guest 준비 중. 최초 공개본 installer SHA256 932c3316d9ea83cd5c38e3fe528518535751ac60fedd72776c5306085437c490을 고정한다.
- Windows 10 NSIS: harness f27414ed, run 43362730721. 아직 수용하지 않는다. Windows 10 Enterprise Evaluation 22H2 en-US x64 19045.2006 ISO의 공식 Microsoft hash PDF를 대조했다. SHA256 ef7312733a9f5d7d51cfa04ac497671995674ca5e1058d5164d6028f0938d668, 5,550,497,792 bytes다. 현재 평가판 안내 페이지는 지원 종료 안내로 redirect되지만 원래 공식 ISO URL은 HTTP 200이었다. 실제 CI에서 전체 bytes/hash를 다시 확인한다.
- VC prerequisite는 공개본 업그레이드에서만 사용한다. 공식 고정 다운로드 SHA256 9c02c9ed120f671b900e6b9471d890e3b2414117a7e53f4ae2e855466fa2b7c9, 18,863,624 bytes다.
- Windows 10용 WebView2는 공식 x64 Evergreen 링크가 가리킨 고정 URL에서 받은 215,195,856 bytes, SHA256 1d1c838e5971343c060415da7c630c3c1ca7ad33fbb61cca660f3c1122f4cca8이다. 다른 문서의 과거 WebView2 version/hash와 같다고 가정하지 않는다. 실제 guest에서 Authenticode Valid/Microsoft 서명과 설치 exit 0을 요구하며 제품 설치는 계속 오프라인이다.
- 위 prerequisite 파일·ISO·VM disk는 공개 artifact/cache에 넣지 않는다. 동일 버전 NSIS 수동 업그레이드를 MSI forced-reinstall 3010/재부팅 후 수용이나 updater 자동 갱신으로 확대하지 않는다.


Stage 3.6 첫 실제 결과: Windows 11 MSI run 43361879933은 자동 관측 gate와 설치/재설치/제거 exit 0, API 4/4, 표준 desktop owner, protected admin ACL, clean VC 부재/reference load 0, 설정·VM 정리를 통과했다. 그러나 직접 PNG를 보니 HWP/JPG는 내용이 보이고 HWPX는 앱 아이콘이었다. 따라서 MSI 화면 수용은 실패/보류이며 CI success를 시각 성공으로 기록하지 않는다. 원본 artifact 14008624350 digest e1e256c06a921ed09d29868f56a1ed3c6f8d1d7f56c78ae4b27265129e72bccd, PNG 95627450455c4a9ee81986783323509c0a9c13bf9a3b3f8736c6918204ff7805를 보존했다. HWPX 별도 API는 6,121ms에 bitmap을 반환했다. 원인은 아직 확정하지 않는다.

같은 새 guest/동일 제품으로 API warm-up이나 cache 삭제 없이 동일 Explorer 창의 10/30/60초 원본을 모두 보존하는 settling 대조를 진행한다. 첫 10초 원본을 덮어쓰지 않고 이후 원본/실측 경과/SHA를 추가하며 기존 hosted 경로는 기본 10초 동작을 유지한다. 마지막 화면만 골라 최초 실패를 숨기지 않는다.

Windows 10 NSIS run 43362730721은 success, guest 495.4초다. agent 직접 PNG에서 HWP/HWPX/JPG 내용을 확인했다. offline install/reinstall/uninstall 0, API 4/4, WebView2 공식 서명 Valid/설치 0, 표준 사용자·설정 복원·제품 제거/소유 VM 정리가 성공했다. artifact 14008953920 digest 6ec91bcd43dc400a9bda162c32a5c1bc80f0db05dcc79d77958d24435d3bb522다. 사용자 최종 golden/전체 제품 수용은 미완료다.


Windows 11 upgrade run 43362414253은 실패로 보존한다(artifact 14008769768, digest eceffd118134d5038b5c7e66f72b8e7f00e01049b52706dd7b3ad0373ce669ab). VC 공식 서명/설치와 공개본 설치 exit 0·binary 해시는 통과했으나 baseline small-hwp force-extract가 0x8004B200/bitmap null이었다. 잘못된 baseline 성공 요구 때문에 후보 설치는 미실행이었다. baseline API는 네 fixture 모두 관측·원시 오류를 보존하되 기존 결함 때문에 업그레이드를 막지 않도록 수정한다. 후보 upgrade/reinstall은 계속 네 bitmap 모두 성공을 요구한다. baseline 누락/skipped와 후보 실패는 거부하는 회귀를 추가했다. sentinel을 baseline probe 전에 생성하고, 사전 실패로 sentinel이 없는 경우의 추가 cleanup 속성 오류를 방지한다. 기존 공개본 자체 제거 실패는 별도 보존하며 후보 제거 성공으로 치환하지 않는다.


Windows 10 업그레이드 run 43363316610은 20분 checkpoint(artifact 14010271982, digest b78fefba85760484378f936efd2ccc326f9891d1eb1bfe7f23e4eda058a55a43)의 실제 화면에서 Windows setup의 unexpected restart/error로 설치가 진행 불가능함을 확인했다. 앱 검증 전 실패이며 실패 화면을 보존한 뒤 owned run을 취소해 always 정리/증거 업로드를 진행한다. 동일 ISO의 NSIS/MSI fresh는 이미 성공했지만 이 실패의 원인은 확정하지 않는다. 새 실행에는 specialize bootstrap의 고정 단계명·숫자 HRESULT만 COM1으로 전송하는 진단을 추가한다. 암호/예외 본문은 전송하지 않고 로그 전송 실패 자체가 OS setup을 실패시키지 않는다. baseline 관측 보정과 함께 새 fresh VM으로 다시 실행하며 원래 실패를 성공으로 소급 변경하지 않는다.


MSI Windows 11 settling 대조 run 43364403752(ba0de2d5)은 success다. artifact 14010895820 digest 589874060b95f0e292d9697a373265eb7ce8c370f8ed0ffd1193acd6add8bb60을 검증했다. 같은 창의 10.254초·30.083초 PNG는 이전 실패 화면과 동일 SHA256 95627450455c4a9ee81986783323509c0a9c13bf9a3b3f8736c6918204ff7805이며 HWPX가 아이콘이다. 60.054초 PNG(f896e80c5ffb1bd33962c7749c4750fffe55ad76c22add697fab1597b68f34f9)에서는 HWPX 양식 내용이 보인다. API 선행 호출·새로고침·cache 삭제 없이 같은 창에서 전환됐다. agent 직접 검토와 기존 정상 Windows 11 NSIS의 내용 영역 signature 비교 모두 HWP/HWPX/JPG 일치를 확인했다. 30~60초 사이 초기 표시 지연으로 기록하며 즉시 표시 성공이나 1,500ms worker deadline 원인 확정으로 확대하지 않는다. 설치/재설치/제거 0, API 4/4, clean VC 부재, ACL·설정·VM 정리도 통과했다.

Windows 10 MSI run 43363313049(f27414ed)도 success다. artifact 14009269591 digest 41a7a79fee8f9f261bf2101de419b1078ba9c1eec9108978cd14160671f3904d, PNG는 Windows 10 NSIS와 동일한 05c92e4d2f5b792015a9454e9ec12dca53bc75d14dba1073652e0b39bde2a9a6이다. 실제 표준 Explorer 내용·설치/재설치/제거·API 4/4·관리자 경계·설정/VM 정리가 통과했다. 두 Windows 10 fresh는 WebView2 준비 후와 제품 설치 후에도 System32 VC runtime 부재/로드 오류 126, reference handler 로드 0이다.

OS 설치 실패 run 43363316610은 cancelled로 완료됐으며 final artifact 14010686374 digest 081851a5071caae1daed3826e8f2fcfc0653093c111610f3ea1302fc5b775f0e를 보존했다. supervisor stop과 QEMU/TPM 종료, private disk/시험 암호 삭제 step은 모두 success다. 재실행은 bootstrap 단계 진단과 baseline 관측 보정을 포함한 b6d4f278/run43366550152다. Windows 11 수정 업그레이드는 902fd0a8/run43365033227이다.


Windows 11 upgrade 대조 run 43365033227은 후보 설치 exit 0·DLL/worker 정확한 hash·원본/후보 설치·사용자 데이터 보존·제품/VM 제거는 확인했지만, 공개본에서 실패했던 동일 small-hwp 경로가 후보 교체 직후에도 0x8004B200이었다. 후보 upgrade bitmap 실패 때문에 전체 수용은 실패다(artifact 14010348842, digest 8fd37b33b85da1a90c98c861f4f960e111a268fd41043de9749fe8915f3e28f1). 기존 hosted standard-user 검사는 각 phase마다 새 fixture 경로를 쓰지만 이번 guest는 같은 경로를 재사용했다. 차이가 원인인지 아직 단정하지 않는다.

다음 진단은 후보 upgrade 네 원본 경로의 실패를 모두 보존하고, 첫 실패 fixture의 동일 bytes 새 경로와 60초 뒤 원래 경로를 별도로 요청한다. 파일 hash·attributes와 원시 결과를 기록한다. 그 뒤 재설치·화면·제거까지 관측하되 최초 후보 실패는 계속 최종 gate 실패로 유지한다. cache 삭제, Explorer/dllhost 종료, 입력 문서 수정이나 판정 완화로 성공을 만들지 않는다. 추가 raw JSON 두 개를 포함해 upgrade의 serial 파일은 기존 20개 상한 안에 둔다.


Windows 10 공개본 동일 버전 NSIS 업그레이드 재실행 run 43366550152(b6d4f278)은 success다. artifact 14011615148/ZIP SHA256 b2f2e1ce66eba6f77b890ee717a26744880dcf20eca4552e5267e815c8ac1028을 검증했다. baseline·후보 /UPDATE·재설치·제거는 모두 exit 0이고 각 설치의 DLL/worker bytes·hash가 일치한다. 같은 원본 경로의 baseline/upgrade/reinstall API는 각각 4/4 bitmap 성공이다. LocalAppData와 RoamingAppData 두 sentinel은 업그레이드와 최종 제품 제거 뒤에도 보존됐다. VC/WebView2의 공식 hash·Microsoft Authenticode Valid·설치 0, 표준 사용자 desktop/token·protected ACL·설정 복원·소유 VM 종료·private disk/암호 제거를 확인했다. 같은 창의 10/30/60초 PNG는 모두 Windows 10 fresh NSIS/MSI와 같은 SHA256 05c92e4d2f5b792015a9454e9ec12dca53bc75d14dba1073652e0b39bde2a9a6이며 HWP/HWPX/JPG 내용을 직접 확인했다. bootstrap 고정 단계 로그는 모두 errorCode 0이다. 앞선 OS 설치 실패의 원인 해결을 증명하지는 않으며, 이번 fresh VM의 전체 성공으로만 기록한다. 사용자 golden/전체 릴리즈 수용, MSI forced-reinstall 후 재부팅 검증과 자동 updater 검증은 별도 미완료다.


Windows 11 대조 run 43367984422(9cc68064)는 최초 upgrade small-hwp 실패를 유지하며 failure로 완료됐다. artifact 14011738629/digest 5f26649a14f0cdaa14afcb876255bd130d31f33f4aba59ef042628b73b0c74c3이다. 나머지 upgrade 3개는 성공했고 같은 small-hwp bytes의 새 경로는 2,496ms, 60초 뒤 원래 경로는 2,566ms에 bitmap을 반환했다. 두 입력의 attributes는 ReadOnly, Archive로 같았다. 재설치 API 4/4와 모든 설치/제거 exit 0·사용자 데이터 보존은 통과했으나, 실제 10/30/60초 화면에서는 HWPX가 계속 앱 아이콘이었다(PNG cd40c8c86882af6504e6fe3985bd0476d27d95ac4188f1971cc0a7d2a4714a49). 영구적인 파일 경로 실패로 단정할 근거는 없으며 초기 처리 지연 원인은 미확정이다. 전체 수용은 계속 실패다.

후속 진단은 후보의 첫 small-hwp 추출 실패 직후, 나머지 fixture 호출 전에 exact 설치 Worker를 직접 실행해 기존 프로토콜의 첫 bitmap/control frame 도착 시각을 측정한다. 요청은 SHA256 확인한 공개 fixture와 Ubuntu의 b3sum으로 만든 기존 BLAKE3 header를 사용한다. frame 크기·개수·총 시간과 소유 child 정리를 제한한다. 이 진단의 상한 10초는 측정을 위한 별도 조건이며 제품 handler의 1,500ms 제한·job 정책이나 수용 gate를 바꾸지 않는다. 직접 Worker는 Shell 격리 문맥과 같다고 주장하지 않으며 최초 Shell 실패를 보존한다. 실제 child의 지연 응답·잘못된 frame·timeout/종료와 request hash 변조 회귀를 Windows fast에서 먼저 실행한다.


Worker 진단 선행 run 43374423592(77c6c17d)와 43374741923(3f0c583a)은 합성 child의 malformed-frame 회귀에서 실패해 실제 guest가 시작되지 않았다. 두 로그를 별도 보존했다. Windows PowerShell 5.1/.NET Framework는 Process.Start에서 Console.InputEncoding의 preamble을 stdin에 먼저 보낼 수 있어, BaseStream에 직접 써도 요청 bytes가 변형된다. 기존 windows-thumbnail-app-process.ps1의 BOM 방지 실행·encoding 복원을 재사용했다. 합성 child는 허용된 한 바이트 외 추가 bytes를 거부하고 정상 1.7초 지연·잘못된 frame·10초 timeout·자기 child 종료·request hash 변조·encoding 복원을 검사한다. 수정 d2b16313/run43374999732의 Windows/Node fast는 모두 success이며 실제 guest 관측은 진행 중이다. 로컬 automation 1,421/1,421, boundary 895 files, action pins 32/182/11, Python 크기·구문, shellcheck 제외 actionlint와 diff가 통과했다.

small-hwp 원본 CFB의 PrvImage stream에서 실제 PNG가 있음을 확인했다. 5,126 bytes, 724×1024, SHA256 2103d51fb863769afce086d2aa45eda343808e1c478527a9d40b3dfbebe513c6이며 원본은 흰 빈 페이지다. 내장 preview 부재를 원인으로 가정하지 않는다. Worker의 시작·첫 preview header와 전체 payload·직접 결과 완료 시각을 확인한 뒤 원인을 판단하며 현재 제품 1,500ms/256MiB 제한은 변경하지 않았다.


Worker 측정 run 43374999732(d2b16313)은 failure로 보존한다. artifact 14014913687/ZIP SHA256 dd96072599e12a4cc32c83eb78bf78e7f58842c14c9c05b58bff20dddec25e68이다. 후보 최초 small-hwp Shell 추출은 다시 실패했지만 exact Worker 직접 실행은 process start 19ms, preview header 69ms/전체 payload 96ms, DirectBitmap 완료 105ms, Complete 106ms·전체 117ms·exit 0·stderr 0이었다. 직접 실행은 Shell 격리/handler Job 경로와 다르므로 이 결과로 첫 cold-start 실패를 배제하거나 timeout 원인을 확정하지 않는다. 다만 현재 측정은 1,500ms 제한 완화의 근거가 되지 않는다. baseline과 upgrade 나머지 3개, 재설치 4/4 API·설치/제거·사용자 데이터 보존은 성공했으나 HWPX는 10/30/60초 동일 앱 아이콘(cd40c8c8…)으로 남아 화면 수용도 실패다.

다음 대조는 최초 후보 Shell 실패 직후 exact 설치 DLL을 새 STA child에서 CoCreateInstance(CLSCTX_INPROC_SERVER) → IInitializeWithStream → IThumbnailProvider.GetThumbnail 순서로 호출한다. 단계별 HRESULT/시간·실제 HBITMAP 크기·로드된 DLL hash를 확인하고 child는 15초 이내 종료/회수한다. 이 호출은 진단 전용이고 기존 Shell 실패·UI 판정은 유지한다. Worker 직접 측정도 이어서 기록한다. COM 격리/UAC/등록/설치 범위·제품 bytes와 deadline은 바꾸지 않는다.


첫 Shell 요청 당시 실제 Worker의 생성/종료 여부를 놓치지 않도록 기존 protected SYSTEM actor에 읽기 전용 Win32_ProcessStartTrace/StopTrace 구독을 준비한다. 고정 이름 AlhangeulThumbnailWorker.exe/dllhost.exe의 PID·부모 PID·session·UTC 시각·종료 코드만 최대 500건 수집하고 명령행·문서 내용은 수집하지 않는다. upgrade prerequisite 완료 전에 구독을 시작하고 표준 사용자 측 제거 후 고정 trace-stop marker로 회수·구독 해제한다. 결과는 protected 응답에서 guest.json에 포함해 기존 serial 20-file 상한을 유지한다. 첫 Shell·각 후속 probe 시각 및 직접 실행 PID를 함께 기록한다. 실제 소유 합성 child의 시작/정상 종료와 구독 정리 회귀를 별도 fast 실행으로 먼저 확인하며, 진행 중인 a572dec2/run43378283120 guest는 취소하지 않는다.


프로세스 관측 fast run 43379594497/43380125698은 종료 이벤트 누락 회귀로 실패했다. 두 번째 대조에서 같은 합성 PID의 StartTrace 이름은 AlhangeulThumbnailWorker.exe, StopTrace 이름은 AlhangeulThumb로 잘리는 실제 차이를 확인했다. 종료 필터에 이 정확한 관측 이름만 추가하고 원시 이름·PID·시각을 보존했다. 수정 725caee4/run43380575230의 Windows fast 회귀가 통과했다. 이름만으로 worker 수명을 추정하지 않고 Start/Stop의 PID·시각을 대조한다.

후속 guest는 최초 실패를 유지한 뒤 동일 원본의 기본 flags=4 재요청, SDK 디버그용 WTS_EXTRACTINPROC|FORCEEXTRACTION(0x104), 별도 surrogate 강제(0xC04)를 각각 새 STA child에서 비교한다. 이는 per-call 진단이며 제품의 DisableProcessIsolation·DCOM/UAC·등록 값을 변경하지 않는다. 각 child는 15초/출력 16KiB 제한과 소유 PID 종료를 적용하고 각 requestFlags·HRESULT·bitmap·시각·child PID를 구분한다. 이후 기존 직접 DLL/Worker 관측을 실행한다. 원래 upgrade 실패를 디버그 경로 성공으로 수용하지 않는다. 공식 플래그 근거: https://learn.microsoft.com/en-us/windows/win32/api/thumbcache/ne-thumbcache-wts_flags


COM provider 선행 run 43378283120(a572dec2)은 Windows 진입 전 UEFI 메뉴에 정체됐다. 60초·1,200초 화면이 같은 메뉴이며 guest JSON/앱 진단은 없었다. checkpoint 14016448790/digest a6b5efe5180354e0fe094444ee843e17c5e0d474b14c230713031bb73581a3c4와 final 14017156490/digest 50e2362092ccec17b19839fcfbdeeda7e983117d66d3ff4a552f7299eebd7f44를 보존한 뒤 소유 run을 취소했다. supervisor/QEMU/TPM 정리와 private disk/시험 암호 제거 step은 성공했다. OS 부팅 실패 원인은 아직 미확정이며 앱 실패나 provider 성공으로 해석하지 않는다. 프로세스 trace와 per-call cache 대조를 포함한 fa625a5f/run43382146465에서 새 guest로 다시 관측한다. 해당 실행의 Windows 선행 회귀는 success다. 725caee4/run43380575230 fast 전체도 success이며 Windows 결과는 115 sources/23 isolated tests다.


fa625a5f/run43382146465는 failure로 완료됐다. artifact 14017804152/digest 48e376f29ad02e5d288cdeb8f190bf0783702d008075e47d1b41a570c2223546을 검증했다. 최초 upgrade small-hwp는 다시 0x8004B200이었고, 직후 동일 파일의 기본/INPROC/새 surrogate 비교는 각각 70/64/162ms에 bitmap을 반환했다. exact DLL 직접 호출은 activate 1ms/initialize 0ms/GetThumbnail 21ms, 전체 26ms·module hash 일치이며 raw Worker는 전체 75ms/exit 0이다. 후속 성공을 최초 실패 대신 수용하지 않는다. 설치/재설치/제거 0, sentinel·설정·제품 제거·VM/디스크 정리는 통과했으나 10/30/60초 모두 HWPX 아이콘(PNG 400a08a44370e90f8168f908fefad886f5a410f84a23e68aeee5bb4f8a366d21)이었다.

WMI TIME_CREATED에는 서로 다른 이벤트가 100ns 간격으로 묶이고 성공한 21ms DLL/75ms Worker도 사실상 0ms로 계산되는 한계가 드러났다. 일부 이벤트는 해당 호출 종료 뒤 기록되므로 첫 실패 구간의 worker 부재·수명·deadline 원인을 이 시각으로 확정하지 않는다. 기존 raw WMI 기록은 보존하고 후속 관측은 고유 이름의 Microsoft-Windows-Kernel-Process ETW session(perf clock, process keyword, 16MiB circular)으로 보정한다. raw ETL은 protected guest 임시 경로에서만 읽고 삭제하며 artifact에 보내지 않는다. 출력은 대상 두 실행 파일의 PID/부모 PID/시각/종료 코드만 허용한다. 실제 소유 child의 StartTime/ExitTime과 ETW 수명 차이, 세션 종료와 private 파일 제거를 Windows 회귀에서 먼저 검증한다. 제품 deadline/격리/보안 정책은 바꾸지 않는다. 공식 API 근거: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/logman-create-trace 및 https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent?view=powershell-5.1


ETW 선행 1a498c05/run43386129362와 86caa629/run43386432825는 Windows 회귀에서 Stop 이름 필터로 실패했으며 후속 dispatch로 전체 run은 cancelled다(guest 미실행). 두 번째 원시 대조에서 Start 이름은 전체 exe, Stop은 AlhangeulThumb이고, ETW 간격 919.9069ms와 실제 Process 수명 919.9524ms가 일치했다. 수정 3f6db554/run43386782076의 Windows·Node fast는 통과했다.

실제 ETW guest run43386782076은 최초 upgrade 실패를 보존해 failure다. artifact 14019953494/digest f8021f0bb1887a0b860aa634fffd25617b75973b7437a449833c1e64c01a035a. baseline 첫 worker는 11.595ms, 후보 첫 worker는 7.583ms 생존 후 exit 1이며 다음 같은 surrogate의 성공 요청은 22.838ms였다. handler는 정상 성공 후에도 자기 worker를 exit 1로 종료하므로 종료 코드만으로 오류 원인을 추정하지 않는다. 직접 DLL GetThumbnail 33ms·정확한 module hash, Worker 전체 117ms/exit 0·후속 cache 3경로 성공, 설치·재설치·제거·sentinel·ETW session/raw ETL 정리 통과다. 실제 화면 10/30/60초는 HWPX 아이콘(843892cc2fad85b8bd9a4857c5076843d11817c46409276099b2e005df086942)으로 남았다.

다음 대조는 원래 upgrade 첫 실패와 후속 probe를 모두 기록한 다음 진단용 재설치 두 번을 별도 기록한다. 첫 재설치 직후 cold DLL의 activate/initialize/GetThumbnail 시간을, 두 번째 직후 cold Worker Process.Start/첫 frame 시간을 측정한다. 각 재설치 exit/hash/sentinel과 실패를 보존한다. 이후 기존 정상 재설치→사전 API warm-up 없는 Explorer→API→제거 흐름을 다시 실행한다. 추가 재설치가 포함된 진단 실험으로 명시하며 최초 실패를 후속 성공으로 수용하지 않는다. 제품 시간 예산·격리·설치 범위는 변경하지 않는다.


ac2ff713/run43400996382는 최초 실패를 보존해 failure이며 artifact 14027060413/digest 6e15ebf584881de2e47a63e408f089483dd0bf669649b468ca55afd153bedb58을 검증했다. cold DLL은 activate 1ms/initialize 0ms, GetThumbnail 1,946ms 뒤 E_FAIL이고 그 child의 실제 ETW 수명은 4.262ms였다. 별도 재설치 직후 raw Worker는 Process.Start 2,862ms, preview 완료 2,873ms, direct 완료 2,879ms, 전체 2,882ms/exit 0이며 실제 프로세스 수명은 20.391ms다. Worker 생성 비용이 기존 시작 포함 1,500ms 예산을 넘고, 생성 후 즉시 종료돼 정상 bitmap을 받지 못하는 경로가 확인됐다. 이 자료만으로 생성 지연의 OS 내부 원인(예: 특정 보안 제품)을 단정하지 않는다. 추가 재설치 두 번 및 마지막 일반 재설치/제거 모두 0이고 exact binary/sentinel/owned trace 정리를 확인했다.

Windows 최소 수정: 기존 frame 선택 1,500ms와 256MiB/active process 1/격리 정책은 유지한다. Child::spawn 직후 frame 선택 deadline을 min(요청 시작+5,000ms, worker 준비+1,500ms)로 계산한다. cold 시작 2,862ms가 frame 예산 전체를 소진하지 않게 하면서 시작+선택은 5초 예산으로 제한한다. OS 생성 API 자체가 차단되거나 반환 뒤 cleanup하는 시간을 포함한 엄격한 전체 반환 시간 보장은 기존에도 없으며 새로 주장하지 않는다. 예산을 넘긴 시작 뒤 늦은 frame은 거부한다. warm/cold 시작, 전체 예산 끝 부근, 이미 만료한 시작을 Windows Rust 회귀로 검증한다. Linux의 shared 1,500ms 상수와 Linux 실행 경계는 그대로다. 승인된 docs/architecture/WINDOWS_THUMBNAILS.md의 resource budget/설명만 정합화한다. 실제 수정 commit으로 profile=full을 실행하고 성공한 exact 새 artifact로 Windows 11/10의 NSIS/MSI/동일 버전 업그레이드를 재검증한다. PR 전 보고를 유지한다.


수정 후보 d0a896ba56a5316f262c60866a3ec23a10201563를 게시하고 run43405485144(scope=full/profile=full/thumbnail_same_version_upgrade=true)을 시작했다. 로컬 automation 1,421/1,421, boundary 904 files 및 diff가 통과했다. Windows Rust 신규 회귀와 새 package/설치 수용은 해당 CI 및 성공 artifact의 client guest에서 확인하며, 진행 중인 검증을 통과로 기록하지 않는다.


안전한 중단 체크포인트(2026-11-13, 작업지시자 이동 요청): 새 작업·PR·릴리즈를 중단한다. 후보 d0a896ba의 full run 43405485144는 Linux ARM64 desktop clippy에서 src/pdf_temp_cleanup.rs:242의 needless_bool(-D warnings, Rust 1.100.0)로 실패했다. 해당 플랫폼의 desktop 테스트 187개와 별도 21/3개는 통과했고, 이 lint 실패를 썸네일 수정 실패로 혼동하지 않는다. Windows 제품 생성과 신규 handler 회귀는 아직 완료 확인 전이다. 사용자 요청으로 취소했고 모든 job의 completed 상태를 확인했다. Windows build/core와 Linux x64는 cancelled, Linux ARM64와 최종 집계는 failure다.

미커밋 변경은 orders/20261113.md, 본 impl, guest-ui-worker-diagnostic.ps1의 요청 5,000ms/frame 1,500ms 구분이다. 진단 label 변경은 아직 이전 제품을 고정한 harness와 함께 실행하지 않았다. 재개 시 먼저 Linux cfg별 bool 표현을 동작 보존 방식으로 정리하고 Windows/Linux full 검증을 다시 수행한다. 성공한 새 제품 SHA/run/artifact/digest로 hosted-ui-input.mjs·guest-ui-prepare.py·hosted-ui-windows.ps1·hosted-ui-standard.ps1를 함께 고정한 뒤 Windows 10/11 × NSIS/MSI/공개본 동일 버전 업그레이드를 다시 검증한다. 이전 1e08891d 결과를 새 제품 수용으로 사용하지 않는다. PR 생성 전 보고 및 별도 v0.1.3 재배포 경계를 유지한다.


재개(2026-11-14): 작업지시자의 계속 진행 승인과 T7 연결을 확인했다. full 검증을 막은 pdf_temp_cleanup.rs의 cfg별 bool 표현을 최소 정리한다. Windows는 symlink 또는 reparse 속성, Linux는 symlink 판정이라는 기존 동작을 보존한다. 기존 Linux symlink/Windows junction 보존 회귀와 desktop clippy를 각 지원 OS CI에서 재검증한다. 새 문서 위치는 추가하지 않으며 오늘할일은 기존 형식의 20261114.md로 이어간다. 미커밋 worker 진단 label 변경은 새 artifact 고정과 함께 후속 harness에 반영한다.


재개 검증 후보 ece8bb5e46a1a81e4d74ad2f1dbf84bde7fd59d4를 게시하고 full run 43453382283(scope=full/profile=full/thumbnail_same_version_upgrade=true)을 시작했다. 로컬 automation 1,421/1,421, boundary 904 files, diff가 통과했다. 이전 run43405485144의 최종 전체 conclusion은 cancelled이고 ARM64 lint/집계 job은 failure였음을 구분한다. 아직 새 제품을 수용하지 않는다.


새 후보의 Windows/Linux core와 native 테스트·clippy가 통과했다. Linux x64/ARM64의 symlink 보존 회귀 및 Windows junction 보존 회귀가 성공했고, Windows handler의 warm/cold 시작·전체 예산 상한·만료 후 queued frame 거부 회귀 3개도 성공했다. Windows artifact 14059615097(186,401,417 bytes), ZIP digest e799040e52d81e670eda4ed9080c7d8f6a3a0d1321c1088cf68a2f8f17ba0bb9를 다운로드해 source ece8bb5e와 내부 MSI/NSIS/DLL/Worker inventory 해시를 검증했다. 새 handler/worker의 PE import에서도 외부 VC 런타임 의존성이 없었다. 전체 생산 run은 아직 설치 검사 진행 중이므로 수용하지 않는다. 후속 harness의 네 source/run/artifact/digest 참조와 진단의 5,000ms/1,500ms 표기를 로컬에 준비했고 automation 1,421/1,421, boundary 904 files, diff가 통과했다. 생산 run 전체 성공 확인 후에만 이 harness를 게시·실행한다.


run43453382283 attempt 1 전체 success를 확인했다. 세 플랫폼 core/native/package와 Windows installer 계약·일반 사용자 NSIS 및 공개 v0.1.3 동일 버전 수동 업그레이드가 통과했다. NSIS elevated 진단과 MSI forced-reinstall의 조건부 계약은 실제 client 화면이나 재부팅 후 수용을 대체하지 않는다. 확인된 artifact 14059615097/e799040e52d81e670eda4ed9080c7d8f6a3a0d1321c1088cf68a2f8f17ba0bb9를 고정한 후속 harness를 게시하고 Windows 11/10 × NSIS/MSI/NSIS-upgrade 여섯 독립 guest를 실행한다. 화면 10/30/60초와 최초 후보 요청·정리 결과를 모두 검토하며 PR 전 보고를 유지한다.


새 제품 ece8bb5e / harness 92ed2d2b의 실제 guest 다섯 경로를 검산했다. Windows 11 NSIS run43469292558, MSI run43469285593, 공개본 동일 버전 NSIS 업그레이드 run43469281208과 Windows 10 MSI run43469304414, NSIS 업그레이드 run43469298756은 모두 attempt 1 success다. 각 ZIP digest·producer/source/harness·설치 binary 해시·표준 token·실제 Explorer 소유권·설치/재설치/제거 0·API 4/4·설정 복원·소유 VM/디스크 정리를 독립 확인했다. 10/30/60초 원본의 서로 다른 PNG를 직접 확인했으며 모든 시점에 HWP/HWPX/JPG 내용이 보였다. 빈 preview 원본 small-hwp는 내용 비교 대상에서 제외하되 bitmap 성공은 필수로 확인했다. MSI Windows 11의 10/30초와 60초 hash 차이는 UI/대조 JPG 크기 변화이며 HWPX는 첫 10초부터 내용이 있었다.

특히 Windows 11 업그레이드는 같은 VM에서 공개본 최초 small-hwp가 0x8004B200/6,665ms로 실패한 뒤, 후보 교체 직후 같은 원본 경로의 첫 요청이 bitmap 181×256/5,070ms에 성공했다. 나머지 세 fixture도 첫 요청에 성공했고 실패 후 진단·추가 진단 재설치는 실행되지 않았다. 공개본/후보 첫 worker ETW 수명은 각각 10.824ms/27.072ms다. Shell API 전체 경과와 handler 내부 예산은 다른 구간이므로 5,070ms를 strict 5초 반환 보장이라고 해석하지 않는다. 재설치 후 small-hwp API는 2,820ms, 10/30/60초 화면은 모두 39663f96fd8a7ab4d4a39b1b96029d27c8bb035456f6fd01210f2113bafee6ac이다. Local/Roaming sentinel과 trace session/raw ETL 정리도 통과했다.

Windows 10 NSIS fresh run43469311200은 120~1,140초 화면이 같은 TianoCore 로고(sha256 caf23d672e8def13d39bf3f899ac1fe31c371754160d9ae8d10742dde377dd32)에 정체됐다. 20분 checkpoint 14061837820/049381ce1de1b31a28e08f21b7745dd8deb90b0a7e2eb223640454cf0d2b97dd를 보존한 뒤 취소했다. guest.json은 없고 앱 수용은 미실행이다. 최종 artifact 14060404415/db434f61e7e16cbfede8ff6d0ea91a883370c21b5f9deafa69c35b3c027e3df1, supervisor 종료·QEMU/TPM 회수·증거 업로드·private disk/credentials 삭제 step success를 확인했다. OS 부팅 정체의 내부 원인은 미확정이다. 같은 제품·harness를 그대로 사용한 새 run43473883158에서 Windows 10 NSIS만 재실행한다. 이 재실행이 끝나기 전 전체 6경로 수용과 Stage 3.6 완료를 주장하지 않는다.


## Stage 4 인계용 동일 v0.1.3 재배포안 (미실행)

현재 검증한 ece8bb5e ordinary MSI/NSIS는 수정 기능의 수용 근거이며 최종 updater 서명 파일 수용을 대신하지 않는다. PR 생성 전 보고 후 devel 병합과 기존 release branch 절차를 거쳐 실제 배포할 source SHA를 고정한다. 이번 PR은 버전을 올리거나 기존 공개 태그·asset·feed를 변경하지 않는다.

1. 기존 v0.1.3 source bcb892d49a9003615f3acd980babd71e59e147dd, Release metadata와 11개 asset의 원본/hash를 보존한다. 기존 보관본 11개는 digest 일치를 확인했으며 실제 교체 직전에 원격 상태를 다시 읽는다.
2. 병합된 exact source에서 publish_release=false로 v0.1.3 서명 후보를 생성한다. ordinary 검증과 binary가 달라지면 새 NSIS/MSI·DLL/worker hash로 설치/Explorer/API/제거를 다시 수용한다. 새 파일 검증 전에 공개 asset을 먼저 교체하지 않는다.
3. NSIS는 최초 공개본에서 같은 버전 후보로 /UPDATE·재설치·제거와 Local/Roaming 데이터 보존을 이미 검증했다. 최종 서명 후보에서도 이 경로를 확인한다. MSI의 이번 client 결과는 후보 새 설치와 일반 REINSTALLMODE=omus 재설치이며, 이전 공개 MSI에서 새 MSI로의 교체와 forced-reinstall 3010 재부팅 후 성공을 대신하지 않는다. 실제 최종 MSI ProductCode/UpgradeCode/PackageCode와 재부팅 요구를 대조해 교체 경로를 확정한다.
4. 기존 updater는 update_version > current_version을 요구하므로 기존 v0.1.3에 자동 업데이트 알림이 뜬다고 안내하지 않는다. 같은 버전 재배포는 수동 다운로드/교체 안내가 필요하다.
5. 현재 publish job은 기존 tag가 다른 source면 거부하고 gh release create만 수행한다. 따라서 일반 게시 workflow 재실행만으로 덮어쓸 수 없다. 최종 source·파일/hash·서명·보존/복구 자료가 준비된 뒤 기존 v0.1.3 tag 이동 여부와 asset 교체 목록, checksum/inventory/Pages 갱신 순서를 구체적으로 보고한다. tag 이동·기존 asset 교체는 그 구체안에 대한 명시 승인 후 실행한다.
6. 게시한다면 공개 bytes를 다시 다운로드해 승인한 후보/hash/서명과 일치하는지 확인한다. 실패 시 이전 tag/11개 asset/inventory/checksum과 사이트 데이터를 복구할 수 있도록 교체 전 상태를 보존한다. Pages는 별도 승인된 devel source로 배포하며 제품 source와 혼동하지 않는다.

이 안은 배포 준비 순서와 남은 검증을 명시한 것이며 PR·merge·서명 후보 생성·태그 이동·Release 교체·Pages 게시를 수행했다는 기록이 아니다.


Windows 10 NSIS 재실행 run43473883158도 attempt 1 success다. 최종 artifact14062488370/digest06689455b43dc373eac5ec79f410d9ab83a8cf53d862ebe39e657f06aea19e8e, 정확한 설치 bytes·표준 사용자·install/reinstall/uninstall0·API4/4·VC 부재126·설정/제품/VM 정리를 독립 검산했다. 10/30/60초 PNG는 모두 05c92e4d2f5b792015a9454e9ec12dca53bc75d14dba1073652e0b39bde2a9a6이며 HWP/HWPX/JPG 내용을 직접 확인했다. 새 제품의 Windows10/11×세경로 관측을 완료했다. Stage3.6 보고서에 여섯 run/artifact/화면 hash와 한계를 기록하고 연속 승인 범위에서 Stage4 최종 보고·PR 전 알림으로 진행한다. 이전 부팅 실패의 원인 해결이나 최종 서명 파일·재배포 수용을 주장하지 않는다.


PR 전 기준 정합화: devel이 644d0ac52bb364e57907fd7cd98c57ceaf86dce2(#135/#136)로 전진했음을 확인해 merge로 통합했다. 충돌은 오늘할일 20261113/20261114의 add/add 두 건이며 #132와 #135 행·기존 후속 승인 내용을 모두 보존했다. workflow 목록은 두 작업의 항목을 모두 유지했다. apps/packages/crates/third_party는 검증 제품 ece8bb5e와 diff가 없어 같은 installer 증거를 재사용하며, 들어온 정책/사이트/CI 스크립트는 최종 fast에서 통합 검사한다. 기존 최종 보고 commit51c487b6의 fast43477466190과 통합 head의 후속 fast를 구분한다.

## Stage 5 — 승인된 동일 버전 재릴리즈 준비 (2026-11-14)

사용자가 PR 생성·재릴리즈 준비를 지시했고, 이어 “병합과 비게시 서명·검증까지 진행”을 명시 승인했다. 태그·공개 파일·Pages 교체 직전에 결과를 알린다. #138을 devel에 병합한 a79ce6c1과 devel→main #139를 병합한 4e99e883eec6bdf9d6ce59070c769f175052fc3f를 기록한다. 기존 main 정책을 보존한 merge-tree는 devel과 동일하다.

- 제품 source는 main 4e99e883으로 고정한다. updater run43551466131은 publish_release=false, full CI43551469171은 같은 SHA다. 두 workflow의 concurrency 충돌을 피하려 일반 패키지는 기존 ci.yml full 경로로 확보한다.
- 이 단계의 변경은 검증 도구·입력·기존 작업 문서와 릴리즈 기록이다. 제품 apps/packages/crates/third_party 및 production key/version은 변경하지 않는다. 같은 #132의 승인된 재배포 준비를 이어가며 기존 작업 브랜치를 재사용한다.
- signed guest 입력은 tracked candidate JSON의 source/run/archive ID·digest와 NSIS/MSI hash를 고정하고 production key로 서명을 확인한다. MSI에서 추출한 handler/worker를 기준으로 NSIS/MSI의 실제 설치 파일 hash·CRT 독립성을 확인한다. 일반 파일 입력은 기존 관측 재현용으로 유지한다.
- guest 시나리오에 공개 MSI→새 MSI의 같은 버전 교체를 추가한다. 공식 installer hash, MSI ProductCode/UpgradeCode/PackageCode/Version, 실제 등록과 이전 ProductCode 제거, Local/Roaming 데이터 보존, 처음 API 요청, Explorer, 재설치/제거를 검사한다. VC 없는 clean 상태와 baseline용 VC 설치를 구분한다. 3010은 재부팅 후 확인 전 실패/미검증으로 유지한다.
- 기존 Windows 10/11 세 경로와 새 MSI upgrade를 최종 signed bytes로 검증한다. 후보 생성 후 새 source/run을 가리키는 release_candidate_path로 NSIS/MSI/AppImage 문서 작업과 수동 Linux 패키지 검증을 실행한다.
- 정확한 입력/identity·실패 수용 회귀는 Node/Python과 Windows PowerShell CI로 검사한다. Mac에서는 Rust/Tauri를 실행하지 않으며 private 출력은 연결된 T7만 사용한다.
- 기존 승인 위치인 mydocs/plans/working/report/orders와 docs/releases/v0.1.3 기록만 갱신한다. 새 공식 문서 루트는 만들지 않는다. 짧은 사용자 notes는 현재 지원 범위·수동 교체·재배포 날짜를 반영하고 생성기 검증을 거친다.
- 공개 원본 11개 actual hash와 checksum, 서명 3개, tag object·body·현재 Pages 3개 JSON을 재검증·보존했다. 실제 교체 목록·tag SHA·notes hash와 복구 범위는 최종 bytes 수용 후 제시한다. 공개 assets·tag·feed는 아직 그대로다.

검증 하네스 구현: MSI upgrade의 관리자 단계 JSON 4개 추가에 맞춰 serial 증거 상한을 20→24개로 제한 확장한다. 파일당 5MiB·파일명·hash·중복·전체 완료 검사는 유지한다. 로컬 자동화 1,421개, guest identity 실패 회귀, boundary 및 변경 workflow actionlint를 통과했다. 실제 Windows PowerShell와 signed guest 실행은 이어서 검증한다.

## Stage 6 — 승인된 동일 v0.1.3 공개 교체 (2026-11-14)

작업지시자가 “PR #140 병합하고 준비한 교체안대로 같은 v0.1.3 재릴리즈를 완료해줘. 실패하면 원본으로 복구하고, 공개 파일과 Pages·피드 검증까지 계속 진행해줘”라고 승인했다. #140은 필수검사43560703698 통과 후0029d13f893006e51167a678189cd4e0e7609312로 병합했다.

제품은4e99e883eec6bdf9d6ce59070c769f175052fc3f, 기존 Release ID441647361, 교체11개와 본문은 Stage5의 고정 SHA256을 사용한다. 새 빌드는 하지 않는다. 기존 tag object8bb3b997cd2279c1e92f440ed7d1f1810c14b7cd를 lease 조건으로 v0.1.3 ref만 이동한다. 원본11개 actual hash·3서명·checksum·본문·Pages와 새11개 actual hash를 다시 확인했다.

1. devel 대상 유지보수 PR: site/release.json의 manifestPublished=false/inventory=null만 바꾼다. exact Pages 배포 후 manifest404·기존 다운로드 유지 확인.
2. 승인 source를 가리키는 annotated tag 생성·조건부 ref 이동. 동일 Release의11개 파일·본문을 교체하고 공개 URL에서 실제 bytes·Minisign3개·inventory·checksum·본문을 재검산.
3. 공개 파일 검증 후 기존 docs/releases/v0.1.3.notes.json, site/release.json, site/updates/v0.1.3.html의 준비된 교체 patch를 PR로 반영. 필수 검사와 exact Pages 배포 후 모든 생성 파일·다운로드 목록·feed를 HTTP read-back.
4. 실패하면 배포 진행을 중단하고 원본11개·본문·lease 기반 tag ref·위3개 데이터 파일·Pages를 복구한 뒤 원본 bytes/서명/feed를 검증한다. 삭제된 asset ID·download count는 복구되지 않는다.
5. 실제 공개 결과를 기존 docs/releases/v0.1.3.md, mydocs/working/task_m010_132_stage6.md, 최종 보고·오늘할일에 기록하고 필요한 보고 PR도 검증·병합한다. 공개 완료 후 #132와 더 이상 필요 없는 이 작업 브랜치/worktree를 정리한다. 다른 작업 브랜치는 보존한다.

문서 위치는 Stage5의 승인된 기존 docs/releases 및 mydocs 역할별 폴더를 유지한다. 같은 버전은 수동 설치이며 캐시된 feed/진행 중 다운로드의 비원자적 전환 실패 가능성을 유지한다. 강제 MSI3010 재부팅 이후와 Authenticode/SAC는 이번 수용 범위가 아니다.
