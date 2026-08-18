# Task #34 Stage 4 완료 보고서 — Linux GUI workflow와 운영 계약

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 4

## 단계 목적

Stage 1의 exact-SHA native run/artifact verifier와 Stage 2~3의 공통·Linux GUI harness를 GitHub-hosted `ubuntu-22.04` standard x64 runner에 연결했다. 수동 입력 SHA와 native run ID를 run metadata·artifact ID·inventory·단일 DEB 설치까지 한 chain으로 검증하고, Xvfb·DBus·AT-SPI·GTK·CUPS-PDF·Poppler 환경에서 production binary를 실행하도록 workflow 계약을 고정했다. GUI 실패와 evidence 업로드 실패는 마지막 gate가 각각 실패로 전달하며 자동 재시도는 하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | `workflow_dispatch` exact SHA/run ID 입력, read-only 권한, SHA-pinned Actions, artifact ID download·inventory·단일 DEB 검증, Linux GUI 환경 준비·실행·7일 evidence·최종 outcome gate를 300행에 구성했다. |
| `tests/linux-gui-workflow.test.mjs` | trigger/input/permission/runner, handoff 순서, artifact ID 결속, 단일 DEB, native dependency/version, no retry, evidence와 immutable Action pin 계약 9건을 224행에 고정했다. |
| `tests/actions-workflows.test.mjs` | 공통 workflow inventory, 최소 권한과 deploy 금지 검사 대상에 새 Linux GUI workflow를 추가했다. |
| `package.json` | 새 workflow contract test를 전체 `test:automation` gate에 포함했다. |
| `docs/operations/DESKTOP_RELEASE.md` | native build → Linux GUI dispatch → evidence read-back 순서, 7일 보존, 자동 범위와 잔여 native 수동 gate를 추가했다. |
| `mydocs/orders/20260815.md` | Stage 4 완료와 Stage 5 승인 대기 상태를 반영했다. |

신규 workflow는 권장 300 LOC 상한과 정확히 일치하고 신규 전용 test는 224행이다. 기존 공통 `tests/actions-workflows.test.mjs`는 Stage 4 시작 전 이미 권장 상한을 넘은 공유 inventory 파일이어서 16행만 최소 확장했으며, 새 상세 계약은 별도 파일로 분리해 추가 팽창을 막았다.

## 본문 변경 정도 / 본문 무손실 여부

제품 Rust/TypeScript 코드, upstream submodule, desktop artifact build workflow와 기존 저장·PDF·인쇄 동작은 수정하지 않았다. 운영 문서는 기존 historical canary 기록을 재작성하지 않고 현재 workflow 범위 바로 뒤에 Linux exact-SHA GUI gate 절차만 추가했다. 새 workflow는 release/tag/서명/게시를 수행하지 않고 production DEB를 임시 hosted runner에 설치해 acceptance evidence만 생성한다.

## 검증 결과

구현계획서의 Stage 4 명령을 최종 보정 뒤 그대로 실행했다.

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — workflow focused contract 21/21 통과.
- OK — 제품 경계 검사 224개 파일 통과.
- OK — 전체 automation 194/194 통과. 새 Linux workflow test가 전체 gate에 포함됐다.
- OK — upstream 통합 35/35 통과.
- OK — Studio host 21개 파일, 97/97 test 통과.
- OK — Studio production build 성공. 기존 CanvasKit externalization·chunk-size warning 외 오류 없음.
- OK — `git diff --check` 경고 없음.

추가 정적 검증:

```bash
actionlint .github/workflows/alhangeul-linux-gui.yml
pnpm exec tsc --noEmit -p tests/gui/tsconfig.json
```

- OK — workflow expression·YAML·shell 정적 검사 통과.
- OK — GUI TypeScript strict no-emit 검사 통과.

최초 focused/automation 실행에서는 final gate의 `PREPARE` outcome이 반복 판정에만 있고 environment에 전달되지 않은 결함을 새 계약 test가 1건 탐지했다. 해당 environment 결속을 보정한 뒤 focused 21/21과 automation 194/194를 다시 실행해 통과했다.

## 잔여 위험

- 새 workflow는 아직 default branch에 없으므로 실제 `workflow_dispatch`, exact artifact download, DEB 설치와 Linux GUI runtime 성공을 실행하지 않았다. Stage 4 결과는 source-level·플랫폼 중립 계약 증거이며 native 성공 증거가 아니다.
- CUPS-PDF는 Ubuntu AppArmor 기본 허용 경로인 `/home/runner/PDF`와 `Label 0`을 사용해 `biz_plan.pdf`를 기대한다. hosted image의 package 설정·GTK print job title이 달라지면 first canary가 fail-closed하고 evidence tree/log로 보정해야 한다.
- GTK/WebKitGTK localized accessibility name, Xvfb window manager readiness와 `WebKitWebDriver` runtime 호환성은 실제 hosted runner에서만 확정할 수 있다. 좌표 반복이나 retry fallback은 없다.
- PNG/PDF 자동 판정은 tofu를 완전히 증명하지 못한다. Stage 5 live run에서 screenshot·render의 한글 glyph, 중앙 정렬, 빈 쪽·crop을 사람이 JSON summary와 대조해야 한다.
- Linux arm64, RPM/AppImage desktop integration, 실제 GNOME/Xfce file manager, physical printer와 Windows GUI는 이 workflow 범위 밖이며 별도 수용 gate로 남는다.

## 다음 단계 영향

- Stage 5는 Stage 1~4 neutral gate를 clean 상태에서 재실행하고 최종 보고서와 `devel` 대상 task PR을 게시하되 본문은 `Refs #34`로 Issue를 열어 둬야 한다.
- PR merge 뒤 default branch에서 같은 exact SHA의 성공한 `alhangeul-desktop.yml` run을 만들고 그 SHA/run ID로 `alhangeul-linux-gui.yml`을 dispatch해야 한다.
- live run의 workflow/head/input SHA, native run ID, artifact ID/digest, DEB hash와 evidence artifact hash를 read-back하고 screenshot/PDF render를 확인한 뒤에만 Issue #34를 닫는다. 실패하면 Issue를 연 채 correction PR과 새 exact-SHA run으로 반복한다.

## 승인 요청

- Stage 4 산출물과 검증 결과를 승인하면 Stage 5 task PR·post-merge native x64 canary handoff 준비로 진행한다.
