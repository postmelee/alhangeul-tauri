# Task #50 Stage 2 — Core probe required gate 강화

GitHub Issue: [#50](https://github.com/postmelee/alhangeul-tauri/issues/50)
구현계획서: [`task_m010_50_impl.md`](../plans/task_m010_50_impl.md)
Stage: 2
검증일: 2026-08-31

## 단계 목적

record가 있고 120초 timeout만 없으면 통과하던 core probe를 보정한다.
고정 fixture별 렌더 기대값, process exit, metric 유효성, 성공 render의
1,500 ms·256 MiB peak RSS 예산과 전체 조합의 완전성을 필수 판정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/linux-thumbnail-core-fixtures.mjs` | 52 LOC; pin·원본 7개·변형 4개 SHA/size, 독립 direct/preview 기대값, 88개 조합, manifest 식별값 |
| `scripts/linux-thumbnail-core-summary.mjs` | 135 LOC; JSON parse, 식별·process·render·budget 분리 판정, schema 2 summary와 실패 exit |
| `scripts/benchmark-linux-thumbnail-core.sh` | 216 LOC; 5초 timeout·1초 kill 유예, JSON 오류 구분, 고정 source 및 UTC ZIP 변형, summary 모듈 연결 |
| `tests/linux-thumbnail-core-probe.test.mjs` | 254 LOC; 원본 pin/hash, 88개 조합, 경계·음성 사례와 실제 CLI exit 테스트 |
| `tests/actions-workflows.test.mjs` | 기존 diagnostic upload 뒤 required outcome gate의 실패 전파 계약 보강 |
| `mydocs/plans/task_m010_50_impl.md`, `mydocs/orders/20260831.md` | 승인, 독립 기대값 근거, timezone 보정 및 단계 상태 |

기존 workflow의 probe `continue-on-error` → outcome 기록 → always upload →
required gate 연결을 그대로 사용한다. workflow YAML을 변경할 필요는 없었다.
`continue-on-error` step의 표시상 conclusion 대신 실제 outcome을 필수 검사한다.

## 본문 변경 정도 / 본문 무손실 여부

- 공유 renderer, `third_party/rhwp`, 원본 fixture, Windows handler 및 installer를 변경하지 않았다.
- 세 positional input과 128/256/512/1024 edge, direct/preview의 독립 process 계측, 원본 SHA·size·mtime 불변 검사를 유지했다.
- helper의 1,500 ms deadline 및 256 MiB `RLIMIT_AS`는 변경하지 않았다. peak RSS는 실제 사용 물리 메모리 계측이며 가상 주소공간 제한인 `RLIMIT_AS`와 동등하지 않다.
- 제품/운영 공식 문서는 Stage 5에 남겼다. 계획서의 기존 범위와 단계는 유지했다.
- 신규 모듈의 선언 함수는 최대 23 LOC, 매개변수 3개, 일반 분기 기준 복잡도 7로 권장 상한 이내다.

## 검증 결과

### 독립 fixture 기대값

관측된 `result.success`를 기대값으로 복사하지 않았다. 현재 pin의 원본 7개
SHA·size를 확인하고, CFB/ZIP 안의 PNG를 별도 읽어 SHA와 chunk CRC를 검사했다.

| 대상 | 수 | direct | preview | 독립 근거 |
|---|---:|---|---|---|
| 정상 HWP | 3 | true | true | `/PrvImage` PNG CRC 유효; 707×1024 또는 724×1024 |
| 정상 HWPX | 4 | true | false | 동일한 68-byte 내장 PNG의 IDAT CRC 손상; 문서 direct 성공은 별도 요구 |
| preview-absent | 1 | true | false | 고정 원본의 `Preview/PrvImage*` 제거 |
| preview-stale | 1 | true | true | 문서와 다른, CRC 유효한 1×1 PNG 주입 |
| corrupt-truncated | 1 | false | false | 고정 원본의 첫 128 bytes |
| size-boundary-64mib-plus-one | 1 | false | false | 67,108,865 zero bytes의 독립 SHA |

각 fixture를 4 edge와 2 mode로 검사한다. 88개 중 성공 기대 52개, 거부 기대
36개다. 정상 direct 실패를 preview 성공으로 덮지 않으며, 거부 기대 record도
process exit 0·timeout false·유효한 metric을 만족해야 한다.

### 플랫폼 중립

```bash
node --test tests/linux-thumbnail-core-probe.test.mjs tests/actions-workflows.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/benchmark-linux-thumbnail-core.sh
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

- 관련 계약 테스트: **66 pass, 0 fail**.
- 전체 automation: **389 pass, 0 fail**.
- Product boundary: **310 files scanned, passed**.
- ShellCheck, Actionlint, diff whitespace: OK.
- 1,500/1,501 ms와 268435456/268435457 bytes의 inclusive 경계를 검사했다.
- nonzero/missing/string exit, timeout 누락, 결과 반전, 잘못된 bitmap, invalid JSON, 빈 입력, unknown SHA·mode·edge, 누락/중복 조합, 잘못된 pin, 누락/NaN/Infinity/음수 metric 및 RSS 0을 거부했다.
- CLI를 실제 child process로 실행해 성공 exit 0, 의미 실패·malformed NDJSON·빈 입력 exit 1을 확인했다. 실패 JSON은 exit 전에 보존하고 malformed 원문은 포함하지 않는다.

### Exact Linux native candidate

- 기준 `devel`: `8b865fa55b55aea232d0fb034a518c807ac4c003`
- source/workflow candidate: `f228a601520266229eaeb75e6d46bea8d8f25cc9`
- rhwp pin: `496333b27d21ddb9114ba9ae340bcb895870c9a7`
- manifest: `sha256:c35cbac285efc37684abcf1ca7bc40b6d52ce262f4169a0d9228daa2b34d9dff`
- [Native run 33374841115](https://github.com/postmelee/alhangeul-tauri/actions/runs/33374841115), attempt 1, `run_tests=true`.

| 환경 | record / 기대 일치 | wall p95 / max (전체) | 성공 render peak RSS max | required core gate |
|---|---:|---:|---:|---|
| Ubuntu 22.04 x64 | 88 / 88 | 71 / 164 ms | 46,784,512 bytes (44.62 MiB) | 성공 |
| Ubuntu 22.04 arm64 | 88 / 88 | 49 / 127 ms | 44,691,456 bytes (42.62 MiB) | 성공 |

각 환경에서 52개 성공 render와 36개 의도된 거부가 모두 기대와 일치했다.
전체 record의 RSS p95/max는 x64 70,778,880 bytes, arm64 69,992,448 bytes다.
이 전체 통계는 oversize 음성 fixture도 포함한 진단값이며, 성공 render마다의
예산 판정을 대체하지 않는다. 모든 record에서 exit 0, timeout false와 유효 metric을 확인했다.

| 진단 artifact | ID | Artifact SHA-256 |
|---|---|---|
| [x64 core](https://github.com/postmelee/alhangeul-tauri/actions/runs/33374841115/artifacts/9751578785) | `9751578785` | `84738aed5b812844d6901ac1ac14270d7b5fc4d0050187192d4744b715e5ec16` |
| [arm64 core](https://github.com/postmelee/alhangeul-tauri/actions/runs/33374841115/artifacts/9751585122) | `9751585122` | `f2d7ce89f9ff857fb60997b322588ca5afd609f3153e1eed5688145db2ac5f68` |

두 artifact의 `thumbnail-core-summary.json`, `step-outcomes.json`,
`workflow-context.json`을 내려받아 exact SHA·run·architecture·manifest를 대조했다.
88개 raw record도 같은 판정기로 다시 평가해 모두 통과했다. artifact 보존 기간은 14일이다.

### 검증 중 보정과 실패 전파 확인

- 최초 candidate `559d86c` / [33374325816](https://github.com/postmelee/alhangeul-tauri/actions/runs/33374325816)의 dispatch 후 ZIP 헤더를 재검토했다. `touch`에만 UTC를 주면 `zip`은 로컬 timezone의 DOS timestamp를 써서 09:00/00:00 SHA가 달라졌다.
- arm64는 stale-preview 8개 조합의 SHA 불일치를 unknown/missing으로 거부했다. 실패 summary, 실제 `probe=failure`, diagnostic upload 성공 및 required gate 실패가 모두 기록됐다.
- `zip`에도 UTC를 고정하고 1980-01-01 00:00 헤더의 독립 SHA로 수정했다. direct/preview 기대값, wall/RSS 한도는 낮추지 않았다.
- 실패 진단 확보 후 이전 실행의 나머지는 취소하고, 새 exact SHA로 두 Linux core를 재실행했다. 이전 record 재평가는 원인 진단에만 사용했으며 최종 수용 근거는 새 실행이다.
- Stage 1의 [33370108591](https://github.com/postmelee/alhangeul-tauri/actions/runs/33370108591)은 이후 Windows build·installer smoke까지 전체 성공으로 종료됐다.

## 잔여 위험

- 이번 Stage의 필수 범위는 Linux x64·arm64 core probe다. 보고 시점에 같은 실행의 후속 Linux helper/desktop/package 및 Windows 추가 CI는 진행 중이다. 전체 workflow 통과로 표현하지 않는다.
- 고정 공개 sample과 변형의 렌더 성공·resource gate이며 모든 사용자 문서의 시각적 완전성을 보증하지 않는다. 실제 문서의 파일 관리자 캡처는 Stage 4다.
- rhwp pin이나 fixture/변형 recipe가 바뀌면 manifest를 독립 재검토해야 한다. 새로운 관측값으로 기대값을 자동 갱신하지 않는다.
- 조상 symlink 경로 정책은 아직 변경하지 않았다. Stage 3의 별도 승인 대상이다.

## 다음 단계 영향

- Stage 3에서 조상 symlink를 허용하되 마지막 입력·출력 symlink와 안전한 경로 계약을 보존하고 Linux Rust test/Clippy로 검증한다.
- 이후 core artifact는 schema 2, manifest 및 88개 조합을 만족해야 한다. 예전 nonempty/no-timeout 요약을 전체 성공 근거로 재사용하지 않는다.
- source candidate는 승인된 native 검증 예외로 먼저 기록했다. 검증 증적과 단계 상태를 완료 커밋으로 묶는다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 검토한 뒤 Stage 3 진입 승인을 요청한다.
- 승인 전 Stage 3 소스 변경, PR 게시, release 또는 이슈 close는 진행하지 않는다.
