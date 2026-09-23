# Task #20 Stage 3.1 완료보고서 — platform unknown fixture 명시

GitHub Issue: [#20](https://github.com/postmelee/alhangeul-tauri/issues/20)
구현계획서: [`task_m010_20_impl.md`](../plans/task_m010_20_impl.md)
Stage: 3.1

## 단계 목적

Stage 3 최초 exact SHA의 Windows/Linux Actions에서 드러난 platform unknown test의 host 의존성을 제거한다. 제품 detector나 direct print 동작은 변경하지 않고, unknown 입력을 runner 전역 navigator와 분리된 명시 fixture로 고정한 뒤 새 exact SHA에서 Stage 4 전체 수용을 다시 시작할 수 있게 하는 것이 이번 보정의 완료 기준이었다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/platform.test.ts` | `undefined`로 default parameter를 발동하던 unknown assertion을 빈 `platform`·`userAgent`를 가진 명시 navigator fixture로 교체했다. |
| `mydocs/plans/task_m010_20_impl.md` | 최초 exact SHA, 실패한 CI/native run, 원인, 승인된 최소 보정과 새 exact-SHA 전체 재검증 절차를 Stage 3.1로 기록했다. |

## 본문 변경 정도 / 본문 무손실 여부

제품 source와 공식 문서는 수정하지 않았다. Windows `navigator.platform`, Windows user agent fallback, Linux, macOS 형태의 unknown과 Tauri runtime 판정 test는 그대로 유지했다. 마지막 “신호 없음” assertion의 입력 표현만 전역 navigator를 읽지 않는 구조체로 바꿨다.

최초 exact SHA `85ab350ccb55f5d4ef1e616de95c96e267ee0e8e`의 [CI run 32692284752](https://github.com/postmelee/alhangeul-tauri/actions/runs/32692284752)와 [native run 32692278112](https://github.com/postmelee/alhangeul-tauri/actions/runs/32692278112)은 수용 증거에서 폐기한다. 두 run 모두 checkout·frozen install·upstream test는 통과했지만 `platform.test.ts:32`에서 Linux는 `linux`, Windows는 `windows`를 반환해 Studio test에서 중단됐고 native build artifact는 생성되지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/platform.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — focused 명령이 Studio suite 21개 파일, 110개 test를 실행했고 모두 통과했다.
- OK — `test:studio`가 21개 파일, 110개 test를 실행했고 모두 통과했다.
- OK — `tsc && vite build`가 type error 없이 213개 module을 변환해 production Studio bundle을 생성했다.
- OK — build의 dynamic import·500 kB chunk warning은 기존 non-blocking bundle warning이며 fixture 보정 오류는 없다.
- OK — `check:product-boundary`가 225개 파일을 검사해 violation 없이 통과했다.
- OK — 제거 대상 이름은 negative contract 두 파일을 제외한 production/test/공식 문서에 다시 나타나지 않았다.
- OK — `git diff --check`가 빈 출력으로 통과했다.

## 잔여 위험

- 이 보정은 macOS의 플랫폼 중립 gate만 통과했다. 새 exact SHA가 Windows/Linux runner 전역 navigator와 독립적으로 같은 test를 통과하는지는 Stage 4 재실행으로 확인해야 한다.
- 최초 candidate는 Studio test 전에 중단돼 Rust test·Clippy·Tauri build와 GUI lifecycle 수용 근거를 제공하지 않는다.

## 다음 단계 영향

- 본 Stage 3.1 커밋을 `publish/task20`에 fast-forward하고, 새 exact SHA에서 CI와 native workflow를 모두 새로 dispatch한다.
- 실패한 run을 rerun하거나 artifact 근거로 재사용하지 않는다. 새 native run이 성공한 뒤에만 Linux GUI acceptance와 Windows GUI handoff를 진행한다.

## 승인 요청

- 작업지시자가 승인한 Stage 3.1 최소 보정과 새 exact-SHA 전체 재검증 범위에 따라 Stage 4를 계속 진행한다.
