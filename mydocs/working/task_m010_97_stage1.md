# Task #97 Stage 1 완료보고 — 배포본 조회 기준선과 회귀 고정

GitHub Issue: [#97](https://github.com/postmelee/alhangeul-tauri/issues/97)
구현계획서: [`task_m010_97_impl.md`](../plans/task_m010_97_impl.md)
Stage: 1
기록일: 2026-10-03 (Asia/Seoul)
상태: Stage 1 검증 완료, Stage 2 진입 승인 대기

## 단계 목적

현재 공개 v0.1.0에 실제 존재하는 글꼴 조회 비용을 재현 가능한 함수 측정으로 고정하고,
인덱스 도입 시 유지할 글꼴 해석·실패·재감지·설정 전이의 의미 계약을 테스트로 보존한다.
이 단계는 제품 성능 수정이나 Windows/Linux 설치본 수용 단계가 아니다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| apps/studio-host/src/core/local-font-lookup.fixture.ts | 27줄, 호스트 글꼴을 읽지 않는 가상 family·face·한글 alias·경로 fixture |
| apps/studio-host/src/core/local-font-lookup.test.ts | 158줄, 실제 detect/resolve API의 의미·상태 전이 회귀 12개 |
| apps/studio-host/src/core/local-font-lookup.bench.ts | 81줄, 실제 adapter 20조건 × 5회 × 100조회, 준비·첫 조회와 warm 조회 분리 |
| mydocs/plans/task_m010_97.md, task_m010_97_impl.md | 구현계획·Stage 1 승인 및 완료 상태 기록, 실제 동작하는 집중 검사 명령으로 정정 |
| mydocs/orders/20261003.md | Stage 1 완료·Stage 2 승인 대기 반영 |
| 본 보고서 | 코드 경로, 성공 검증과 기준 성능·원시 측정값·한계 보존 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드·API·upstream source·pin·lockfile은 수정하지 않았다. 신규 fixture/test/bench와
작업 문서만 추가·갱신했다. 기존 사용자 작업 공간의 변경은 건드리지 않았다.
별도 worktree에서 submodule을 기존 exact pin으로 초기화했으며 최종 submodule status는 clean이다.

## 배포본과 현재 기준의 연결

- v0.1.0 resolved commit: `fc3cad15682f35723ab6558d1301e9096f7eec67`.
- 작업 시작 devel: `97550085a9334129062266dddb625798bcdc77e2`.
- 측정 시 HEAD: `189d0c82` (계획 문서 커밋; 제품 소스는 시작 기준과 같다).
- upstream v0.8.6: `f1f9c6ae58344ee9368996d3543f76b9345cf227`.
- `git diff v0.1.0 HEAD -- apps/studio-host/src/core apps/studio-host/vitest.config.ts
  apps/studio-host/local-font-overrides.ts third_party/rhwp`는 빈 출력이다.
  조회·provider·catalog뿐 아니라 해당 core와 import 연결·upstream pin이 배포 태그와 같다.
- pnpm-lock의 태그 대비 차이는 root 개발용 yaml 2.9.0 importer 3줄이다.
  실제 설치는 현재 frozen lock을 사용했고 lockfile을 변경하지 않았다.
- 초기 대화의 구 local/task69 함수 복사 측정값을 사용하지 않았다. 아래 결과는 실제 최신
  adapter를 import해 native catalog 응답만 대체한 새 측정이며 배포된 WebView 실행 측정은 아니다.

## 확인한 호출 경로와 병목

1. `local-fonts.ts:102`의 getLocalFontRecords는 매번 catalog를 가용성 filter한 뒤
   toLocalFontRecord로 객체·alias 배열을 재생성한다. sourceKey 생성도 반복된다.
2. `local-fonts.ts:110`의 resolveLocalFont는 위 전체 레코드의 별칭을 정규화해 검색한다.
   exact PostScript/full name 우선순위 판정도 후보에 대해 수행한다.
3. 실제 upstream v0.8.6의 `font-substitution.ts:401`과 `installedFaceName` 등의 경로는
   이 resolver를 사용한다. 제품 local-font-overrides 플러그인은 상대 import도 어댑터로 연결한다.
   없는 원본 글꼴의 표시 chain을 만들 때 원본·대체 후보 조회가 추가될 수 있다.
4. `wasm-bridge.ts`는 Canvas2D font setter에 substitution을 설치한다. 텍스트 측정에는
   lastFont 캐시가 있어 모든 글자마다 무조건 resolver를 호출한다고 단정하지 않는다.
5. `canvaskit-renderer.ts:3122`의 findPreparedTypeface는 준비된 Typeface 조회 전 resolver를
   호출한다. text replay·char overlap 및 fontDecisionEvidence에도 조회 경로가 있다.
6. upstream 자체 local-fonts는 buildLocalFontLookup의 이름별 Map을 사용하지만,
   실제 제품 어댑터의 resolver는 전체 순회를 사용한다. upstream을 복제·수정할 필요 없이
   어댑터 인덱스로 해결할 수 있는 범위가 확인됐다.

지속적인 편집 지연의 유력 원인이지만, OS font scan·실제 font parsing·WebView/GPU 렌더 비용은
이번 함수 측정에 포함되지 않는다. 사용자 제보의 모든 지연을 이 원인으로 확정하지 않는다.

## 고정한 의미·상태 회귀

- catalog 준비 전 miss를 같은 generation의 준비 완료 뒤까지 유지하면 안 된다.
- NFC, 대소문자, 공백 정규화 및 한글 alias를 유지한다. 임의의 @ 접두사 제거는 기존 계약이 아니다.
- 여러 후보에서는 정확한 PostScript, 그다음 유일한 full name을 사용하며 모호한 family는 null이다.
- 다른 파일의 동일 이름은 합치지 않고, 같은 파일·face의 다국어 행은 sourceKey를 유지하며 합친다.
- 파일 읽기 실패는 catalog/provider generation이 그대로여도 해당 file-backed 후보를 즉시 제외한다.
  제외 후 두 face의 모호한 family가 하나의 유효 face로 바뀔 수 있다.
- provider reset은 catalog를 교체하지 않고 실패 상태를 해제하므로 후보를 다시 사용할 수 있다.
- 강제 재감지, 사용 해제·재활성화는 과거 hit/miss를 남기지 않는다.
- 제한 family와 alias 정책을 보존한다.
- 반환된 record·aliases·목록을 호출자가 변경해도 다음 조회는 오염되지 않는 기존 동작을 보존한다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/local-font-lookup.test.ts src/core/local-font-names.test.ts src/core/local-font-lifecycle.test.ts src/core/local-font-state.test.ts src/core/local-font-consumers.test.ts
pnpm --filter @postmelee/alhangeul-studio-host exec vitest bench --run src/core/local-font-lookup.bench.ts
pnpm --filter @postmelee/alhangeul-studio-host exec tsc --noEmit
pnpm run check:product-boundary
git diff --check
git -C third_party/rhwp status --short
```

결과:

- OK — pnpm 10.33.0 frozen 설치. lock 변경 없음. 기존 설정에 의해 driver/esbuild install script가
  무시됐다는 안내는 있었지만 이번 Vitest·타입 검사는 통과했다. native driver 수용으로 해석하지 않는다.
- OK — 집중 검사 5 files, 31 tests. 신규 조회 12개와 기존 이름·수명·상태·실제 표시 소비자 회귀 통과.
- OK — 타입 검사 종료 코드 0.
- OK — 제품 경계 검사 725 files scanned.
- OK — benchmark 종료 코드 0, 20개 LOOKUP_BATCH와 각 5개 유한 측정값 확인.
  측정된 100 batches, 10,000 lookups; warm-up·준비·Tinybench probe는 이 합계에 포함하지 않는다.
- OK — diff whitespace 검사 및 submodule clean 확인. Windows/Linux native 검사·설치본 실행은 미실행이다.

검증 중 보정:

- 첫 신규 테스트는 기존 normalizeFontName이 @를 제거한다고 가정해 1개 실패했다.
  제품에 동작을 추가하지 않고 기존 공백/NFC 계약 입력으로 정정한 뒤 집중 검사를 통과했다.
- 계획의 `pnpm ... test -- <files>`는 내부 `vitest run -- <files>`로 전달되어 전체 테스트가
  선택됐다. 실제 집중 검사에 맞게 `exec vitest run <files>`로 명령을 정정했다.
- Vitest 4.1.4 benchmark runner는 suite beforeAll/afterAll을 실행하지 않아 최초 시도에서
  NaN 요약만 나왔다. 이를 측정 성공으로 처리하지 않았다. 설치된 runner/Tinybench 소스를
  확인하고 bench setup/teardown, throws=true와 표본 개수 검증으로 보정했다.
  최종 유효 결과는 보정 후 재측정한 아래 20개 조건이다.
- submodule 첫 clone은 연결 reset 후 자동 재시도로 완료했다. Git LFS 경고와 제한된 권한의
  임시 파일 오류는 권한이 있는 최종 상태 확인에서 해소됐으며 upstream 파일을 수정하지 않았다.

## 기준 성능

환경: Node v24.15.0, V8 13.6.233.17-node.48, Vitest 4.1.4, Apple M4 Pro arm64 로컬 Node.
이는 플랫폼 중립 TypeScript 함수 검증이다. 지원 범위 밖의 native 앱 빌드·실행은 하지 않았다.

각 조건은 별도 catalog 준비와 첫 조회 후 100회 조회의 warm-up batch 1회, 측정 batch 5회다.
Tinybench의 sync/async 판별용 호출은 표본에서 제외하고 마지막 5개 측정 batch를 기록한다.
가상 레코드는 Regular/Bold 2개씩 같은 family를 공유한다. 실제 host 글꼴은 읽지 않는다.
레코드 수는 family 수가 아니다. 0개 catalog에서는 hit로 이름 붙인 조건도 실제로는 miss다.
시간은 **100회 조회에 걸린 ms의 중앙값**이며 문서 열기나 화면 갱신 전체 시간이 아니다.

| 레코드 수 | PostScript hit | 없는 이름 | 한글 alias hit | 모호한 family |
|---:|---:|---:|---:|---:|
| 0 | 0.052 | 0.037 | 0.267 | 0.135 |
| 100 | 34.018 | 34.418 | 34.571 | 33.725 |
| 500 | 168.208 | 169.157 | 168.476 | 166.756 |
| 1000 | 336.406 | 341.066 | 339.409 | 337.086 |
| 5000 | 1702.481 | 1713.157 | 1798.990 | 1729.912 |

1,000개에서 hit/miss 모두 100회당 약 0.34초, 5,000개에서 약 1.7~1.8초다.
500→1,000→5,000개로 늘면 시간이 대체로 레코드 수에 비례한다. 선택한 글꼴이 없더라도
전체 목록을 생성·검색하는 구현과 일치한다. 빈 catalog의 비용은 훨씬 작다.
실제 입력/스크롤 중 초당 조회 횟수는 아직 측정하지 않았으므로 FPS나 체감 배율로 환산하지 않는다.

### 원시 표본과 준비 비용

아래 값은 ms이며 소수 셋째 자리로 반올림했다. catalog 준비는 가상 응답 정규화·정렬이며
native 디스크 scan이 아니다. first는 각 조건의 준비 직후 첫 조회다.

| 레코드 | 조건 | catalog | first | warm 측정 5회 |
|---:|---|---:|---:|---|
| 0 | postscript-hit | 0.895 | 0.181 | 0.039, 0.039, 0.083, 0.064, 0.052 |
| 0 | missing | 0.033 | 0.013 | 0.040, 0.037, 0.035, 0.036, 0.041 |
| 0 | korean-alias-hit | 0.027 | 0.168 | 0.276, 0.238, 0.258, 0.267, 0.274 |
| 0 | ambiguous-family | 0.031 | 0.017 | 0.127, 0.133, 0.140, 0.135, 0.141 |
| 100 | postscript-hit | 6.812 | 0.646 | 33.859, 34.018, 33.529, 34.230, 34.131 |
| 100 | missing | 1.313 | 0.552 | 33.750, 34.418, 34.876, 34.704, 33.202 |
| 100 | korean-alias-hit | 1.379 | 0.502 | 34.571, 35.030, 34.620, 34.408, 34.025 |
| 100 | ambiguous-family | 1.416 | 0.578 | 33.472, 33.725, 33.619, 33.780, 33.844 |
| 500 | postscript-hit | 5.991 | 2.305 | 168.208, 166.314, 166.200, 170.098, 168.320 |
| 500 | missing | 6.288 | 2.637 | 169.473, 169.157, 164.440, 164.882, 170.928 |
| 500 | korean-alias-hit | 6.071 | 2.160 | 166.381, 167.539, 168.598, 169.837, 168.476 |
| 500 | ambiguous-family | 6.412 | 2.355 | 168.793, 161.481, 164.635, 167.180, 166.756 |
| 1000 | postscript-hit | 12.135 | 4.241 | 336.406, 329.819, 337.425, 339.550, 335.117 |
| 1000 | missing | 11.722 | 3.950 | 341.066, 336.624, 341.207, 342.642, 338.416 |
| 1000 | korean-alias-hit | 12.157 | 3.946 | 339.409, 337.519, 329.927, 339.968, 342.721 |
| 1000 | ambiguous-family | 12.321 | 4.065 | 333.181, 334.083, 337.991, 337.086, 341.057 |
| 5000 | postscript-hit | 57.731 | 21.377 | 1692.957, 1702.481, 1704.766, 1692.853, 1723.342 |
| 5000 | missing | 59.002 | 22.187 | 1695.520, 1725.840, 1690.381, 1717.972, 1713.157 |
| 5000 | korean-alias-hit | 58.131 | 20.946 | 1798.990, 1790.917, 1805.300, 1781.628, 1805.910 |
| 5000 | ambiguous-family | 59.370 | 19.479 | 1728.832, 1746.276, 1724.692, 1734.901, 1729.912 |

## 잔여 위험

- Node 가상 catalog 결과는 native WebView와 실제 OS 설치 글꼴의 결과가 아니다. Windows/Linux
  실제 응답성·화면 정합과 사용자 Wayland 장비 재현은 Stage 3에서 별도 확인한다.
- 표본은 조건당 5회다. 이름 길이·별칭 수·다른 프로그램 부하에 따라 수치는 달라질 수 있다.
- Stage 2 인덱스가 반환 객체를 그대로 노출하면 기존 public record 변경 격리 계약이 깨질 수 있다.
  내부 인덱스는 보호하고 반환 비용은 후보 레코드에 한정해야 한다.
- 실패 상태는 generation만으로 표현되지 않는다. stale 성공뿐 아니라 실패 후보를 제외한 뒤
  유일해지는 이름과 provider reset 후 다시 모호해지는 이름까지 유지해야 한다.

## 다음 단계 영향

- Stage 2는 새 fixture/벤치와 동일 조건으로 재측정한다. 전체 catalog 구축은 준비에 한정하고
  반복 조회에서는 정규화 요청과 같은 이름 후보만 처리한다.
- 기존 우선순위를 임의로 upstream 방식에 맞추지 않는다. 어댑터 계약을 12개 회귀로 유지한다.
- 결정적 성능 회귀를 추가해 같은 catalog의 반복 hit/miss가 전체 변환·정규화를 재실행하지
  않음을 확인한다. 절대 시간만으로 CI 성공을 결정하지 않는다.
- 이번 단계에서는 제품 코드·version·릴리즈·updater·사이트를 변경하지 않았다.

## 승인 요청

Stage 1 산출물과 검증 결과를 승인하면 Stage 2의 조회 인덱스·무효화 구현으로 진행한다.
