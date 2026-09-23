# Task #24 Stage 5 보고서 — Linux 수용과 v0.8.4 운영 증적 확정

GitHub Issue: [#24](https://github.com/postmelee/alhangeul-tauri/issues/24)
구현계획서: [`task_m010_24_impl.md`](../plans/task_m010_24_impl.md)
Stage: 5

## 단계 목적

Stage 3 exact SHA `88baa5666ec55bf043844bae01ec4d422278851c`의 Linux x64
artifact를 emulation이 아닌 native `x86_64` Ubuntu에서 실행해 HWP/HWPX 저장,
searchable PDF와 system print 수용을 확정한다. 같은 release의 Windows/Linux 결과와
Linux arm64 한계를 공식 upstream·release 운영 문서에 고정한다.

## 산출물

| 파일·증거 | 변경·결과 요약 |
|---|---|
| `mydocs/plans/task_m010_24_impl.md` | 작업지시자가 승인한 분리 worktree + GitHub Codespaces native x64 수용 경계, Task #34·#35 자동화와의 분리, 수용 후 Codespace 삭제 원칙을 기록했다. |
| `docs/architecture/UPSTREAM.md` | `v0.8.4` pin의 exact native 수용 SHA, Windows/Linux GUI 범위와 Linux arm64 build-only 한계를 추가했다. v0.8.2 known issue 분류는 재현 근거 없이 바꾸지 않았다. |
| `docs/operations/DESKTOP_RELEASE.md` | Task #24 CI/native run, artifact ID·archive/inventory checksum, Windows/Linux GUI 결과, 환경 제약과 배포 제외 경계를 기록했다. |
| Linux x64 native GUI 수용 | Stage 3 DEB를 Ubuntu 24.04 `amd64` Codespace에 설치해 파일 선택·drag-in·저장·재열기·PDF·CUPS system print를 완료했다. |
| 일회성 Codespace 정리 | 수용 증적과 환경 정보를 보존한 뒤 `task24-linux-x64-p975w9qqgqxcr6gv`를 삭제했다. 제품 source, workflow와 harness는 추가하지 않았다. |

### Linux 수용 환경

| 항목 | 값 |
|---|---|
| 실행 환경 | GitHub Codespaces native `amd64`, 2 cores / 8 GB, Ubuntu 24.04 |
| Kernel | `6.8.0-1052-azure` |
| WebKitGTK | `2.52.3-0ubuntu0.24.04.1` |
| GTK | `3.24.41-4ubuntu1.3` |
| 인쇄 | CUPS `2.4.7-1.2ubuntu7.14`, CUPS-PDF `3.0.1-14ubuntu0.24.04.1` |
| 실행 package | DEB `Alhangeul_0.1.0_amd64.deb`, SHA-256 `7cb4036fd6886752fdc7fba09766cd8abd4f8677d29c23a6c204e90edbc1cc7b` |
| 검증 source | `88baa5666ec55bf043844bae01ec4d422278851c` |

Codespaces는 GPU 없는 headless X11 환경이라 WebKitGTK 기본 compositing에서 GTK file
chooser 전환 뒤 화면이 검게 남았다. 같은 설치 binary를 software WebKit compositing과
software GL로 재실행해 필수 시나리오를 모두 관찰했다. 앱 log에는 panic, fatal,
segmentation fault 또는 uncaught error가 없었다. 이 환경 보정은 일회성 실행 설정이며
저장소 source나 공식 자동화 gate에 포함하지 않았다.

### 대표 문서와 출력 결과

| 항목 | 결과 |
|---|---|
| HWP 파일 선택 | `biz_plan.hwp` 6쪽이 중앙 정렬되고 한글 toolbar·로컬 글꼴 감지 dialog가 정상 표시됐다. 원본 글꼴 1개가 없어 앱의 `대체 글꼴로 보기` 경로를 사용했다. |
| HWPX drag-in | PCManFM에서 `expense_report.hwpx`를 drag-in해 1쪽 한글 본문과 표를 확인했다. |
| 저장·재열기 | HWP/HWPX 각각 다른 이름 저장, `Ctrl+S`, 재열기 성공. 원본 SHA-256은 `8b786d68...13c1`, `1f3d2a32...9406`으로 유지됐다. |
| 직접 PDF | A4 6쪽, 287,282 B, SHA-256 `488c3ee2c4423bed97a3403a799e79413f84784a0b093c0e53d71d9f893030eb`; 전 쪽 비공백과 한글 검색 확인 |
| system print | 별도 Alhangeul preview 없이 GTK Print dialog 직접 진입, All Pages와 CUPS-PDF 선택. A4 6쪽, 457,293 B, SHA-256 `34ced0e91e33b5f1a7adacce89a6be58170e1231c65cd91146ae2d167429f619`; 전 쪽 한글 본문·표·세로 방향 시각 확인 |
| 반복 lifecycle | 출력 저장 뒤 재인쇄 dialog 진입, 취소, 다시 진입, 재취소와 editor 복원 확인 |

AppImage와 RPM은 Stage 3 inventory·checksum만 수용했고 실제 GUI는 DEB 설치 binary로
검증했다. Linux arm64도 hosted runner DEB build·inventory만 수용했으며 실제 arm64 GUI는
실행하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- 제품 코드, bundled Studio, workflow와 generated artifact에는 변경이 없다.
- 구현계획서는 작업지시자가 승인한 Linux 수용 환경과 자동화 분리 경계만 보정했다.
- 공식 문서는 현재 pin·실행 가능 SHA·수용 결과를 추가했으며 과거 Task #5·#7·#11·#13·#15
  증거와 v0.8.2 known issue 본문은 수정하지 않았다.
- fixture와 GUI/PDF 증적은 일회성 검증 경로에만 두고 저장소에 binary로 추가하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
rg -n 'v0\.8\.4|496333b27d21ddb9114ba9ae340bcb895870c9a7|88baa5666ec55bf043844bae01ec4d422278851c|31688454752|31688732973' \
  README.md docs/DEVELOPMENT.md docs/architecture/UPSTREAM.md \
  docs/operations/DESKTOP_RELEASE.md rhwp-core.lock
git diff --check
```

결과:

- OK — frozen pnpm install과 제품 경계 199 files, 제품 version `0.1.0`, release metadata,
  rhwp `v0.8.4` pin 6 artifacts 검증 통과.
- OK — upstream test 35/35, Studio Vitest 105/105 통과.
- OK — Studio production build 227 modules 성공. 기존 chunk size·dynamic import 경고 외 실패 없음.
- OK — Linux x64 artifact inventory는 Codespaces에서 재검증했고 DEB 설치 binary SHA가
  Stage 3 inventory와 일치했다.
- OK — HWP/HWPX 열기·저장·재열기, direct PDF와 GTK/CUPS system print 전체 시나리오 통과.
- OK — 공식 문서의 pin, exact SHA와 두 run ID 검색 결과가 일치한다.
- OK — `git diff --check` 통과.

## 잔여 위험

- Linux GUI 수용은 Ubuntu 24.04 Codespaces의 DEB 한 환경이다. AppImage/RPM 설치·실행,
  배포판·desktop environment·WebKitGTK 조합 전체와 physical printer를 대표하지 않는다.
- GPU 없는 headless 환경은 software compositing으로 실행했다. 실제 GPU/Wayland 환경의
  장시간 사용과 rendering 성능을 검증하지 않았다.
- Linux arm64 실제 GUI는 미실행이다. arm64는 hosted DEB build·inventory 증거만 가진다.
- Windows MSI 수동 GUI는 Stage 4 제한대로 미실행이며 자동 package smoke와 NSIS GUI를
  결합한 수용이다.
- GUI acceptance 자동화는 Task #34·#35의 장기 운영 개선 범위이며 Task #24에는 포함하지 않았다.

## 다음 단계 영향

- Stage 3 native accepted SHA 이후 변경은 구현계획서, 단계 보고서와 두 공식 증적 문서뿐이다.
  Stage 6 path audit에서 실행 코드·workflow·generated artifact가 없음을 확인하면 native run
  `31688732973`을 계승한다.
- Stage 5 commit까지 `publish/task24`로 fast-forward push하고 그 exact head에서 final CI를
  한 번 실행한다.
- 작업지시자가 이 스레드에서 #24 PR 생성까지 연속 진행을 명시했으므로 별도 대기 없이
  Stage 6 final gate와 `task-final-report`를 이어서 수행한다.

## 승인 경계

- Stage 5는 제한사항을 명시한 Go다. 작업지시자의 PR 생성까지 진행 지시를 Stage 6 진입
  승인으로 적용하며, PR merge·Issue close·PR #32 정리는 수행하지 않는다.
