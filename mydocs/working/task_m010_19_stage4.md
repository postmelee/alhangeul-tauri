# Task #19 Stage 4 진행 보고서 — 원격 자동 검증 통과·실제 수용 대기

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)
Stage: 4 (미완료)

## 단계 목적

Stage 4.4 통합 후보 `69b22650df96323a2c59e473d474ed3195cc9cc7`의
Windows/Linux native·package·PDF 회귀를 검증한다. 본 문서는 성공한 자동 검증과
아직 확보하지 못한 실제 실행 수용을 구분하며 최종 완료보고서가 아니다.

## 산출물

| 항목 | 결과 |
|---|---|
| [artifact run 34021920074](https://github.com/postmelee/alhangeul-tauri/actions/runs/34021920074) | Windows x64·Linux x64·arm64 build와 Windows installer smoke 성공 |
| [Linux GUI run 34024320576](https://github.com/postmelee/alhangeul-tauri/actions/runs/34024320576) | 같은 source와 native artifact를 사용하는 GUI 성공 |
| Windows installer smoke | MSI·NSIS 각각 passed, failures 빈 배열 |
| Linux GUI | HWP·HWPX, native save, drag-in, direct PDF, system print 6개 scenario 성공 |
| 문서 | 구현계획·오늘할일·본 진행 보고서만 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

후보 게시 이후 제품·workflow 소스 변경은 없다. 기존 단계 보고서를 대체하지 않는다.
원격 `publish/task19`에는 non-force push로 후보를 게시했고 PR·release·tag·Pages 게시는 하지 않았다.

## 검증 결과

정상 dispatch:

```bash
gh workflow run alhangeul-desktop.yml --ref publish/task19 \
  -f mode=artifact -f build_ref=69b22650df96323a2c59e473d474ed3195cc9cc7 \
  -f run_tests=true -f publish_release=false
gh workflow run alhangeul-linux-gui.yml --ref publish/task19 \
  -f build_ref=69b22650df96323a2c59e473d474ed3195cc9cc7 -f native_run_id=34021920074
```

- 최초 run [34021826744](https://github.com/postmelee/alhangeul-tauri/actions/runs/34021826744)는
  에이전트가 build_ref에 짧은 SHA를 넣어 checkout이 브랜치/tag ref로 해석한 입력 오류다.
  제품 검증 이전 실패이며 제품 성공/실패 증거로 사용하지 않는다. 전체 SHA로만 재dispatch했다.
- 별도 Ubuntu CI는 실행하지 않았다. desktop workflow의 Windows/Linux native
  test·Clippy와 자동화·upstream·Studio 검사가 같은 후보에서 성공했다.
- Windows desktop Rust는 97개 및 별도 21개 테스트 통과. 로그에서 snapshot mismatch,
  page order/count/bytes, same-owner recovery, idle/absolute TTL, window cleanup,
  safe/unsafe orphan·reaper 테스트 실행과 성공을 확인했다.
- Linux arm64 desktop Rust는 120개 및 별도 21개 통과; Linux x64 native gate도 성공했다.
- Linux GUI context의 acceptanceRef/buildRef/checked-out SHA와 nativeRunId가 모두 일치했다.
  phase outcomes는 nativePrint=0, webdriver=0이다.
- Linux x64 artifact ID `9986288884`, digest
  `sha256:af6c78143a0095ffda0361b410089b3ea7d0295538f89b0982259796de41efdd`가
  GitHub API와 GUI handoff evidence에서 일치했다.
- GUI evidence artifact ID `9986647016`, digest
  `sha256:ec4bb61b68be31249f8a327273ed7a61421b89455d403631492f190d6cbbcd52`.
  다운로드된 6개 scenario의 결과 파일 42개를 size/SHA-256으로 재검증했다.
- direct PDF는 A4 6쪽, titleFound=true, 쪽별 text count
  `45/642/410/638/478/250`. 6개 페이지 PNG를 직접 확인해 한글·표·쪽 번호가 표시되고
  빈 렌더가 아님을 확인했다. 원본 편집 화면과의 pixel 동일성 판정은 하지 않았다.
- GTK/CUPS PDF 분석도 각각 6쪽·titleFound=true. system print 성공을
  #19 snapshot 편집 중 일관성 검증으로 대체하지 않는다.
- PDF SHA-256: `ee79669beb032b6d20e25e865a89eba7320612b05137e010a3898f5094d07ee5`.

## 잔여 위험

- Windows installer smoke는 설치/제거 검증이지 HWP/HWPX 직접 PDF 출력의 실제 앱 수용이 아니다.
- 양 플랫폼에서 실제 편집 중 snapshot 내보내기, reload/재시작 후 회수, source 상태,
  기존 target 보존의 #19 전용 실행 증거가 남았다. unit test와 일반 Linux GUI 성공으로
  이를 모두 실행했다고 기록하지 않는다.
- 로컬 Mac에는 Windows VM 도구/연결 설정을 찾지 못했다. 작업지시자에게 사용 가능한
  Windows PC/VDI와 접속 또는 직접 테스트 가능 여부를 질문했으며 아직 확인되지 않았다.
- Windows symlink/reparse 보존은 Unix 전용 symlink test의 통과와 구분해야 한다.
- Actions artifact는 보존 기한이 있으므로 실제 수용 시 만료·SHA·digest를 다시 확인한다.

## 다음 단계 영향

- 같은 후보의 Windows 실행 환경을 확인하고 실제 PDF 수용 증거를 확보한다.
- Linux #19 전용 실제 동작 검증도 기존 일반 GUI coverage와 차이를 유지해 보완한다.
  신규 자동화가 필요하면 범위·구현계획을 먼저 승인받으며 성공한 빌드를 무작정 반복하지 않는다.
- Stage 4 전체 완료 전 최종 보고·PR·Issue close와 릴리즈로 넘어가지 않는다.

## 승인 요청

- Windows 실제 수용에 사용할 환경/접근 방법 또는 사용자 직접 테스트 가능 여부 확인.
- 자동 검증 결과는 수용 근거로 보존하되 #19 전체는 진행중으로 유지한다.
