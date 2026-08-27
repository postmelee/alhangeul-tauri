# Task #34 Stage 1 완료 보고서 — exact-SHA handoff와 driver 계약

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 1

## 단계 목적

native GUI를 실행하기 전에 요청한 repository·40자리 build SHA·native workflow run·Linux x64 artifact가 같은 빌드임을 fail-closed 방식으로 판정하는 경계를 만들었다. 또한 제품 binary에 test plugin을 추가하지 않고 외부 `tauri-driver`와 `WebKitWebDriver`로 설치된 Linux app의 title/root DOM을 읽는 최소 probe 계약을 고정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/verify-workflow-artifact.mjs` | GitHub run/artifact metadata를 조회해 repository, workflow, event, completion, head SHA, artifact cardinality·expiry·size·digest와 원본 run identity를 검증하고 구조화 output을 생성한다. |
| `tests/workflow-artifact-handoff.test.mjs` | 입력, run, pagination, artifact provenance, digest, output과 API 보안 실패를 포함한 30개 focused contract를 추가했다. |
| `tests/gui/support/process.mjs` | PATH executable 탐색, bounded stdout/stderr 수집과 driver process 종료 helper를 추가했다. |
| `tests/gui/linux/probe.mjs` | Linux/Xvfb/driver/app prerequisite를 확인하고 W3C `wry` session에서 title과 root DOM을 읽어 성공·실패 evidence를 남기는 probe를 추가했다. |
| `tests/linux-gui-probe.test.mjs` | prerequisite, path/port, log truncation, session capability, cleanup과 실패 evidence 계약 12개를 고정했다. |
| `package.json` | 두 Stage 1 focused test를 `test:automation`에 포함했다. |
| `mydocs/orders/20260814.md` | Stage 1 완료와 Stage 2 승인 대기 상태를 반영했다. |

구현 파일은 모두 300 LOC 권장 상한 이내다. 핵심 파일은 verifier 259행, Linux probe 219행, process helper 68행이다.

## 본문 변경 정도 / 본문 무손실 여부

제품 코드와 upstream bundle, 기존 native build workflow, 공식 문서는 수정하지 않았다. 기존 desktop artifact inventory 생성·검증 책임도 바꾸지 않고 Stage 1 helper는 다운로드 전 GitHub metadata provenance만 담당하도록 분리했다. 기존 자동화 test는 유지하면서 신규 test 두 개를 추가했다.

## 검증 결과

실행 명령:

```bash
node --test tests/workflow-artifact-handoff.test.mjs
node tests/gui/linux/probe.mjs --help
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — handoff focused test 30/30 통과
- OK — probe/parser/process test를 포함한 `test:automation` 162/162 통과
- OK — `probe.mjs --help`가 network·GUI·repository write 없이 사용 계약 출력
- OK — 제품 경계 검사 202개 파일 통과
- OK — `git diff --check` 경고 없음

실제 공개 metadata 읽기 검증:

```bash
node scripts/verify-workflow-artifact.mjs \
  --repository postmelee/alhangeul-tauri \
  --build-ref 88baa5666ec55bf043844bae01ec4d422278851c \
  --run-id 31688732973
```

- OK — workflow run `31688732973`과 Linux x64 artifact `9176850348`의 exact SHA, workflow, event, 상태, digest와 원본 run identity를 결속했다.
- 공개 API 읽기만 수행했으며 artifact 다운로드, repository write, workflow dispatch와 외부 상태 변경은 없었다.

구현 중 최초 전체 경계 검사에서 test fixture의 지원 범위 밖 platform 문자열이 1회 차단됐다. fixture를 제품 지원 범위 안의 Windows host로 보정한 뒤 focused·전체 검증을 다시 실행해 모두 통과했다. 실패 상태로 단계 완료를 처리하지 않았다.

## 잔여 위험

- 현재 host는 macOS이므로 실제 Linux production DEB, Xvfb, `tauri-driver`, `WebKitWebDriver` session을 실행하지 않았다. 새 workflow가 default branch에 merge된 뒤 live close gate에서 성공을 확정한다.
- Stage 1은 GitHub metadata까지 판정한다. artifact archive 다운로드 후 기존 inventory와 package SHA-256을 재검산하는 orchestration은 Stage 4가 담당한다.
- WebdriverIO selector·fixture·evidence schema와 GTK native dialog adapter는 각각 Stage 2·3 범위다.
- GitHub API version은 공식 최신 계약 `2026-03-10`으로 고정했다. 향후 API version 변경은 contract test와 함께 갱신해야 한다.

## 다음 단계 영향

- Stage 2는 `tests/gui/support/process.mjs`와 `tests/gui/linux/probe.mjs`의 production binary/external driver 경계를 계승한다.
- WebdriverIO는 `browserName: wry`, `tauri:options.application` capability를 사용하며 embedded WebDriver plugin을 제품에 추가하지 않는다.
- 공통 fixture·selector·evidence schema는 Linux 명령을 포함하지 않아 Issue #35가 재사용할 수 있어야 한다.
- Stage 4 workflow는 verifier가 낸 `artifact_id`를 사용하고 별도의 latest-run 검색을 추가하지 않는다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 공통 WebDriver 문서 UX harness 구현으로 진행한다.
