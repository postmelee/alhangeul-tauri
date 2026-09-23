# Task #11 Stage 3 보고서 — fresh Windows installer smoke workflow 연결

GitHub Issue: [#11](https://github.com/postmelee/alhangeul-tauri/issues/11)
구현계획서: [`task_m010_11_impl.md`](../plans/task_m010_11_impl.md)
Stage: 3

## 단계 목적

기존 Windows/Linux bundle build matrix는 유지하면서, Windows x64 artifact를 별도 fresh `windows-2025` job에서 소비해 Stage 2 PowerShell smoke를 실행하는 workflow 경로를 연결했다. installer 실패 때에도 진단을 보존하고 전체 workflow 실패로 전달하는 정적 계약까지 구현했다.

Windows workflow dispatch, artifact 생성·다운로드, packaging 수정과 원격 push는 수행하지 않았다.

## 구현 내용

### fresh artifact-consumer job

`windows-installer-smoke` job은 다음 경계를 갖는다.

| 항목 | 계약 |
|---|---|
| 선행 job | `needs: build` |
| 실행 조건 | job-level `always()`로 Linux matrix 실패와 무관하게 Windows artifact 소비 시도 |
| runner | 별도 fresh `windows-2025` |
| timeout | 30분 |
| 권한 | workflow 기존 `contents: read`만 유지 |
| source | `inputs.build_ref || github.sha` checkout |
| artifact | `alhangeul-desktop-windows-x64`만 `artifacts/windows-x64`에 download |
| smoke shell | Windows PowerShell |
| expected version | checkout한 root `package.json`의 3성분 version |
| diagnostics | `alhangeul-desktop-windows-x64-installer-smoke`, 14일 |

현재 공식 artifact action 사용 예시에 맞춰 기존 upload는 `actions/upload-artifact@v7`을 유지하고 single-artifact download에는 `actions/download-artifact@v8`을 사용했다.

### exact-ref와 입력 전달

- smoke job도 build job과 같은 `inputs.build_ref || github.sha`를 checkout한다.
- `git rev-parse "$env:EXPECTED_BUILD_REF^{commit}"` 결과와 `HEAD`를 비교하고 actual SHA를 diagnostic 파일에 기록한다.
- checkout한 root `package.json`에서 version을 읽어 3성분인지 검사한다.
- PowerShell script에 다음 세 입력만 전달한다.
  - `ArtifactRoot`: `artifacts\windows-x64`
  - `OutputDirectory`: `diagnostics\windows-installer-smoke`
  - `ExpectedVersion`: root package version
- dependency install이나 build source 재사용 없이 업로드된 Windows artifact를 그대로 검사한다.

Stage 4에서는 `build_ref`에 branch가 아니라 승인된 exact commit SHA를 전달해 build와 smoke source를 동일 SHA로 고정한다.

### 진단 보존과 failure gate

| 단계 | 실패 시 동작 |
|---|---|
| build/Windows artifact | smoke job은 `always()`로 시작하며 artifact가 없으면 download step이 명확히 실패 |
| checkout·SHA 검증 | 후속 일반 step은 skip되지만 outcome 기록과 diagnostic upload는 실행 |
| installer smoke | `continue-on-error: true`로 실제 outcome을 보존 |
| outcome 기록 | checkout, SHA 검증, download와 smoke outcome을 JSON으로 기록 |
| diagnostic upload | step-level `always()`, 빈 진단이면 `if-no-files-found: error` |
| final gate | step-level `always()`, checkout·검증·download·smoke·upload 중 하나라도 `success`가 아니면 실패 |

diagnostic 디렉터리와 workflow context를 첫 step에서 만들므로 installer 실행 전 실패에도 기본 증적을 남길 수 있다. Linux build 실패는 smoke job의 artifact 소비를 막지 않지만, 기존 build job 실패 자체는 workflow 전체 결과에 계속 반영된다.

### 기존 workflow 불변 조건

- `workflow_dispatch` 전용 trigger를 유지했다.
- `contents: read` 외 permission, secret, signing, release, Pages와 deploy action을 추가하지 않았다.
- `windows-x64`, `linux-x64`, `linux-arm64` matrix, runner, target과 bundle args를 변경하지 않았다.
- build job의 checkout, pretest, Tauri build, inventory 검증과 bundle upload 순서를 변경하지 않았다.
- 기존 artifact와 신규 diagnostic artifact의 보존 기간을 모두 14일로 유지했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-desktop.yml` | fresh Windows installer smoke, always-diagnostic upload와 final failure gate 추가 |
| `tests/actions-workflows.test.mjs` | job 실행 조건, exact ref, artifact, script 입력, 진단과 failure 전달 계약 4개 추가 |
| `mydocs/working/task_m010_11_stage3.md` | Stage 3 구현과 검증 결과 기록 |
| `mydocs/orders/20260731.md` | Stage 3 완료와 Stage 4 승인 대기 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드, installer source, package metadata와 공식 운영 문서는 수정하지 않았다. 기존 workflow build job 본문은 보존하고 그 뒤에 독립 smoke job만 추가했다. 기존 test는 유지하고 smoke job 전용 test와 `getJob` helper를 추가했다.

## 검증 결과

실행 명령:

```bash
node --test tests/actions-workflows.test.mjs tests/windows-installer-smoke.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

보조 검증:

```bash
actionlint .github/workflows/alhangeul-desktop.yml
```

결과:

- OK — workflow·PowerShell source contract `18/18` 통과.
- OK — 전체 automation `47/47` 통과.
- OK — product boundary `182 files scanned`.
- OK — product version의 5개 surface가 `0.1.0`으로 일치.
- OK — `rhwp` pin `v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 일치.
- OK — upstream test `32/32` 통과.
- OK — studio test files `21/21`, tests `114/114` 통과.
- OK — studio TypeScript·Vite production build 성공.
- OK — `actionlint`와 whitespace 검사 통과.

분리 작업트리의 `third_party/rhwp`가 처음에는 초기화되지 않아 pin·upstream 검증이 상위 저장소 remote를 읽고 실패했다. 기대 gitlink를 확인한 뒤 `git submodule update --init --recursive third_party/rhwp`로 `9b16aa9e…`를 checkout했으며 재실행은 통과했다. Git LFS와 Vitest·Vite의 공유 metadata·임시 출력 쓰기는 sandbox 밖 작업트리 권한으로 실행했다. 이 환경 복구로 source, pin, lockfile과 submodule commit은 변경되지 않았다.

## 참고 근거

- [actions/download-artifact 공식 사용법](https://github.com/actions/download-artifact)
- [actions/upload-artifact 공식 사용법](https://github.com/actions/upload-artifact)

## 잔여 위험

- workflow 구조와 정적 계약만 검증했으며 아직 GitHub-hosted Windows에서 실행하지 않았다.
- current NSIS bundle은 Stage 1에서 확인한 canonical handler·기본 연결 계약 불일치로 첫 canary가 실패할 가능성이 높다.
- MSI `1602` 원인은 first canary의 verbose log 전까지 미확정이다.
- Windows PowerShell, registry view, shortcut COM과 installer cleanup의 runtime 오차는 Stage 4 diagnostic artifact로 판정해야 한다.
- Windows artifact가 실제로 없을 때 download step과 final gate가 실패하는 동작도 native run에서 확인해야 한다.

## 다음 단계 영향

- Stage 4는 이 commit을 포함한 승인된 candidate SHA를 `publish/task11`에 push하고 같은 exact SHA로 desktop workflow를 dispatch한다.
- run에서 event, head branch·SHA, build matrix, smoke job과 두 Windows artifact를 대조한다.
- installer assertion 실패는 진단 canary로 분류할 수 있지만 diagnostic artifact 누락, exact-SHA 불일치 또는 smoke job 미실행은 Stage 4 미완료다.
- Stage 4에서는 source를 수정하지 않고 결과를 MSI `1602`, NSIS handler/default, automation 오류 또는 hosted-runner 성공으로 분류한다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 exact-SHA Windows installer 진단 canary로 진행한다.
