# Task #9 최종 보고서 — v0.1.0 릴리즈 준비와 후속 게시 인계

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
마일스톤: M010

## 작업 요약

- 대상 이슈: #9 — v0.1.0 첫 공개 준비 재정렬과 게시 진입 Go/No-Go.
- 단계 수: 기본 Stage 1~5 및 하위 단계. 보존된 단계 보고서 10개 중 현재 준비 판정은 Stage 4.8·4.9·5에 근거한다.
- 목적: 첫 공개에 필요한 코드·검사·운영 절차를 devel에 반영하고 최종 파일 생성·검증·공개를 후속 릴리즈 작업으로 인계한다.
- 결과: #9 준비 변경의 devel PR 진입 Go. 실제 v0.1.0 공개는 #19 수정과 최종 파일 수용·공개 승인까지 No-Go다.

사용자가 Stage 5 이후 #9 병합 → #19 수정 → 별도 릴리즈 작업의 이유를 확인하고
“진행해줘”로 최종 보고·PR 진행을 지시했다. 이 보고서는 그 승인 범위에서 작성했다.

## 변경 파일 목록과 영향 범위

비교 기준은 devel `46e3b010398ee391db0ed59b510f49421e2dd13c`다. PR은 최신 devel을
병합한 `e9eb6cc` 이력을 보존하며 과거 자체 Studio UI나 폐기 후보를 되살리지 않는다.

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/desktop/src-tauri/linux/main.desktop`, `tauri.conf.json` | DEB/RPM 공통 desktop template와 `Exec={{exec}} %F` 유지 | Linux launcher의 문서 파일 인자 전달; AppImage 내부 launcher도 최종 파일에서 확인 |
| `scripts/check-release-metadata.mjs`, `tests/release-metadata.test.mjs`, `tests/linux-desktop-entry.test.mjs` | 최신 updater 신뢰 설정을 유지하며 template 경로·일반 파일·Exec·MIME 계약 검사 | metadata drift와 파일 연결 누락 방지 |
| `scripts/create-release-checksums.mjs`, `tests/release-checksums.test.mjs` | installer의 결정적 SHA256SUMS, 중복·빈 파일·비지원 입력 거부 | installer 전용 도구; 전체 공개 signature/inventory checksum은 runbook 명시 목록 사용 |
| `package.json`, `tests/actions-workflows.test.mjs` | checksum 명령·관련 테스트 등록과 workflow 계약 설명 정렬 | 기존 automation 대상과 workflow 파일 보존 |
| `tests/pages.test.mjs`, `tests/fixtures/pages-release-fixtures.mjs` | 실제 source와 고정 unreleased/published 두 상태 분리 | 공개 전환 후에도 미공개 안전장치와 manifest 회귀 검사 유지 |
| `scripts/check-product-boundary.mjs`, `tests/product-boundary.test.mjs` | 두 정확한 문서 참조·등록된 중첩 worktree만 제외 | 일반 소스·다른 문맥·가짜 marker·native 경계 위반은 계속 거부 |
| `docs/DEVELOPMENT.md` | checksum 도구 사용과 산출물 경계 설명 | 기여자용 도구 안내 |
| `docs/operations/DESKTOP_RELEASE.md`, `PUBLIC_RELEASE_RUNBOOK.md`, `RELEASE_CHECKLIST.md` | 6종 installer·3종 updater·11개 asset, 동일 파일 게시·read-back·단계별 승인 | 반복 가능한 릴리즈 절차 |
| `docs/releases/v0.1.0.md` | 위험 결정·최소 검증·준비 Go·실제 공개 No-Go와 인계 | 첫 공개의 공식 준비 기록 |
| `mydocs/plans/task_m010_9*.md`, `mydocs/working/task_m010_9_stage*.md`, 오늘할일·본 보고서 | 계획·단계·승인·과거 증거 보존 | 내부 작업 이력 |

최종 문서 검토에서 “모든 파일 수용 전 빌드 금지”로 읽히던 문장을 source·비게시 빌드 승인과
실제 공개 승인 순서로 바로잡았다. #19의 과거 선택형 문구도 확정된 첫 공개 전 수정 결정에 맞췄다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 운영 정책·runbook·체크리스트 | `docs/operations/` | 동일 | OK | 수행계획의 문서 위치 판단 |
| 버전 기록 | `docs/releases/v0.1.0.md` | 동일 | OK | 현재 준비값·미실행 공개 gate의 진실 원천 |
| 도구 설명 | `docs/DEVELOPMENT.md` | 동일 | OK | 기존 기여자 문서 수정 |
| 계획·단계·최종 보고 | `mydocs/plans/`, `working/`, `report/` | 동일 | OK | 중앙 템플릿 준수 |
| 공개 데이터 | `site/release.json` | 변경 없음 | OK | unreleased 유지, 후속 공개 데이터 PR 책임 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Pages 통합 테스트 본문 | Stage 4.9 직전 413행 | 364행 + fixture 책임 127행 분리 |
| 고정 release 상태의 source→build→output 검사 | 실제 source 상태에 의존하는 fixture 포함 | unreleased, published/manifest false, published/manifest true 3종 독립 |
| product-boundary 알려진 오탐 | 문서 2건·중첩 worktree 128건 | 0건, 402개 파일 검사 통과 |
| 현재 공개 installer·Release | 없음 | 없음 |
| 후속 게시 asset 계약 | updater 전용 게시 경로는 7개 | installer 6 + signature 3 + inventory 1 + SHA256SUMS 1 = 11개 명시 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 계약·게시 경로·위험의 owner 결정 | OK — Stage 4.8: stable 0.1.0·rhwp v0.8.4, Windows 미서명 안내, #19 선행, CLI 게시·#28 후속 |
| 검증할 파일과 게시할 파일의 동일성 | OK — runbook의 두 비게시 run·원본 archive·명시 파일·draft/public read-back 절차 확정; 실제 실행은 후속 |
| 세 Pages 상태·invalid 조합 | OK — Stage 4.9 집중 테스트 95/95에 포함, source 무변경·manifest 내용 일치·잘못된 조합 거부 |
| 제품 경계 안전장치 | OK — 두 정확한 참조와 상호 Git metadata만 허용, 일반 소스·가짜 marker·기존 native 경계 음성 검사 통과 |
| 기존 검증 재사용 경계 | OK — `12190e0` 이후 apps/crates/pin/lock/workflow/site 불변; 이후 Stage는 문서 수정만 |
| Linux launcher 영향 인계 | OK — 최종 DEB/RPM·AppImage의 Exec와 실제 argv·열린 문서 일치, arm64 환경 별도 확인 명시 |
| 준비와 공개 판정 | OK — Stage 5: 준비 Go, 실제 공개 No-Go와 #19·후보·파일·승인 재개 조건 기록 |
| 이력 보존·원격 게시 가능성 | OK — 원격 publish/task9 `8b4ae60…`이 local/task9의 조상, devel은 통합 기준과 동일 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_9_stage1.md): 최초 prerelease 계약. 이후 stable/updater 포함 결정으로 대체된 역사 기록.
- [Stage 2](../working/task_m010_9_stage2.md): metadata·checksum 검사 도입. 최신 updater/HWPX 계약과 통합해 유지.
- [Stage 3](../working/task_m010_9_stage3.md): 당시 exact source의 candidate·Task #11 설치 계약 검증. 현재 공개 파일 근거로 재사용하지 않음.
- [Stage 4](../working/task_m010_9_stage4.md): Linux 파일 인자·과거 UI·pin 확보 보정 및 폐기 후보의 native 증거 보존.
- [Stage 4.5](../working/task_m010_9_stage4_5.md): 당시 devel 통합과 upstream-first Studio 경계 유지.
- [Stage 4.6](../working/task_m010_9_stage4_6.md): 당시 후보 `8b4ae60…` CI·native 검증. 현재 공개 후보와 분리.
- [Stage 4.7](../working/task_m010_9_stage4_7.md): 후속 upstream·썸네일·Pages·updater 작업 분리.
- [Stage 4.8](../working/task_m010_9_stage4_8.md): 최신 devel 통합 후 계약·owner 결정·동일 bytes CLI 게시 절차 확정.
- [Stage 4.9](../working/task_m010_9_stage4_9.md): 95/95 집중 테스트, Pages source 11/output 13, 제품 경계 402개, version·metadata·pin 검사 통과.
- [Stage 5](../working/task_m010_9_stage5.md): Release/tag 부재·#19 OPEN 재조회, 준비 Go/실제 공개 No-Go 판정.

최종 보고 단계에서 Stage 5의 diff·이력·Release/tag 확인을 통과했다. 문서 상대 링크 48개,
버전 기록의 역사 표·고정 원문 링크 무손실과 unreleased 유지도 확인했다.
변경 없는 Stage 4.9 테스트를 반복하지 않는다. 현재 PR의 native/GUI 실행, signing·Release·Pages
게시는 수행하지 않았으며 과거 CI 성공을 현재 PR head의 CI 결과로 표시하지 않는다.

## 잔여 위험과 후속 작업

### 잔여 위험

- #19 PDF revision 혼합·stale job 회수가 첫 공개 전 필수 수정이다. 이 PR은 #19를 구현하거나 닫지 않는다.
- 새 Linux package의 launcher·실제 설치/문서 기능은 후속 파일 수용에서 확인해야 한다.
  RPM은 Fedora x64, arm64 DEB는 해당 architecture GUI 검증이 필요하다.
- Windows Authenticode 미서명과 자동 branch 보호 부재는 남아 있다. updater Minisign 검증,
  경고 안내와 owner의 source·파일·CLI 공개 승인을 각각 유지한다.
- 실제 최종 main SHA, 원본 run·11개 파일·서명·hash·설치 수용은 아직 없다.
- 첫 공개에는 production N→N+1 성공을 주장하지 않는다. 첫 설치본 보존 후 다음 실제 공개에서 확인한다.

### 후속 작업 후보

1. 이 PR 검토·devel 병합과 merge cleanup.
2. 기존 [#19](https://github.com/postmelee/alhangeul-tauri/issues/19) 수행계획·수정·수용·병합.
3. 아래 별도 릴리즈 Issue 생성 및 실행 승인. 이슈는 #19 완료 전에 등록할 수도 있지만 실제 공개에는 #19 완료가 필요하다.
4. [#28](https://github.com/postmelee/alhangeul-tauri/issues/28)은 승인된 후속 보호 정책 작업으로 유지.

### 후속 릴리즈 Issue 초안 — 생성·실행 전 승인 대상

제목: `v0.1.0 stable 최종 후보 수용과 첫 공개`

- 목표: #9 준비 계약과 #19 수정이 반영된 main의 exact SHA에서 최종 파일을 확보하고, 검증한 동일 bytes를 공개한다.
- 선행: #9 devel 병합, #19 수용·병합, 별도 devel→main release PR과 최종 version/tag/source 승인.
- 입력: 같은 SHA의 비게시 updater run 1개와 지정 일반 package run 1개, 원본 archive ID/digest,
  installer 6개·signature 3개·complete inventory·SHA256SUMS, 설치 환경·공개 문서 fixture.
- 검증: MSI/NSIS 격리 설치, writable AppImage, x64 DEB/RPM·arm64 DEB의 실제 환경 설치/문서,
  Linux launcher 인자, #19 PDF 회귀·암호 저장 보호, hash·Minisign·inventory 일치.
- 게시: 파일 수용 후 owner 공개 승인 → exact tag·draft 11개 asset → 원격 bytes read-back → stable 공개·재조회.
- Pages: Release 공개 확인 뒤 release data PR과 별도 Pages/manifest 승인·read-back.
- 완료: 공개 identity·run·파일 hash·환경·한계를 버전 기록에 채우고 MSI/NSIS·AppImage 기준선을 보존.
- 제외: 자동 upstream 갱신, #28 구현, 전체 negative 시험 반복, 첫 공개에서 실제 N→N+1 성공 주장.
- 다음 공개: 별도 rhwp 갱신 Task·다음 version 승인·릴리즈 후 세 형식 production N→N+1 확인.

## 작업지시자 승인 요청

최종 보고·PR 게시는 이번 “진행해줘” 지시에 따라 수행한다. 이 보고서와 devel 대상 PR을
검토한 뒤 merge를 승인해 주기 바란다. 실제 릴리즈 Issue 생성·main 승격·게시 실행은 각각 후속 범위다.
