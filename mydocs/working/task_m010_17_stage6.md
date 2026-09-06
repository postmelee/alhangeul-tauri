# Task #17 Stage 6 완료보고서 — Linux x64·arm64 exact-SHA native 수용

GitHub Issue: [#17](https://github.com/postmelee/alhangeul-tauri/issues/17)
구현계획서: [`task_m010_17_impl.md`](../plans/task_m010_17_impl.md)
Stage: 6

## 단계 목적

Stage 2~5에서 구현하고 문서화한 Linux HWP/HWPX thumbnail 기능을 새 candidate의 exact SHA에 결속해 최종 수용하는 단계다. Linux x64·arm64 native build와 승인 package matrix를 다시 검증한 뒤, 같은 x64 DEB를 설치한 Nautilus·Thunar에서 합성 계약 fixture와 공개 실사용 HWP/HWPX의 최초 생성·cache hit·mtime invalidation을 확인했다.

실사용 시각 수용은 `third_party/rhwp`의 공개 대표 문서 두 건을 사용했다. 첫 페이지 text·table·image가 식별되는 manager screenshot과 512 px 직접 PNG를 artifact에 보존하고, 에이전트가 실제 이미지를 열어 확인한 뒤 작업지시자에게 대화에서 직접 제시했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/linux-thumbnail-manager-probe.sh` | 공개 실사용 HWP/HWPX의 고정 경로·SHA-256을 검증하고 ASCII evidence copy와 512 px 직접 PNG를 만든다. |
| `scripts/linux-thumbnail-manager-session.sh` | 두 실사용 문서를 manager grid에 포함하고 최초·cached 호출 횟수와 성공 cache PNG를 합성 fixture와 분리해 판정한다. |
| `tests/gui/linux/native-ui/thumbnail-files.test.mjs` | 실사용 fixture hash, PNG evidence, manager 호출·cache 계약과 script 크기 상한을 고정한다. |
| `mydocs/plans/task_m010_17_impl.md` | Stage 6 산출물·실사용 fixture·대화 내 screenshot 제시 완료 조건을 명시한다. |
| `mydocs/orders/20260830.md` | Task #17을 Stage 6 완료·최종 보고/PR 승인 대기로 갱신한다. |
| `mydocs/working/task_m010_17_stage6.md` | exact-SHA native/package/GUI evidence와 최종 시각 판정 및 잔여 위험을 기록한다. |

Stage 6.1 candidate는 `5f8d5f7a1948c20b385f918882f460eeed6371ef`이며 커밋 메시지는 `Task #17 [Stage 6.1]: Linux 실사용 thumbnail 수용 candidate`다. 원격 `publish/task17`에 fast-forward push한 뒤 이 exact SHA만 두 workflow의 `build_ref`와 artifact handoff 입력으로 사용했다.

### exact-SHA native·package evidence

Native workflow: [run 33299244542](https://github.com/postmelee/alhangeul-tauri/actions/runs/33299244542)

| 범위 | Job / artifact | 결과·식별자 |
|---|---|---|
| Linux x64 native | job `99224139798` | success, `2026-08-30T07:27:26Z`~`07:57:07Z` |
| Linux arm64 native | job `99224139990` | success, `2026-08-30T07:27:28Z`~`07:50:47Z` |
| Windows x64 회귀 | job `99224139931` | success |
| Windows installer 회귀 | job `99227446164` | success |
| Linux x64 desktop | artifact `9728719556` | 535,864,388 bytes, `sha256:a2a9a8327669d3216caba59da923147d8b6ec1a303354e4aa46fd17b5f045890` |
| Linux arm64 desktop | artifact `9728644752` | 188,508,797 bytes, `sha256:04bc4544d437f7f19b8d6b111fb6552db8032d3454ec0dcbccef855fba807d44` |
| Linux x64 helper | artifact `9728460426` | 7,592,053 bytes, `sha256:7b72d13287f06208d4cb68bd8e5b0fa2cfa5f9ac2f40b9b0eeaae48e8d225eeb` |
| Linux arm64 helper | artifact `9728457901` | 7,412,510 bytes, `sha256:3d06daa6d901ff9eeade9178f4319bfe9f8506d06de2689d811204d2ed2ccaee` |
| Linux x64 package evidence | artifact `9728715609` | 1,330 bytes, `sha256:c84750a29ad781abec8f9dd5c50a417116f068c393e93cc377953b12e08010e5` |
| Linux arm64 package evidence | artifact `9728643315` | 1,229 bytes, `sha256:600b1ba546cdbbd21f4f8dc76821e18ed5e7b7779e85f841e077383ea0becb74` |

Package evidence는 다음을 재검산했다.

- x64 helper ELF `x86-64`: `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5`
- x64 DEB: `c608a95c4f2ca98545661d7a86b17c94630bb9771abd53d927f98d82691d0cff`
- x64 RPM: `ebe93467feed783d0f367d9fb20b5582d7e5a6a5c963e7fdfbc7678158b79fb4`
- arm64 helper ELF `aarch64`: `554f85681cd6518738a310d15c3c67450af9b3e35305ca9e186c5b40b3c0d725`
- arm64 DEB: `2e4f83a45d5b7352e78a2cda56838cd6af067aa25983105e0c825f4595928b73`
- registration은 두 architecture 모두 `/usr/share/thumbnailers/alhangeul.thumbnailer`, mode `0644`, `Exec=/usr/lib/alhangeul/alhangeul-thumbnailer %i %o %s`, HWP/HWPX MIME만 소유한다.
- x64 DEB/RPM과 arm64 DEB 모두 clean install, same-version reinstall, update, injected-failure rollback, uninstall을 통과했다. MIME default, 제3자 thumbnailer와 cache sentinel은 보존됐고 uninstall 뒤 두 제품 파일만 제거됐다.

### package-installed file-manager evidence

Linux GUI workflow: [run 33300506770](https://github.com/postmelee/alhangeul-tauri/actions/runs/33300506770), job `99227639802`, success. Workflow context의 checkout, `buildRef`, native handoff와 acceptance ref는 모두 `5f8d5f7a1948c20b385f918882f460eeed6371ef`다.

GUI artifact `9728903612`(`alhangeul-linux-gui-33300506770`)는 8,978,979 bytes, `sha256:0544237840981b092f67936f099f160f33ea1c69cfe6b98cf95d51e5c389405d`다. 설치한 x64 DEB와 helper hash는 native package evidence와 일치하며 package owner도 `alhangeul`로 확인됐다.

검증 환경은 Nautilus `1:42.6-0ubuntu2`, Thunar `4.16.10-1`, Tumbler `4.16.0-1`, strace `5.16-0ubuntu3`다. HWP는 `application/x-hwp`, HWPX는 `application/vnd.hancom.hwpx`로 식별됐다. GNOME 진단은 제품 helper가 probe용 sandbox 우회 없이 실행됐음을 `product-helper-no-bypass`로 기록했다.

| Manager | 최초 호출 | 동일 원본 cache hit | mtime 변경 뒤 | 성공 cache PNG |
|---|---|---|---|---|
| Nautilus | direct 2, preview 2, failure 2 | direct 2, preview 2, failure 2 | direct 4, preview 4, failure 2 | 5 |
| Thunar/Tumbler | direct 2, preview 2, failure 4 | direct 2, preview 2, failure 6 | direct 4, preview 4, failure 8 | 4 |

정상 direct·preview fixture는 동일 원본 재조회에서 추가 호출 없이 cache hit했고, mtime 변경 뒤 각 2회 증가했다. Thunar/Tumbler의 손상 문서 재시도 증가는 Stage 1에서 확정한 허용 동작이며 정상 cache를 오염시키지 않았다. 실사용 HWP/HWPX는 두 manager 모두 최초 각 2개 trace와 cached 단계 동일 2개 trace로 별도 판정됐다.

공개 실사용 원본과 시각 evidence:

- `[2027] 온새미로 1 본교재.hwp`: `e8592e74c9a8425c4ee2c5824d012ebe45e9f6dd36880b784ba594b4fd0a31ce`
- `form-002.hwpx`: `5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4`
- Nautilus `first.png` 1280×800: `00bd6f30b6ead4fa4598f5e2746df77dd7c062536f62544a0304f51ad0e504b4`
- Thunar `first.png` 1280×800: `84fd3717a30f914f8d9d16ef36e754650ee430fc5033c621f3abdf58f01754e6`
- 온새미로 512 px RGBA PNG 362×512: `2a499693e01e811eff49c6aff3102720945ae54c00d75bb102e56cbdd94a8abf`
- form-002 512 px RGBA PNG 362×512: `35bd3ce2d05def6bf9ad525bc2a0a5b62f30ad3e1eb7c208e085a9e01a7be8ee`

에이전트가 artifact에서 네 PNG를 직접 열어 확인했다. Nautilus와 Thunar grid 모두 온새미로 표지의 제목·곡선 이미지와 form-002의 표·본문 행을 실제 thumbnail로 표시한다. 512 px 직접 출력에서도 같은 첫 페이지 구성이 식별되며 빈 placeholder나 앱 아이콘 대체가 아니다. 두 manager의 대표 screenshot과 두 상세 렌더는 작업지시자에게 대화에서 직접 제시했다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 6.1은 수용 harness·계약 테스트·계획·오늘할일만 변경했다. 제품 helper, shared renderer, package 설정, workflow와 `third_party/rhwp` 원본은 변경하지 않았다. 공개 실사용 fixture는 읽기 전용 원본 hash를 먼저 검증한 뒤 임시 ASCII filename으로 복사했으며 원본을 수정하지 않았다.

기존 합성 direct/preview/failure 계약은 유지하면서 실사용 시각 수용만 추가했다. manager가 생성한 thumbnail/cache/screenshot과 내려받은 Actions artifact는 runner 또는 로컬 임시 경로에만 존재하며 저장소에 추가하지 않았다.

## 검증 결과

실행 명령:

```bash
git rev-parse HEAD
gh workflow run alhangeul-desktop.yml --ref publish/task17 -f build_ref=5f8d5f7a1948c20b385f918882f460eeed6371ef
gh workflow run alhangeul-linux-gui.yml --ref publish/task17 -f build_ref=5f8d5f7a1948c20b385f918882f460eeed6371ef -f native_run_id=33299244542
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/linux-thumbnail-manager-probe.sh scripts/linux-thumbnail-manager-session.sh
git diff --check
git status --short
```

결과:

- OK — candidate HEAD `5f8d5f7a1948c20b385f918882f460eeed6371ef` 확인
- OK — native run `33299244542`: Linux x64·arm64, Windows x64와 installer smoke의 모든 job success
- OK — Linux GUI run `33300506770`: exact artifact handoff, verified DEB 설치, package-installed manager probe와 전체 GUI acceptance success
- OK — automation 297/297 통과
- OK — product boundary 288개 파일 통과
- OK — 두 manager shell script의 shellcheck 통과
- OK — `git diff --check` 출력 없이 종료 코드 0, 보고서 작성 전 worktree clean

## 잔여 위험

- Linux arm64 GUI/RPM, KDE/Dolphin, AppImage registration, Flatpak/Snap과 실제 물리 desktop session은 이번 승인 matrix 밖이다.
- Actions의 Ubuntu Xvfb/Openbox 환경에서 Nautilus·Thunar/Tumbler를 검증했다. 배포판·file manager의 다른 버전이나 사용자별 thumbnail 설정은 별도 호환성 범위다.
- 현재 renderer가 지원하지 않는 복잡한 HWP/HWPX 요소는 문서별 fidelity 차이를 만들 수 있다. 이번 Stage는 대표 실사용 문서의 text·table·image 첫 페이지와 기존 direct/preview/failure/resource 계약을 수용했다.
- Actions artifact는 임시 검증물이며 공식 release, 서명, package 게시 또는 updater 활성화를 뜻하지 않는다.

## 다음 단계 영향

- 구현계획의 마지막 Stage가 완료됐다. 다음 작업은 별도 `task-final-report` 승인 절차에서 최종 결과 보고서, 오늘할일 완료 처리, 최종 커밋, `publish/task17` push와 `devel` 대상 PR을 수행하는 것이다.
- 최종 보고·PR 전에는 Task #17의 지원 matrix를 확대하거나 release·배포·package 게시를 수행하지 않는다.
- PR merge 뒤에만 이슈 close와 branch/worktree 정리를 `pr-merge-cleanup` 절차로 수행한다.

## 승인 요청

- Stage 6 exact-SHA native/package/GUI 수용과 실사용 문서 시각 판정을 승인하면 별도 최종 보고·PR 단계로 진행한다.
