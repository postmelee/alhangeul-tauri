# Task #13 Stage 1 보고서 — Studio override 소유 계약과 drift guard

GitHub Issue: [#13](https://github.com/postmelee/alhangeul-tauri/issues/13)
구현계획서: [`task_m010_13_impl.md`](../plans/task_m010_13_impl.md)
Stage: 1

## 단계 목적

현행 `apps/studio-host`의 31개 upstream alias를 소유 책임과 최종 처분 기준으로 분류하고, 이후 Stage가 전체 Studio 복제본을 다시 늘리지 못하도록 exact upstream pin·read-only submodule·최종 금지 shadow 계약을 자동 검사한다. 이 Stage에서는 alias가 만드는 replacement 순서와 runtime 동작을 바꾸지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/alhangeul-overrides.ts` | 31개 alias를 `native-host` 6개, `font-policy` 4개, `product-ux` 3개, `legacy-upstream-copy` 18개로 분류하고 transition/removal Stage와 최종 disposition을 typed spec으로 기록했다. 기존 alias 생성은 같은 spec의 `id`에서 파생한다. |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | alias 수·중복·소유자별 목록·최종 leaf adapter·금지 shadow·entry 교체 대상과 `rhwp v0.8.2` resolved commit/gitlink/submodule clean 상태를 검사한다. |
| `apps/studio-host/package.json` | Node API를 사용하는 Vite override 설정과 boundary test의 직접 타입 의존성으로 `@types/node`를 개발 의존성에 추가했다. |
| `apps/studio-host/tsconfig.json` | clean install에서도 Node builtin import를 타입 검사하도록 `types: ["node"]`를 명시했다. |
| `pnpm-lock.yaml` | `@types/node`와 전이 타입 의존성을 lockfile에 고정했다. |

`alhangeul-overrides.ts`는 165 LOC, focused boundary test는 135 LOC다. 두 파일 모두 권장 300 LOC 상한 이하다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이므로 문서 본문 무손실은 해당 없다. runtime alias는 기존 31개 ID의 순서와 `@/{id}` → local replacement 계산을 그대로 유지했다. 이번 Stage는 metadata와 read-only guard만 추가했으며 UI, native command, document save, renderer 동작은 변경하지 않았다.

구현계획서 예상 파일 외에 `package.json`, `tsconfig.json`, `pnpm-lock.yaml`을 함께 수정했다. 분리 worktree의 clean install에서 새 test가 기존 Node builtin import까지 타입 검사하면서 누락된 직접 타입 의존성이 드러났고, runtime dependency나 bundle 동작을 늘리지 않는 개발 타입 선언으로 보정했다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/upstream-boundary.test.ts
pnpm --filter @postmelee/alhangeul-studio-host test -- src/core/upstream-boundary.test.ts
pnpm run check:product-boundary
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — focused upstream boundary: 1 file, 3 tests passed.
- OK — 구현계획서의 filtered test 명령과 전체 Studio suite: 22 files, 117 tests passed.
- OK — product boundary: 186 files scanned, violation 0.
- OK — TypeScript와 Vite production build: 181 modules transformed, build completed.
- OK — `git diff --check`: whitespace error 0.
- 참고 — Vite가 기존 unresolved dark icon asset과 500 kB 초과 chunk를 경고했으나 build는 성공했고 이번 metadata/test 변경과 무관하다.

## 잔여 위험

- typed spec은 목표 계약만 고정한다. `remove-shadow` 대상 파일과 alias는 Stage 2~3에서 실제 제거해야 한다.
- Stage 2에서 upstream embed runtime leaf wrapper가 새 허용 adapter로 추가되면 31개 전환 결과와 함께 spec/test를 명시적으로 갱신해야 한다.
- Windows/Linux native 동작은 이 metadata-only Stage의 검증 대상이 아니며 Stage 6 수용 gate 전에는 성공으로 주장하지 않는다.

## 다음 단계 영향

- Stage 2는 local `index.html`·`src/main.ts`를 upstream entry로 교체하고 Stage 2 `remove-shadow` 대상 UI/view/style alias를 제거한다.
- `ui/about-dialog`은 전체 복제 대신 Alhangeul version만 보충하는 leaf adapter로 유지한다.
- Vite/Vitest alias는 계속 `alhangeulOverrideSpecs`에서 파생하며, 새 alias나 분류 변경은 boundary test를 함께 갱신해야 한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 exact upstream Studio entry 전환으로 진행한다.
