# Task #9 Stage 1 보고서 — prerelease 계약과 수용 매트릭스

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 1

## 단계 목적

Alhangeul `v0.1.0` prerelease 후보의 source, artifact, signing, checksum, native 설치 검증과 rollback 계약을 제품 변경 전에 확정한다. 현재 GitHub·Actions·repository 상태와 Tauri 공식 배포 기준을 근거로 선택지를 비교하고 Stage 2에 적용할 추천안을 제시한다.

이 단계는 tag, GitHub Release, release PR, signing secret 또는 설치 파일을 생성·게시하지 않는다. 제품 코드, workflow와 공식 문서도 수정하지 않고 승인할 정책과 No-Go 조건만 고정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_9.md` | HOP Windows/Linux bundle parity와 Windows ARM64 Issue #10 조건부 분리 반영 |
| `mydocs/plans/task_m010_9_impl.md` | baseline bundle 전체 필수 수용·No-Go와 Stage 1.1 산출 범위 보정 |
| `mydocs/working/task_m010_9_stage1.md` | 현재 release 상태, candidate bundle·signing·checksum·native 환경·rollback 수용 매트릭스와 승인 기록 |
| `mydocs/orders/20260729.md` | Stage 1.1 승인 반영과 Stage 2 진입 승인 대기 상태 기록 |

## 현재 기준선

| 항목 | 확인 결과 | Stage 1 영향 |
|---|---|---|
| Issue·milestone | Issue #9 `OPEN`, M010 `OPEN`, open 1·closed 4 | M010은 Task #9 완료 전 닫지 않는다. |
| GitHub Release·tag | Release 0건, remote tag 0건 | `v0.1.0`은 아직 외부에 고정되지 않았다. |
| branch | `main` `69b4730a…`, `devel` `a00000a5…`; main은 devel보다 42 commits 뒤 | release 승격은 후속 `devel → main` PR에서 별도 검토한다. |
| 제품 version | root, Tauri와 Cargo package가 `0.1.0` | 예정 tag와 bundle version은 `v0.1.0`이 자연스럽다. |
| upstream | `rhwp v0.8.2`, commit `9b16aa9e…` | 이번 candidate에서 pin을 바꾸지 않는다. |
| Task #7 CI | run `30383886807`, SHA `02931beb…`, success | 플랫폼 중립 기준선은 있으나 현재 task/final tag SHA가 아니다. |
| Task #7 native | run `30384403366`, 같은 SHA, success | bundle build·inventory 기준선만 제공한다. |
| signing·updater | Tauri signing 설정·workflow secret·updater surface 없음 | signed 후보는 별도 인증서·secret 준비 없이는 만들 수 없다. |
| 설치 smoke | workflow에 install, launch, file association, uninstall 단계 없음 | 기존 success를 설치 검증으로 재사용할 수 없다. |
| package 설명 | README·DEVELOPMENT는 HWPX 저장 미지원을 명시하지만 Tauri long description은 HWPX 저장을 지원하는 것으로 읽힘 | Stage 2 metadata 수정과 회귀 검사가 필수다. |

## Task #7 artifact 상태

2026-07-29 live 조회에서 세 artifact는 아직 `expired: false`지만 모두 2026-08-11 UTC에 만료된다.

| Platform | Artifact ID | Archive 크기 | 만료 시각 UTC | 용도 |
|---|---:|---:|---|---|
| Windows x64 | `8698659028` | 53,659,794 bytes | `2026-08-11T17:57:32Z` | 이전 build smoke 증적 |
| Linux x64 | `8698704612` | 354,129,430 bytes | `2026-08-11T17:58:51Z` | 이전 build smoke 증적 |
| Linux arm64 | `8698559801` | 90,030,240 bytes | `2026-08-11T17:54:09Z` | 이전 build smoke 증적 |

이 artifact는 Task #9 candidate, 최종 tag artifact 또는 공개 asset으로 재사용하지 않는다.

## signing 판단

[Tauri 공식 Windows signing 문서](https://v2.tauri.app/distribute/sign/windows/)는 code signing이 브라우저로 받은 실행 파일의 SmartScreen 신뢰 경고를 방지하는 데 필요하지만, 사용자가 경고를 감수하면 Windows 실행 자체에는 필수가 아니라고 설명한다. 현재 repository에는 certificate thumbprint, custom sign command나 signing secret이 없다.

| 선택 | 장점 | 비용·위험 | Stage 영향 |
|---|---|---|---|
| `signed-required` | 게시자 identity와 무결성, 사용자 신뢰 강화 | 인증서·secret·signing workflow가 없고 OV도 즉시 SmartScreen 평판을 보장하지 않음 | 별도 signing Issue가 끝날 때까지 Task #9 중지 |
| `unsigned-prerelease-allowed` | 현재 범위에서 candidate 검증과 첫 prerelease 진행 가능 | 다운로드 시 SmartScreen 경고와 낮은 사용자 신뢰 | 경고·SHA256SUMS·GitHub prerelease 표시를 필수 gate로 둠 |

**추천은 첫 `v0.1.0` GitHub prerelease에 한해 `unsigned-prerelease-allowed`를 선택하는 것이다.** 다음 제한을 모두 적용한다.

- Release 제목과 본문에 Windows installer가 unsigned이며 SmartScreen 경고가 예상됨을 명시한다.
- asset 전체의 `SHA256SUMS`를 같은 Release에 게시하고 사용자가 검증할 명령을 제공한다.
- stable/latest로 표시하지 않고 updater와 자동 설치 경로를 제공하지 않는다.
- 향후 stable 배포의 signing 정책은 별도 Issue에서 다시 결정한다.

Linux direct-download package도 이번 prerelease에서는 package signing을 추가하지 않고 GitHub HTTPS와 `SHA256SUMS`를 사용한다. package repository 게시나 Linux signing key 도입은 별도 Issue로 둔다.

## candidate bundle 승인

첫 prerelease의 baseline은 HOP v0.4.1이 제공하는 Windows/Linux direct-download 환경과 형식을 계승한다. Windows MSI와 NSIS는 Tauri의 공식 installer 형식이며, AppImage는 설치 없이 실행 가능한 Linux direct-download 형식이다. 관련 배포 형식은 [HOP v0.4.1](https://github.com/golbin/hop/releases/tag/v0.4.1), [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/)와 [Tauri AppImage](https://v2.tauri.app/distribute/appimage/) 문서를 기준으로 한다.

| Platform | Build 결과 | 승인된 공개 baseline | 필수 검증 |
|---|---|---|---|
| Windows x64 | MSI, NSIS | MSI·NSIS 모두 포함 | 각 installer install·launch·association·uninstall |
| Linux x64 | AppImage, DEB, RPM | AppImage·DEB·RPM 모두 포함 | AppImage 실행, Debian 계열 DEB와 RPM 계열 RPM install·launch·uninstall |
| Linux arm64 | DEB | 포함 | arm64 Debian 계열 DEB install·launch·uninstall |

현재 Linux x64 job은 Ubuntu에서 RPM을 만들지만 RPM 계열 환경에서 설치·실행하지 않는다. Ubuntu build 성공을 RPM native acceptance로 간주하지 않는다. RPM은 `SHA256SUMS`와 공개 asset allowlist에 포함하되 Stage 4 전까지 RPM 호환 native 환경을 확보해야 하며, 설치·실행·제거 증적이 없으면 Task #9를 No-Go로 판정한다.

HOP의 macOS x64·arm64 bundle은 Alhangeul의 Windows/Linux 제품 경계 밖이라 포함하지 않는다. AUR은 GitHub Release bundle이 아닌 외부 배포 채널이므로 별도 후속 범위다. [golbin/hop#80](https://github.com/golbin/hop/issues/80)의 Windows ARM64 MSI·EXE 요청은 M010 [Issue #10](https://github.com/postmelee/alhangeul-tauri/issues/10)으로 분리했다. Issue #10이 별도로 Go이면 후속 게시 Issue에서 ARM64 MSI·NSIS를 조건부로 추가하고, 실패하거나 native 검증을 완료하지 못하면 ARM64만 제외한다.

## checksum·tag·rollback 계약

| 항목 | 추천 계약 | No-Go 조건 |
|---|---|---|
| 예정 tag | `v0.1.0`, release PR merge 후 `main` exact commit에 생성 | 기존 tag 충돌, 다른 commit을 가리킴 |
| tag 불변성 | 생성 뒤 이동·덮어쓰기·재사용 금지 | 기존 tag를 수정해야만 게시 가능 |
| checksum | 공개 candidate asset만 상대 파일명 순으로 정렬한 SHA-256 `SHA256SUMS` | asset 누락, 중복, 다운로드 후 hash 불일치 |
| inventory | build·task provenance로 보존하고 공개 checksum과 구분 | inventory와 실제 bundle 불일치 |
| candidate 실패 | Actions artifact 폐기, 공식 공개 상태 불변 | 실패 candidate를 다운로드 경로로 노출 |
| 게시 후 중대 결함 | prerelease를 withdrawn/superseded로 표시하고 수정 version으로 fix-forward | `v0.1.0` tag 이동 또는 asset 덮어쓰기 |
| install rollback | uninstall·file association 정리·candidate 재설치 확인, 사용자 문서 보존 | 사용자 문서 자동 삭제 또는 잔여 실행 경로 |

Task #9은 reviewable exact SHA의 candidate까지만 검증한다. 후속 게시 Issue는 `devel → main` 승격, immutable tag exact SHA에서 새 build, checksum과 GitHub prerelease 게시를 다시 수행한다.

## native 수용 매트릭스

bundle마다 package 동작이 다르므로 install 경계는 각 format에서 검증한다. 앱 핵심 문서 시나리오는 같은 OS·architecture에서 대표 bundle 한 번 이상 수행한다.

| 환경 | bundle별 검증 | 대표 앱 시나리오 | 미충족 처리 |
|---|---|---|---|
| Windows x64 native | MSI·NSIS clean install, launch, registry association, uninstall | NSIS 또는 MSI에서 HWP/HWPX open·edit, HWP save/reopen, HWPX save block, PDF·print | Task #9 No-Go |
| Linux x64 Debian 계열 | AppImage launch, DEB install·launch·uninstall, desktop/MIME 등록 | AppImage 또는 DEB에서 같은 문서 시나리오 | x64 Linux 후보 No-Go |
| Linux arm64 Debian 계열 | DEB install·launch·uninstall, desktop/MIME 등록 | arm64에서 같은 문서 시나리오 | Task #9 No-Go |
| Linux x64 RPM 계열 | RPM install·launch·uninstall, desktop/MIME 등록 | RPM에서 같은 문서 시나리오 | Task #9 No-Go |

- hosted runner는 package-level 자동 smoke에 사용할 수 있지만 현재 workflow에는 해당 단계가 없다.
- GUI document scenario는 native desktop session에서 실제 관찰해야 한다. hosted runner만으로 충족하지 못하면 승인된 Windows/Linux 환경을 별도로 확보한다.
- 인쇄는 물리 프린터가 아니라 OS print dialog 또는 승인된 virtual printer 도달까지를 필수 경계로 추천한다.
- fixture는 비민감·재현 가능한 문서만 사용하며 개인 문서 내용을 로그나 repository에 남기지 않는다.
- 필수 native 환경이나 시나리오가 없으면 “검증 한계”로 낮추지 않고 No-Go로 둔다.

## 기능·known issue 분류

| 항목 | prerelease 처리 | Go 조건 |
|---|---|---|
| HWPX 저장 미지원 | 알려진 제한, 기능 구현은 별도 Issue | package·README·release notes가 HWP 저장만 지원한다고 일치 |
| autosave/recovery 미지원 | 알려진 제한 | release notes 명시 |
| 외부 파일 변경 감지 미지원 | 알려진 제한 | release notes 명시 |
| `print-pdf-issue3126` | upstream known issue 후보 | pinned source의 동일 조건·실패 지점 확인 |
| `issue-2214` | upstream known issue 후보 | pinned source의 동일 조건·실패 지점 확인 |
| Alhangeul adapter 또는 다른 실패 | release blocker | 원인 해결·재검증 전 No-Go |

## 추천 정책과 작업지시자 선택

| 결정 항목 | 추천안 | 상태 |
|---|---|---|
| 공개 등급 | GitHub `prerelease`, stable/latest 아님 | 승인 — 2026-07-29 |
| version·예정 tag | `0.1.0` / immutable `v0.1.0` | 승인 — 2026-07-29 |
| Windows signing | 첫 prerelease만 `unsigned-prerelease-allowed` | 승인 — 2026-07-29 |
| Linux signing | direct-download unsigned + `SHA256SUMS` | 승인 — 2026-07-29 |
| 공개 baseline bundle | Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB | 승인 — 2026-07-29 |
| Windows ARM64 | Issue #10 별도 Go이면 후속 게시에서 MSI·NSIS 조건부 포함 | 승인 — 2026-07-29 |
| checksum | 공개 asset 전체의 `SHA256SUMS` | 승인 — 2026-07-29 |
| print | OS dialog 또는 virtual printer 도달 | 승인 — 2026-07-29 |
| rollback | tag 불변, withdraw/supersede 또는 fix-forward | 승인 — 2026-07-29 |
| native gate | baseline bundle별 install smoke + OS/arch별 대표 문서 시나리오 | 승인 — 2026-07-29 |

## 본문 변경 정도 / 본문 무손실 여부

- Stage 1.1에서 수행계획서·구현계획서·Stage 1 결정표와 오늘할일 비고를 승인된 bundle 정책에 맞춰 보정했다.
- 제품 코드, Tauri config, package, workflow와 공식 문서는 수정하지 않았다.
- Task #5·#7의 run, artifact, inventory와 checksum 기록은 읽기만 했고 다시 쓰지 않았다.

## 검증 결과

실행 명령:

```bash
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
gh run view 30383886807 --repo postmelee/alhangeul-tauri --json headSha,status,conclusion,url
gh run view 30384403366 --repo postmelee/alhangeul-tauri --json headSha,status,conclusion,url
gh release view --repo golbin/hop --json tagName,assets,url
gh issue view 10 --repo postmelee/alhangeul-tauri --json number,title,state,milestone,labels,url
git rev-list --left-right --count origin/main...origin/devel
rg -n 'HWPX|sign|checksum|rollback|GitHub Release|updater|known issue' README.md apps/desktop/src-tauri/tauri.conf.json docs
git diff --check
```

결과:

- OK — GitHub Release와 remote tag는 모두 0건이다.
- OK — CI·native run은 exact SHA `02931beb…`에서 success다.
- OK — `origin/main...origin/devel`은 `0 42`이며 release PR이 아직 필요하다.
- OK — Task #7 artifact 3개는 미만료지만 임시 build smoke다.
- OK — signing·updater·install smoke 구현이 없고 workflow는 `contents: read`다.
- OK — HWPX 저장 기능 설명이 Tauri long description과 공식 문서에서 어긋남을 확인했다.
- OK — HOP v0.4.1의 Windows/Linux direct-download asset이 승인된 baseline bundle과 일치한다.
- OK — Windows ARM64 조건부 확장 Issue #10이 M010·`enhancement`·`OPEN`으로 등록됐다.
- OK — Stage 1 product·official document diff는 없고 `git diff --check`가 통과했다.

## 잔여 위험

- Windows/Linux native GUI session의 실제 가용성은 아직 확인되지 않았다. Stage 4 전까지 확보되지 않으면 해당 지원 범위는 No-Go다.
- unsigned Windows prerelease는 SmartScreen 경고로 사용자 신뢰와 설치 성공률이 낮아질 수 있다.
- RPM 호환 native 환경이 아직 확보되지 않았다. Stage 4 전까지 확보하지 못하면 Task #9는 No-Go다.
- Linux arm64 GUI 시나리오를 hosted arm64 runner에서 자동화할 수 있는지는 Stage 2 보정 전에 확인해야 한다.
- GitHub의 Windows ARM64 runner는 public preview이며 Issue #10의 build 성공만으로 실제 사용자 환경 지원을 선언할 수 없다.
- GitHub Release와 같은 위치의 checksum은 독립적인 publisher identity를 제공하지 않는다. signing을 대체한다고 표현하지 않는다.

## 다음 단계 영향

- Stage 2 metadata/checksum 자동화는 RPM을 포함한 승인된 공개 baseline allowlist와 unsigned 경고 계약을 기준으로 구현한다.
- hosted runner install helper가 필요하면 구현계획서를 먼저 보정하고 승인받는다.
- Issue #10은 아직 task-start하지 않으며 Task #9 구현 브랜치와 섞지 않는다. 후속 게시 Issue가 별도 Go 결과만 소비한다.

## 승인 요청

- 2026-07-29 작업지시자가 수정 추천안으로 진행을 승인했다.
- Stage 1.1 commit으로 정책을 보존한 뒤 Stage 2 진입 승인을 별도로 요청한다.
