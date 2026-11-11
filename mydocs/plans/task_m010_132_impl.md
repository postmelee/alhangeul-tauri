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
