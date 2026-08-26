# Task #19 Stage 4.3 완료 보고서 — Issue #34 close gate 기준 통합

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.3

## 단계 목적

Issue #34가 완료되기 전의 `devel`을 기준으로 만든 #19 candidate에 #34의 최종 Linux
exact-SHA GUI acceptance harness를 통합한다. 이미 원격에 게시된 #19 단계 이력은
재작성하지 않고 `origin/devel` merge commit을 유지하며, 알려진 hidden file input과 native
dialog·drag·print harness 결함을 #19에서 중복 보정하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `origin/devel` merge | PR #43·#44 merge SHA `424bb9c43769d2d92fcfede6b7ddd13bba7561d0`의 #34 GUI harness·계약·작업 증적을 비재작성 통합 |
| `.github/workflows/alhangeul-linux-gui.yml` | 충돌을 #34 close gate에서 성공한 `dpkg-query -W cups` 환경 증거 계약으로 해소 |
| `tests/linux-gui-workflow.test.mjs` | workflow와 같은 `cups` package 및 미지원 `cupsd -v` 부재 계약 채택 |
| `mydocs/orders/20260824.md` | add/add 충돌에서 당시 병렬 진행한 #19·#34 행을 모두 보존 |
| `mydocs/orders/20260826.md` | #34 완료 행을 보존하고 #19 Stage 4.3 로컬 gate 상태 추가 |
| `mydocs/plans/task_m010_19_impl.md` | Stage 4.3 통합 범위, #35 비차단 판단, 검증·커밋·원격 gate 추가 |
| `mydocs/working/task_m010_19_stage4.3.md` | 본 단계의 충돌 해소, 로컬 검증과 잔여 native gate 기록 |

직접 충돌 해소 파일은 workflow 337 LOC, workflow contract 280 LOC, 8월 24일·26일
보드는 각각 8 LOC다. workflow의 300 LOC 초과는 #34에서 exact-SHA close gate를 통과한
orchestration과 fail-closed evidence 경계를 그대로 보존하기 위한 승인된 통합 예외로
계획서에 기록했다.

## 본문 변경 정도 / 본문 무손실 여부

#19의 PDF snapshot, native job/reaper, startup cleanup과 Studio source는 수정하지 않았다.
Stage 4.1·4.2 커밋과 보고서도 재작성하지 않았다. #34에서 `devel`에 merge된 공통 GUI
harness와 작업 증적을 그대로 수용하고, 세 충돌만 의미 단위로 해소했다. Stage 4.2의
`cups-daemon` 후보는 미지원 `cupsd -v` 원인을 입증한 과거 기록으로 남기고, 새 candidate는
#34가 실제 GUI·PDF close gate에서 검증한 `cups` package 증거를 canonical 계약으로 사용한다.

## 검증 결과

실행 명령:

```bash
node --test tests/linux-gui-workflow.test.mjs
pnpm run test:gui:contracts
pnpm run test:gui:linux:contracts
pnpm run typecheck:gui
actionlint .github/workflows/alhangeul-linux-gui.yml .github/workflows/alhangeul-desktop.yml
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
git diff --cached --check
```

결과:

- OK — Linux GUI workflow focused `9/9`
- OK — 공통 GUI 계약 `19/19`, Linux GUI 계약 `32/32`
- OK — GUI TypeScript typecheck, 두 workflow actionlint
- OK — product boundary `230 files`
- OK — 전체 automation `224/224`, upstream `35/35`
- OK — Studio `22 files`, `112/112`; production build `214 modules`
- OK — 미해결 merge 파일·conflict marker 없음, working/staged diff check 오류 없음
- INFO — 최초 typecheck는 분리 worktree에 `node_modules`가 없어 `tsc` 탐색에서 중단됐다.
  `pnpm install --frozen-lockfile`로 lockfile 변경 없이 479 package를 복원한 뒤 같은 명령이
  성공했다. 코드·lockfile 실패로 판정하지 않는다.

Issue #34의 독립 close 증거도 확인했다. merge exact SHA `424bb9c`의 desktop artifact run
`32869377875`와 Linux GUI run `32871216329`가 성공했으며, 후자는 `nativePrint=0`,
`webdriver=0`, HWP/HWPX open·save·reopen, drag-in, 직접/GTK/CUPS PDF와 editor restore를
모두 통과했다. 이 결과는 #34 harness 기준의 선행 증거이며 #19 새 merge candidate의 원격
수용 결과로 대체하지 않는다.

## 잔여 위험

- Stage 4.3 merge commit의 새 exact SHA는 아직 CI와 Windows/Linux artifact·installer smoke,
  Linux GUI/PDF acceptance에서 실행되지 않았다.
- macOS 로컬 결과는 Rust desktop test·Clippy, Tauri bundle이나 Linux GUI 수용 증거가 아니다.
- Issue #35는 #19 선행 조건이 아니다. 다만 #19 Stage 4 완료에는 Windows HWP/HWPX direct
  PDF, live snapshot/source state, atomic replace와 stale-job 회수 수동 증거가 여전히 필요하다.
- 통합 workflow 337 LOC의 구조 개선은 이미 성공한 #34 close gate를 다시 변경하는 별도 판단이
  필요해 이번 단계에서 수행하지 않았다.

## 다음 단계 영향

- 본 merge commit을 `publish/task19`에 non-force push하고 새 exact SHA에서 CI와 desktop
  artifact workflow를 처음부터 실행한다.
- 두 workflow 성공 뒤 같은 SHA의 Linux x64 artifact만 Linux GUI acceptance에 전달하고
  context, handoff digest, DEB hash, environment, phase outcomes, 6개 scenario manifest와 PDF
  summary를 read-back한다.
- Linux 자동 gate 성공 뒤에도 Windows #19 고유 수동 증거 없이는 Stage 4를 완료 처리하지 않는다.

## 승인 요청

- Stage 4.3 산출물과 로컬 검증 결과를 승인하면 merge commit을 원격에 게시하고 새 exact-SHA
  CI·artifact·Linux GUI/PDF acceptance로 진행한다.
