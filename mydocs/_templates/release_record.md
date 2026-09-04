# 제품 릴리즈 기록 템플릿

## 사용 위치와 시점

- 실제 파일: `docs/releases/v<version>.md`, 승인한 앱 tag와 동일한 version을 사용한다.
- 작성 시점: 릴리즈 준비 시작 시 생성하고 gate 실행·승인·실패·공개 read-back 직후 갱신한다.
- 작성 언어: 한국어(`ko`). 사용자용 요약은 사용자 용어로, 기술 근거는 별도 섹션으로 작성한다.
- 반복 정책은 `docs/operations/DESKTOP_RELEASE.md`, Task 결과는 `mydocs/working/`·`report/`에 둔다.
- 본 템플릿의 설명·placeholder를 실제 실행 성공으로 복사하지 않는다. 미확정은 `미확정`,
  미실행은 이유와 다음 담당자를 쓰며 첫 공개의 이전 version은 `없음`으로 적는다.

## 필수·선택 섹션

| 섹션 | 준비 시 필수 내용 | 공개 후 필수 내용 |
|---|---|---|
| 식별자와 공개 상태 | 목표·이전 버전·후보/미확정·채널·upstream·owner | resolved tag/source·실제 공개 일시·URL·상태 |
| 사용자 요약·포함 PR | 승인된 분석 범위·분류·해결/참고 Issue 분리 | 실제 공개 노트와 일치하는 최종 요약 |
| 변경 영향·검증 선택 | 기본 gate와 추가 gate, 재사용 이유·미실행 범위 | 실제 결과·환경·정확한 근거 |
| 산출물 provenance | 생성할 target·서명·checksum 정책 | run/SHA·archive ID/digest·파일 hash·서명·inventory |
| 공개 gate·승인 | 단계별 상태·승인 필요값 | 실제 승인·게시·read-back·실패 재개 기록 |
| 설치본·업데이트 | 첫 설치/이전 설치본 계획, N→N+1 해당 여부 | 형식별 실행·재실행·version 또는 미실행 사유 |
| 한계·복구·인계 | 미해결 위험·판단 주체·다음 단계 | 영향·복구 결과·후속 Issue와 다음 버전 연결 |

선택: 과거 근거 이전표, 변경 경로 상세, screenshot·PDF 판독 링크, 실패 타임라인.
선택 항목도 공개 판단에 영향을 주면 이유와 근거를 필수로 기록한다.
하위 본문은 실제 기록의 시작 형식이다. 길어지면 이미 존재하는 Task 보고서·고정 commit 원문을
링크하고, 승인되지 않은 새 문서 경로로 임의 분할하지 않는다.

## 본문 형식

### 식별자와 공개 상태

| 항목 | 값 |
|---|---|
| 상태 / 확인 시각 | 준비 중 / `{YYYY-MM-DD HH:mm timezone}` |
| release owner / 실행 Task | `{승인자}` / `{Issue URL}` |
| version / tag / 채널 | `{version}` / `{tag}` / `{승인값 또는 미확정}` |
| 이전 공개 version·tag·resolved commit | `{값; 첫 공개는 없음}` |
| 변경 분석 시작 기준 / candidate | `{승인 ref·40자리 SHA 또는 미확정}` |
| release PR / tag resolved source SHA | `{실제 값 또는 미확정}` |
| rhwp Stable tag / resolved commit | `{정확한 두 값}` |
| core·WASM·Studio 출처 | `{lock·gitlink·관리 artifact 근거}` |
| 최신 upstream과 다른 pin 유지 판단 | `{동일 / 승인된 유지 이유 / 미확정}` |
| GitHub Release / 공개 시각 | `{실제 URL·UTC 시각 또는 미게시}` |
| Pages source SHA / deploy run | `{앱 source와 구분; 미실행 가능}` |
| manifest / 실제 N → N+1 상태 | `{게시·read-back·실제 upgrade를 분리}` |

### 사용자 요약과 포함 PR 분석

- `{사용자에게 보이는 변화, 앱 변화와 upstream 변화 구분}`
- `{알려진 한계·지원 환경; 아직 공개 안 됐다면 초안 표시}`

분석 범위: `{previous..candidate; 첫 공개면 별도 승인한 시작 기준}`.

| PR·제목 | 분류 | 사용자-facing·공개 요약 반영 | 해결된 Issue | 참고 Issue | 근거·판단 |
|---|---|---|---|---|---|
| `{PR URL·제목}` | `{앱/upstream/운영/문서}` | `{예/아니오·이유}` | `{확정된 것만}` | `{관련만}` | `{보고서·diff}` |

release transport PR만 보고 포함 작업을 누락하지 않는다. #번호의 단순 언급은 해결 증거가 아니다.
운영 문서·버전 번호 변경을 앱의 주요 신규 기능으로 설명하지 않는다.

### 변경 영향과 검증 선택

| 영역 | 변경 여부·근거 | 필요한 gate | 실행/재사용/미실행 판단 |
|---|---|---|---|
| identity·공개 파일 | `{diff·후보}` | `{기본 확인}` | `{새 bytes 검증은 재사용 불가}` |
| upstream·Studio·저장·PDF·인쇄 | `{diff}` | `{영향 범위}` | `{이전 SHA·환경·재사용 이유}` |
| Windows installer·thumbnail | `{diff}` | `{설치·등록·bitmap 등}` | `{동일}` |
| Linux package·MIME·thumbnail | `{diff}` | `{해당 target·file manager}` | `{동일}` |
| updater·key·manifest | `{diff}` | `{target·서명·전환·필요 negative}` | `{동일}` |
| Pages·문서-only | `{diff}` | `{링크·데이터·배포 read-back}` | `{native 재실행 필요 여부}` |

### 산출물 provenance

| 대상·파일 | source/workflow SHA·run | archive ID·digest·만료 | 실제 bytes·SHA-256 | 서명·inventory 근거 | 공개 exact URL |
|---|---|---|---|---|---|
| Windows x64 NSIS | `{값}` | `{값}` | `{값}` | `{Minisign/Authenticode 별도}` | `{미게시 또는 URL}` |
| Windows x64 MSI | `{값}` | `{값}` | `{값}` | `{동일}` | `{동일}` |
| Linux x64 AppImage | `{값}` | `{값}` | `{값}` | `{Minisign}` | `{동일}` |
| 승인된 수동 package | `{DEB/RPM·architecture별 행}` | `{값}` | `{값}` | `{별도 게시 근거}` | `{동일}` |

공개키 fingerprint: `{공개값}`. complete inventory: `{위치·hash·검증 결과}`.
예비 artifact·실제 게시 artifact를 구분한다. 새 run의 파일에 이전 run의 hash·서명을 붙이지 않는다.
Actions archive hash는 내부 installer hash와 다른 값이며 signature 존재만으로 검증 성공이 아니다.

### 공개 gate 결과와 승인

| Gate | 상태 | 결과·환경·근거 | 승인자·시점·승인값 | 실패 시 재개 위치 |
|---|---|---|---|---|
| identity·범위·위험 | 대기 | `{값}` | `{값}` | `{값}` |
| source 영향 검증 | 미실행 | `{명령·결과 또는 재사용 근거}` | `{값}` | `{값}` |
| 게시 파일의 서명·설치 | 미실행 | `{동일 bytes 근거}` | `{값}` | `{값}` |
| Release 게시·read-back | 미실행 | `{실제 asset 대조}` | `{값}` | `{값}` |
| release data PR·Pages | 미실행 | `{devel SHA·deploy URL}` | `{값}` | `{값}` |
| production manifest | 미실행 | `{version·target·URL·signature·hash}` | `{값}` | `{값}` |
| 공개 기록·인계 | 대기 | `{이 문서·후속 연결}` | `{값}` | `{값}` |

상태는 `대기/미실행/통과/실패/재사용/해당 없음`을 구분하고 사유를 적는다.
필수 gate의 실패·미확정은 공개 중단이다. 위험 수용은 기술 검증 통과로 바꾸지 않는다.
일반 Task merge와 환경 승인, 실제 공개 승인을 혼동하지 않는다.

### 설치본과 실제 업데이트

| 형식 | 이전 설치본·version·hash | 새 공개 version | 설치·재실행·버전 확인 | 미실행/제약·근거 |
|---|---|---|---|---|
| Windows NSIS | `{격리 기준선}` | `{값}` | `{실제 결과}` | `{값}` |
| Windows MSI | `{별도 격리 기준선}` | `{값}` | `{실제 결과}` | `{값}` |
| Linux x64 AppImage | `{실행 경로·실효 쓰기 자격; 개인 경로 제외}` | `{값}` | `{실제 결과}` | `{값}` |

첫 공개의 이전 설치본은 `없음`이다. 같은 버전의 '업데이트 없음'과 실제 N→N+1을 분리하고
첫 공개 설치본의 보존·다음 버전 검증으로 연결한다. 시험 endpoint의 성공을 production 결과로
기록하지 않는다. manual package는 updater 성공 대신 설치·제거와 안내 경로를 적는다.

### 알려진 한계와 실패·복구

- `{결함·환경 한계·재현 조건·영향·수정/위험 수용 승인·추적 Issue}`
- `{실패 단계·변경된 원인·기존 공개 표면 보존·승인된 재개 또는 복구}`
- `{미실행 Windows/Linux GUI·배포판·physical printer 등을 명시}`

stable tag 이동·asset 교체·history rewrite·무단 key rotation을 복구 절차로 가정하지 않는다.
이전 feed 복구와 이미 새 버전인 앱의 downgrade도 구분한다.

### 다음 단계 인계

- `{담당 Task·승인 필요값·남은 필수 검증·중단 지점}`
- `{다음 version 기록·실제 updater 확인에 필요한 이전 설치본}`

## 기록 검증·승인 기준

- 필수 항목은 실제 값 또는 미확정/미실행 이유가 있으며 공개된 것처럼 미리 채우지 않는다.
- candidate와 previous, updater 서명과 Authenticode, 파일 hash와 archive digest를 구분한다.
- local 링크·고정 commit·run·공개 URL이 해당 근거와 일치하며 미검증 환경을 숨기지 않는다.
- private key·암호·token·개인 문서·실제 credential 보관 경로는 포함하지 않는다.
- 실제 Release·Pages·manifest 상태를 확인한 뒤 인덱스를 갱신한다. 전체 공개 완료와 후속
  production 업그레이드 미실행 여부를 별개로 표시한다.
- 300 LOC 이내를 목표로 하고 긴 근거는 원본을 연결한다. 경로·구조 확장은 먼저 승인받는다.
