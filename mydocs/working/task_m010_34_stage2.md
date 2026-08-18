# Task #34 Stage 2 완료 보고서 — 공통 WebDriver 문서 UX harness

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 2

## 단계 목적

Linux production binary를 실제 실행하는 workflow와 native UI adapter를 만들기 전에, Issue #35도 재사용할 수 있는 플랫폼 중립 WebdriverIO harness를 확정했다. 설치된 앱과 외부 `tauri-driver` 경로, exact build SHA/run ID, 공개 fixture와 evidence root를 명시적 입력으로 받고, 파일 선택 open·초기 toolbar·한글 UI·쪽 수·최초 중앙 정렬을 같은 spec에서 검증하도록 구성했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/gui/wdio.shared.conf.ts` | app/driver/fixture/output 절대 경로, 40자리 SHA, native run ID, version과 bounded timeout을 검증하고 retry 없는 공통 WDIO config를 만든다. |
| `tests/gui/wdio.linux.conf.ts` | 제품 plugin 없이 `external` provider, 명시적 app/driver path와 자동 Xvfb를 결합한다. driver 자동 설치와 app/frontend log plugin 기능은 비활성화했다. |
| `tests/gui/specs/document-ux.e2e.ts` | HWP/HWPX 파일 입력, 한글 메뉴, 초기 숨김 toolbar, 쪽 수, 스크롤 viewport의 content box 기준 중앙 정렬과 scenario screenshot/manifest를 검증한다. |
| `tests/gui/support/document-fixture.ts` | `biz_plan.hwp`와 `form-002.hwpx`의 저장소 상대 경로·SHA-256을 고정하고 root 밖 symlink·빈 파일·hash drift를 거부한다. |
| `tests/gui/support/document-ux.ts` | selector, 쪽 수 parser, 중앙 정렬 판정과 native Save/Save As trigger 전후 상태 수집 hook을 플랫폼 중립 경계로 제공한다. |
| `tests/gui/support/evidence.ts` | build/run/app/driver identity, timestamp, fixture와 screenshot/log/생성 파일 hash를 JSON manifest로 만들고 경로·token을 정규화한다. |
| `tests/gui-contracts.test.mjs` | 입력 실패, fixture provenance, evidence 보안, UI parser, native dialog hook 순서, 공통 helper의 platform import 차단을 포함한 11개 계약을 고정한다. |
| `tests/gui/tsconfig.json` | Stage 2 TypeScript harness의 strict no-emit 검증 범위를 분리한다. 외부 WDIO declaration 간 충돌만 `skipLibCheck`로 격리한다. |
| `package.json`, `pnpm-lock.yaml` | WebdriverIO 9.29.1 계열, Tauri service 1.3.0과 TypeScript/Mocha type을 exact version으로 고정하고 `test:gui:contracts`, `test:gui:linux` entrypoint를 추가한다. |
| `mydocs/orders/20260814.md` | Stage 2 완료와 Stage 3 승인 대기 상태를 반영한다. |

신규 구현·test 파일은 모두 권장 300 LOC 상한 이내다. 가장 큰 파일은 contract test 156행, 공통 spec 146행, evidence helper 144행이다.

## 본문 변경 정도 / 본문 무손실 여부

제품 코드, Rust/Tauri binary, upstream submodule, 기존 workflow와 공식 제품 문서는 수정하지 않았다. WebDriver 전용 plugin이나 embedded provider를 제품 의존성에 추가하지 않았으며 기존 앱 동작은 그대로다. 기존 자동화 명령에는 신규 공통 계약 test만 추가했다.

## 검증 결과

실행 명령:

```bash
CI=true pnpm install --frozen-lockfile
pnpm exec tsc --noEmit -p tests/gui/tsconfig.json
pnpm run test:gui:contracts
pnpm run test:automation
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — frozen lockfile에서 workspace 3개와 479개 package를 재현했다.
- OK — GUI TypeScript strict no-emit 검사 통과.
- OK — 공통 GUI 계약 11/11 통과.
- OK — 전체 automation 173/173 통과.
- OK — Studio 21개 test file, 97/97 test 통과.
- OK — Studio production build 완료. 기존 Vite dynamic import/chunk-size warning 외 신규 오류 없음.
- OK — 제품 경계 검사 210개 파일 통과.
- OK — `git diff --check` 경고 없음.

최초 frozen install은 비대화형 `node_modules` purge 확인에서 중단됐고 `CI=true`로 재실행했다. 샌드박스 DNS 제한으로 package fetch가 막힌 뒤 허용된 네트워크에서 같은 frozen lockfile을 재실행해 성공했으며, 성공 이후 위 검증을 모두 다시 수행했다.

## 잔여 위험

- 현재 host에서는 설치된 Linux production DEB, Xvfb, `tauri-driver`와 WebKitWebDriver 세션을 실행하지 않았다. `test:gui:linux`의 실제 성공은 Stage 4 workflow merge 후 Stage 5 close gate에서 확정한다.
- 숨겨진 file input의 WebDriver file upload와 WebKitGTK screenshot/JavaScript geometry endpoint는 공식 기본 WebDriver 명령을 사용하지만 native runner에서 아직 측정하지 않았다.
- GTK file chooser, Save As, drag-in, PDF와 system print 조작은 의도적으로 Stage 3 adapter 범위에 남겼다. Stage 2는 해당 명령의 trigger 전후 document state를 수집하는 공통 hook만 제공한다.
- WDIO dependency의 외부 declaration은 TypeScript 6에서 선택적 다른 desktop provider type과 충돌하므로 `skipLibCheck`를 사용한다. 우리 harness 자체의 strict type 오류는 허용하지 않는다.

## 다음 단계 영향

- Stage 3은 `runNativeDocumentCommand`에 AT-SPI dialog adapter를 연결하고, `describeEvidenceFile`로 저장 결과·PDF·log hash를 같은 manifest에 추가한다.
- Linux native adapter는 `document-fixture.ts`, `document-ux.ts`, `evidence.ts`를 import하되 공통 helper가 Linux adapter를 역참조하지 않는 현재 방향을 유지한다.
- Stage 4 workflow는 `ALHANGEUL_GUI_*` 입력을 exact handoff 결과와 설치/driver version에서 구성하고 `pnpm run test:gui:linux`를 실행한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 Linux native dialog·PDF·system print adapter 구현으로 진행한다.
