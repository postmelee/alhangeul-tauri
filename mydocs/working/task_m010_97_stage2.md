# Task #97 Stage 2 완료보고 — 로컬 글꼴 조회 인덱스와 상태 무효화

GitHub Issue: [#97](https://github.com/postmelee/alhangeul-tauri/issues/97)
구현계획서: [`task_m010_97_impl.md`](../plans/task_m010_97_impl.md)
Stage: 2
기록일: 2026-10-03 (Asia/Seoul)
상태: Stage 2 검증 완료, Stage 3 진입 승인 대기

## 단계 목적

Stage 1에서 확인한 매 조회마다 전체 레코드를 만들고 별칭을 정규화하는 비용을 제거한다.
기존 face 선택, 읽기 실패·복구, 재감지·사용 설정 변경과 반환 객체 변경 격리 계약을 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| apps/studio-host/src/core/local-font-lookup.ts | 신규 75줄. catalog별 alias 후보·sourceKey 인덱스, 현재 후보 가용성 확인, 반환 객체 복사 |
| apps/studio-host/src/core/local-font-state.ts | 54줄, +6/-1. catalog 성공 시 인덱스 구축, 초기화 시 함께 폐기 |
| apps/studio-host/src/core/local-fonts.ts | 246줄, +4/-18. 인덱스 resolve/records/source 조회로 연결 |
| apps/studio-host/src/core/local-font-lookup.test.ts | 212줄, +55/-1. 기존 의미 회귀 12개 유지, 결정적 비용·정규화 중복·인덱스 수명 회귀 4개 추가 |
| mydocs/plans/task_m010_97.md, task_m010_97_impl.md | Stage 2 승인·완료 상태 기록 |
| mydocs/orders/20261003.md | Stage 2 완료·Stage 3 승인 대기 |
| 본 보고서 | 검증 결과와 같은 benchmark의 전후 비교·준비 비용·원시 표본 보존 |

## 본문 변경 정도 / 본문 무손실 여부

제품 변경은 위 local-font adapter·catalog 및 신규 조회 모듈에 한정한다.
provider, native font catalog/read, 허용 root, 제한 family, upstream, pin, lock, version,
공개 사이트와 릴리즈는 변경하지 않았다. 기존 공식 글꼴 문서는 승인된 Stage 4에서 최소 반영한다.
원래 checkout의 사용자 변경은 보존했다. 모든 수정은 local/task97의 분리 worktree에서 수행했다.

## 구현과 보존한 동작

- normalized catalog가 성공적으로 준비될 때 레코드를 한 번 변환하고 alias→후보 목록과
  sourceKey→원본 entry Map을 만든다. entries와 lookup은 같은 성공 경로에서 함께 게시된다.
- invalidation은 entries와 lookup을 함께 null로 바꿔 과거 인덱스를 회수한다. catalog 준비 전
  miss를 캐시하지 않으므로 같은 generation에서 늦게 준비된 catalog도 즉시 조회한다.
- 반복 resolve는 요청 이름만 정규화하고 그 이름의 후보만 검사한다. 관계없는 설치 글꼴 수에
  비례한 순회·객체 변환·alias 재정규화가 없다. 동일 이름 후보가 매우 많으면 그 후보 수만큼 비용이 든다.
- 후보의 file-backed path는 매 조회에서 현재 desktopFontUnavailable로 확인한다. provider의
  실패 Set이 generation 증가 없이 바뀌어도 즉시 제외하며 reset 후에는 다시 후보로 포함한다.
- 선택 순서는 기존 어댑터처럼 가용 후보가 하나면 선택, 그렇지 않으면 유일한 exact PostScript,
  다음 유일한 exact full name, 그 외 null이다. upstream의 다른 선택 우선순위를 도입하지 않는다.
- 같은 face의 서로 다른 alias가 동일 정규화 key를 만들면 후보 목록에는 한 번만 넣는다.
- 레코드·alias 배열은 결과를 반환할 때 복사한다. 반환 값을 수정해도 내부 인덱스는 오염되지 않는다.
  getLocalFontRecords의 전체 목록 반환은 현재 가용성 확인과 복사가 필요하므로 O(N)이다.
  반복 이름 조회에서는 선택한 레코드만 복사한다.
- bytes 공급 및 CSS 등록의 sourceKey→entry 재조회도 Map으로 연결한다. 기존 전체 find의
  fontEntryKey 재생성을 제거하며 선택한 face와 파일의 일치를 유지한다.
- 신규 모듈 75줄, adapter 246줄, state 54줄로 권장 파일 상한 300줄을 지켰다.
  신규 조회 모듈의 함수도 50줄·매개변수 5개 상한 이내다.

## 검증 결과

실행 명령:

```bash
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/local-font
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/local-font-lookup.test.ts
pnpm --filter @postmelee/alhangeul-studio-host exec vitest bench --run src/core/local-font-lookup.bench.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — 최초 글꼴 집중 검사 11 files / 77 tests, 신규 비용 회귀 추가 후 lookup 검사 16 tests.
  최종 전체 Studio 검사에 추가된 모든 회귀가 포함됐다.
- OK — 전체 Studio 39 files / 251 tests. 실제 upstream font-substitution/CanvasKit/session 연결,
  sourceKey bytes 재조회, 읽기 실패·복구·설정과 기존 제품 계약 회귀 통과.
- OK — upstream 39 tests, fail/skip 0. source/WASM/native pin 정합 유지.
- OK — 제품 경계 726 files scanned.
- OK — TypeScript + Vite 제품 Studio build, 294 modules transformed. 기존 CanvasKit Node module
  externalization, Tauri ineffective dynamic import와 large chunk 안내는 남아 있다.
- OK — 동일 benchmark 20조건, 조건당 측정 5회. 100 measured batches / 10,000 lookups를 확인했다.
- OK — diff whitespace 검사. Windows/Linux native·설치본 성능 수용은 Stage 3에서 수행한다.

결정적 성능 회귀는 catalog 100/1000개 각각에서 hit·한글 alias·모호한 이름·miss를 20회 반복한다.
총 80번 요청에서 정규화 호출은 요청 수 80번이고 레코드 변환은 0번이며 관련 없는 entry의 path
접근도 0번이다. 절대 ms 임계값을 성공 조건으로 사용하지 않는다. coalesced detection은 인덱스를
한 번만 구축하고 재사용하며, force·clear에서는 교체·해제하는 것을 확인했다.

파일 변경 명령의 첫 자동 권한 검토가 시간 제한으로 실행되지 않았다. 상태 확인 후 작은 명령으로
한 번 재시도해 정상 실행했고, 미실행 명령을 성공으로 간주하거나 일부 변경을 중복 적용하지 않았다.

## 같은 조건의 성능 비교

기준 제품 source는 Stage 1과 같은 v0.1.0/devel다. 개선본은 Stage 1 commit `40d15f5f` 위의
본 단계 소스다. Node v24.15.0, V8 13.6.233.17-node.48, Vitest 4.1.4, Apple M4 Pro arm64의
플랫폼 중립 Node 측정이며 native 앱은 실행하지 않았다. catalog와 조회 문자열, 100회 batch,
warm-up 및 측정 5회는 Stage 1 benchmark 파일 그대로다. 실제 host 글꼴은 읽지 않는다.

아래 값은 **100회 조회에 걸린 ms 중앙값**이다. 각 칸은 개선 전 → 개선 후다.
0개에서는 이름이 hit 조건이어도 실제 결과는 miss이며, 빈 catalog의 미세한 차이는 측정 노이즈 범위다.

| 레코드 수 | PostScript hit | 없는 이름 | 한글 alias hit | 모호한 family |
|---:|---:|---:|---:|---:|
| 0 | 0.052 → 0.048 | 0.037 → 0.037 | 0.267 → 0.248 | 0.135 → 0.144 |
| 100 | 34.018 → 0.044 | 34.418 → 0.033 | 34.571 → 0.242 | 33.725 → 0.155 |
| 500 | 168.208 → 0.123 | 169.157 → 0.028 | 168.476 → 0.268 | 166.756 → 0.146 |
| 1000 | 336.406 → 0.138 | 341.066 → 0.027 | 339.409 → 0.271 | 337.086 → 0.154 |
| 5000 | 1702.481 → 0.158 | 1713.157 → 0.022 | 1798.990 → 0.248 | 1729.912 → 0.147 |

한글 alias는 1,000개에서 339.409→0.271ms, 5,000개에서 1,798.990→0.248ms로 줄었다.
설치 레코드 수 증가에 비례하던 반복 조회 비용이 제거됐다는 함수 단위 근거다.
이 배율을 전체 앱 속도나 실제 Windows/Linux 응답성 개선 배율로 안내하지 않는다.
개선본은 매우 짧은 함수 측정이라 JIT·GC·타이머 노이즈의 상대 영향이 크다.

### 준비 비용과 개선본 원시 표본

인덱스 구축은 최초 catalog 준비에 포함된다. PostScript 조건의 준비 관찰은 1,000개에서
12.135→17.257ms, 5,000개에서 57.731→84.701ms였다. 각 준비값은 단발 측정이므로 정확한
오버헤드 수용값이 아니며, 실제 native scan·문서 열기 전체 비용을 포함하지 않는다.
첫 조회에서는 구축을 반복하지 않는다. 원시 준비·첫 조회·warm 측정은 아래에 보존한다.

| 레코드 | 조건 | catalog ms | first ms | warm batch ms 5회 |
|---:|---|---:|---:|---|
| 0 | postscript-hit | 0.987 | 0.215 | 0.043292, 0.047833, 0.068583, 0.056084, 0.039000 |
| 0 | missing | 0.040 | 0.011 | 0.038708, 0.036125, 0.038458, 0.036792, 0.036333 |
| 0 | korean-alias-hit | 0.034 | 0.200 | 0.247958, 0.230459, 0.231958, 0.257125, 0.256625 |
| 0 | ambiguous-family | 0.032 | 0.016 | 0.146375, 0.144000, 0.144250, 0.142917, 0.145334 |
| 100 | postscript-hit | 7.191 | 0.031 | 0.043583, 0.033542, 0.057750, 0.043791, 0.036416 |
| 100 | missing | 1.972 | 0.006 | 0.033291, 0.030333, 0.035541, 0.037541, 0.029334 |
| 100 | korean-alias-hit | 2.517 | 0.020 | 0.236334, 0.235166, 0.241666, 0.271250, 0.260375 |
| 100 | ambiguous-family | 1.869 | 0.012 | 0.139209, 0.137958, 0.156625, 0.154958, 0.162417 |
| 500 | postscript-hit | 8.768 | 0.012 | 0.126625, 0.125042, 0.123208, 0.122625, 0.122667 |
| 500 | missing | 9.021 | 0.014 | 0.027542, 0.026458, 0.026708, 0.049375, 0.028792 |
| 500 | korean-alias-hit | 8.511 | 0.027 | 0.248541, 0.262709, 0.279000, 0.274083, 0.268250 |
| 500 | ambiguous-family | 9.148 | 0.022 | 0.131292, 0.132541, 0.146500, 0.146541, 0.146000 |
| 1000 | postscript-hit | 17.257 | 0.019 | 0.175917, 0.132917, 0.139500, 0.127167, 0.137791 |
| 1000 | missing | 17.145 | 0.016 | 0.027542, 0.026833, 0.035791, 0.025375, 0.025375 |
| 1000 | korean-alias-hit | 16.559 | 0.022 | 0.270584, 0.265584, 0.269083, 0.298791, 0.274750 |
| 1000 | ambiguous-family | 17.534 | 0.027 | 0.190166, 0.145166, 0.153791, 0.155375, 0.151792 |
| 5000 | postscript-hit | 84.701 | 0.027 | 0.157625, 0.157709, 0.154208, 0.203750, 0.153125 |
| 5000 | missing | 89.045 | 0.020 | 0.023667, 0.022334, 0.022250, 0.022625, 0.022167 |
| 5000 | korean-alias-hit | 85.410 | 0.036 | 0.239250, 0.247625, 0.237084, 0.362708, 0.253542 |
| 5000 | ambiguous-family | 88.085 | 0.032 | 0.156250, 0.153209, 0.146208, 0.146625, 0.134417 |

## 잔여 위험

- 실제 Windows WebView2·Linux WebKitGTK의 열기·입력·스크롤 성능과 화면 글꼴 정합은 미검증이다.
  함수 결과만으로 사용자 환경의 GPU·Wayland 원인이나 전체 앱 개선을 확정하지 않는다.
- 인덱스 메모리와 일회성 구축 비용이 추가된다. 실제 font catalog와 문서 진입 비용은 Stage 3에서 확인한다.
- 같은 이름의 후보가 많은 경우에는 후보 가용성 순회가 남는다. 전체 설치 목록 순회와 구분한다.
- getLocalFontRecords 같은 전체 목록 API는 복사·가용성 검사 비용이 남는다. 이번 측정은 이름 resolver다.
- 기존 large chunk·dynamic import 빌드 경고는 이번 성능 개선의 수정 범위 밖이며 빌드는 성공했다.

## 다음 단계 영향

- Stage 3은 이 제품 변경으로 새 exact SHA의 Windows/Linux 후보를 생성해야 한다.
  기존 릴리즈/Task #74 설치본 수용을 새 코드의 수용 근거로 재사용하지 않는다.
- 실제 문서와 설치 글꼴 on/off로 열기·입력·스크롤 지연 및 원본 face 적용을 함께 확인한다.
- provider reset에서 catalog가 그대로여도 후보 가용성은 즉시 바뀌므로, GUI의 삭제/복구·재감지
  시나리오가 이 동작을 실제 공급·화면 갱신으로 확인해야 한다.
- 버전 갱신·공식 문서 수정·릴리즈 게시와 site 데이터 갱신은 승인된 후속 단계에서 수행한다.

## 승인 요청

Stage 2 산출물과 검증 결과를 승인하면 Stage 3 Windows/Linux 실제 편집 성능·기능 수용으로 진행한다.
