# Task #20 Stage 4.1 완료보고서 — cross-platform lifecycle 수용 완료

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
구현계획서: [`task_m010_20_impl.md`](../plans/task_m010_20_impl.md)
Stage: 4.1

## 단계 목적

Stage 4 최초 수용 과정에서 확인된 Windows installer lifecycle readiness와 Linux GUI native dialog 자동화 결함을 제품 동작과 분리해 최소 보정한다. correction source를 exact SHA로 고정하고 Windows x64·Linux x64·Linux arm64 native workflow와 Linux GUI의 실제 DEB 설치·문서 lifecycle 전체를 같은 SHA와 artifact handoff로 통과시켜 Stage 4 cross-platform acceptance를 완료하는 것이 이번 단계의 기준이었다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-desktop.yml` | Windows installer lifecycle smoke와 Linux artifact handoff에 필요한 build·검증 증거를 고정했다. |
| `.github/workflows/alhangeul-linux-gui.yml` | exact native artifact를 설치한 뒤 Linux GUI native open/save/drag/PDF/print suite와 증거 수집을 실행하도록 확장했다. |
| `apps/desktop/src-tauri/src/system_print.rs` | Linux의 GTK Print dialog와 direct PDF 출력을 native command 경계 안에서 처리하는 최소 system print adapter를 추가했다. |
| `apps/desktop/src-tauri/src/commands.rs`, `apps/desktop/src-tauri/src/lib.rs`, `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/Cargo.lock` | system print command 등록과 Linux 전용 의존 경계를 연결했다. |
| `apps/studio-host/src/command/direct-print.ts`, `apps/studio-host/src/command/direct-print.test.ts`, `apps/studio-host/src/style.css` | Windows/Linux direct print 호출과 사용자 상태 표시를 보강하고 계약 test를 추가했다. |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | bundled upstream과 제품 adapter의 소유 경계를 검증했다. |
| `scripts/windows-installer-smoke.ps1`, `scripts/windows-process-lifecycle.ps1`, `tests/windows-installer-smoke.test.mjs` | MSI·NSIS 설치 후 ready/close/relaunch/uninstall 반복 lifecycle을 검증했다. |
| `tests/gui/linux/probe.mjs`, `tests/gui/linux/native-output.ts`, `tests/gui/linux/native-ui/*` | Linux native dialog의 AT-SPI 탐색, semantic click, drag-in, 생성 파일 증거를 수집·검증했다. |
| `tests/gui/specs/linux-native.e2e.ts`, `tests/gui/specs/document-ux.e2e.ts`, `tests/gui/support/*`, `tests/gui/wdio*.conf.ts` | 기본 문서와 native open/save/drag/direct PDF/system print scenario를 exact workflow에서 실행하도록 구성했다. |
| `tests/linux-gui-probe.test.mjs`, `tests/linux-gui-workflow.test.mjs`, `tests/actions-workflows.test.mjs`, `tests/gui-contracts.test.mjs` | workflow, probe, native UI와 evidence contract를 플랫폼 중립 test로 고정했다. |
| `mydocs/plans/task_m010_20_impl.md`, `mydocs/orders/20260826.md`, `mydocs/orders/20260827.md`, `mydocs/orders/20260828.md` | correction 원인·승인 범위·exact run 결과와 일일 진행 상태를 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

`third_party/rhwp`와 upstream 문서 parser·renderer·save 구현은 수정하지 않았다. Studio가 이미 만든 PDF bytes를 Linux native print 경계로 전달하고 GUI acceptance가 기존 HWP/HWPX 흐름을 조작하는 방식으로 제한했다. roundtrip HWP와 HWPX를 다시 열어 성공했고 direct PDF, GTK Print to File, CUPS-PDF가 모두 원본과 같은 6쪽 A4 문서를 생성했다. Windows와 Linux 밖의 제품·CI·패키징 범위는 추가하지 않았다.

최종 수용 source는 `b0667c746aa838143fe6043ee4841958ea28ec6b` (`Task #20 [Stage 4.1]: Linux semantic click 보정`)이다. 이전 correction run의 실패는 source·환경 원인 진단에만 사용하고 완료 근거로 재사용하지 않았다. 단계 보고서와 최종 evidence 기록은 exact source 수용이 끝난 뒤 별도 문서 커밋으로 묶는다.

## 검증 결과

플랫폼 중립 실행 명령:

```bash
pnpm exec node --test tests/linux-gui-probe.test.mjs tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs tests/windows-installer-smoke.test.mjs tests/gui/linux/native-ui/atspi.test.mjs
pnpm run typecheck:gui
pnpm run test:automation
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — focused Node test가 56개 test를 모두 통과했다.
- OK — GUI TypeScript typecheck가 오류 없이 통과했다.
- OK — `test:automation`이 214개 test를 모두 통과했다.
- OK — `check:product-boundary`가 231개 파일을 검사해 violation 없이 통과했다.
- OK — `test:studio`가 21개 파일, 111개 test를 모두 통과했다.
- OK — `tsc && vite build`가 213개 module을 변환해 production Studio bundle을 생성했다. dynamic import와 chunk-size 메시지는 기존 non-blocking warning이다.
- OK — `git diff --check`가 빈 출력으로 통과했다.

Windows/Linux native 수용:

- OK — exact SHA `b0667c746aa838143fe6043ee4841958ea28ec6b`의 [native run 33164172488](https://github.com/postmelee/alhangeul-tauri/actions/runs/33164172488)에서 Windows x64, Linux x64, Linux arm64 build와 artifact 검증이 모두 성공했다.
- OK — Windows x64 job의 desktop Rust test·Clippy와 installer smoke가 성공했다. smoke artifact ID는 `9683681327`, digest는 `sha256:1c202ec4e6c834ab8c14531ca40eda7dc6dfc3e83f7e2043ac9e34ca2e81a103`이다.
- OK — Windows artifact ID `9683535798` (`sha256:bab7ca85c4f7470c91137560a6f69c5cfc8921056cc351629315d89c991c35b7`), Linux x64 artifact ID `9683147488` (`sha256:cce13333f73ae79d684a23071996e8116e2f5745c14bc6ba75d3fc631ff0d4b9`), Linux arm64 artifact ID `9683067866` (`sha256:56196f24831b63f93ae994abf2fa4d96c7e11666d7bf3961e455c7546634f5f6`)을 같은 run에서 생성했다.

Linux GUI 수용:

- OK — 같은 exact SHA와 Linux x64 artifact를 사용한 [Linux GUI run 33166298495](https://github.com/postmelee/alhangeul-tauri/actions/runs/33166298495)의 22개 step이 모두 성공했다.
- OK — evidence artifact ID `9683810862`의 digest는 `sha256:2dc348d2b9195922e0d4bf08bab14ce0b04c0fc6c5d752d52519dc1a2a085f7c`이며 handoff의 native run ID `33164172488`, artifact ID `9683147488`, build ref와 digest가 모두 일치했다.
- OK — `biz-plan-hwp`, `form-hwpx`, `linux-native-save`, `linux-native-drag-in`, `linux-direct-pdf`, `linux-system-print` 여섯 scenario가 모두 success다.
- OK — evidence manifest가 참조한 31개 파일의 size와 SHA-256을 다시 계산해 모두 일치함을 확인했다. HWP/HWPX roundtrip 파일도 재개방에 성공했다.
- OK — direct PDF, GTK Print to File PDF, CUPS-PDF는 각각 6쪽 A4이며 모든 페이지에서 text 또는 non-white content가 확인되고 문서 제목도 검출됐다.

## 잔여 위험

- native와 GUI 수용은 GitHub Actions의 Windows runner와 Ubuntu Xvfb·CUPS-PDF 환경을 기준으로 한다. 지원 범위 안에서도 개별 Linux 배포판, desktop theme, 실제 프린터 driver 차이는 후속 호환성 검증 대상이다.
- release, 서명, 패키지 게시, updater 활성화는 이번 task 범위에 포함하지 않았고 수행하지 않았다.
- evidence render는 manifest·text·pixel 지표로 검증했다. 임의 문서 전체에 대한 주관적 시각 품질 보증을 의미하지 않는다.

## 다음 단계 영향

- Stage 4.1 correction과 Stage 4 cross-platform lifecycle acceptance가 완료됐다.
- 작업지시자 승인 뒤 `task-final-report` 절차로 최종 보고서, 오늘할일 완료 처리, 최종 커밋과 `devel` 대상 PR 게시를 진행한다.
- Issue #20은 PR merge 전까지 open으로 유지하고 release·배포 작업으로 범위를 넓히지 않는다.

## 승인 요청

- Stage 4.1 산출물과 exact Windows/Linux·Linux GUI 검증 결과를 승인하면 최종 보고서와 PR 게시 단계로 진행한다.
