# Task #19 Stage 4.2 완료 보고서 — Linux GUI CUPS 환경 증거 보정

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.2

## 단계 목적

Stage 4.1 exact candidate `243387060a4c1cf640a15c20c59552ab36524ae8`의
Linux GUI acceptance run `32696052385`에서 확인한 환경 증거 기록 실패를 제품 코드
변경 없이 보정한다. Ubuntu 22.04 `cupsd`가 지원하지 않는 `-v` 호출을 제거하고,
이미 필수 설치된 `cups-daemon` Debian package version을 기록해 CUPS 환경 provenance를
fail-closed로 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | 315 LOC. 미지원 `cupsd -v` 대신 `dpkg-query -W cups-daemon`으로 CUPS version 증거 기록 |
| `tests/linux-gui-workflow.test.mjs` | 254 LOC. `cups-daemon` package evidence와 `cupsd -v/--version` 호출 부재 계약 고정 |
| `mydocs/plans/task_m010_19_impl.md` | 실패 exact SHA/run, 승인된 Stage 4.2 범위·검증·commit 기록 |
| `mydocs/orders/20260824.md` | Stage 4.2 로컬 gate 완료와 exact-SHA 재검증 진행 상태 반영 |
| `mydocs/working/task_m010_19_stage4.2.md` | 보정 산출물·로컬 검증·remote 잔여 gate 기록 |

workflow는 기존 316 LOC에서 315 LOC로 줄었다. 계약 테스트는 기존 254 LOC를 유지하며
같은 환경 증거 test 안에서 요구 명령 하나와 금지 정규식 하나만 교체했다. 새 helper,
외부 Action, dependency와 권한은 추가하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

제품 Rust/Studio, PDF snapshot·job/reaper·startup cleanup, package 산출물과 사용자 문서는
수정하지 않았다. Linux GUI workflow의 exact checkout·artifact ID/digest handoff, 단일 DEB
검증·설치, CUPS-PDF A4 구성, 실제 GUI/PDF 시나리오와 always evidence gate도 유지했다.

실패 run은 DEB 설치와 CUPS-PDF 구성까지 성공했고 `native-environment.txt`에 Node, pnpm,
Rust, exact tauri-driver, WebKitWebDriver·GTK package와 Poppler version을 기록한 뒤 마지막
`cupsd -v`에서만 종료됐다. 보정은 해당 daemon flag 호출을 같은 패키지 관리자의 설치
version query로 바꾸며 CUPS 환경 증거를 생략하지 않는다.

## 검증 결과

실행 명령:

```bash
node --test tests/linux-gui-workflow.test.mjs
actionlint .github/workflows/alhangeul-linux-gui.yml
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

결과:

- OK — focused Linux GUI workflow contract `9/9` 통과. `cups-daemon` package version을 요구하고 `cupsd -v/--version`을 금지한다.
- OK — `actionlint` 오류 없이 통과.
- OK — `pnpm run check:product-boundary`: 230 files scanned, 통과.
- OK — `pnpm run test:automation`: 201 tests 통과.
- OK — `git diff --check` 출력 없이 통과.

## 잔여 위험

- 로컬 macOS에서는 Linux package query와 GUI를 수용 증거로 실행하지 않는다. 새 exact SHA의 Ubuntu 22.04 runner에서 `cups-daemon` version 기록과 실제 GUI 시나리오를 확인해야 한다.
- candidate SHA가 바뀌므로 이전 SHA의 성공 CI/artifact를 새 수용 증거로 재사용할 수 없다. 새 SHA에서 CI, Windows/Linux artifact·installer smoke를 처음부터 통과해야 한다.
- repository에는 Windows GUI automation harness가 없다. Windows HWP/HWPX direct PDF, atomic replace와 source state는 실제 Windows 수동 gate가 필요하다.

## 다음 단계 영향

- 이 보고서와 보정 source를 한 commit으로 묶고 `publish/task19`에 non-force push한다.
- 새 exact SHA에서 CI와 desktop artifact workflow를 재실행하고, 같은 SHA의 Linux x64 artifact만 Linux GUI acceptance에 전달한다.
- Linux GUI 성공 뒤 evidence artifact의 context·handoff·DEB hash·environment·step outcomes·PDF summary를 read-back한다. Windows GUI 수동 증거 없이 Stage 4를 완료 처리하지 않는다.

## 승인 요청

- 작업지시자가 2026-08-24 승인한 Stage 4.2 범위에는 이 보정 commit의 exact-SHA CI·artifact·Linux GUI 재실행과 evidence read-back까지 포함된다.
