# Task #14 Stage 1 완료보고서 — Windows thumbnail 계약과 resource budget

GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 1

## 단계 목적

Windows Explorer thumbnail 구현 전에 pinned `rhwp`의 첫 페이지 direct render와 embedded preview 동작을 Windows x64에서 계측하고, untrusted document 처리에 필요한 resource 상한을 확정하는 단계다.

정상 HWP/HWPX와 preview 없음·stale preview·손상·64 MiB+1 파생 fixture를 독립 process로 실행했다. disposable HKCU Registry64 namespace에서는 active ProgID, extension ShellEx와 `SystemFileAssociations`의 실제 lookup precedence를 관찰했다. 결과를 worker 경계, IPC frame, registry owner path와 installer rollback 계약에 반영했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/benchmark-thumbnail-core.ps1` | PowerShell 5.1 Windows x64 probe. fixture 원본 불변 검증, 독립 process 시간·peak working set, SVG/preview metadata, 파생 fixture와 disposable registry precedence를 JSON으로 기록한다. |
| `tests/thumbnail-core-probe.test.mjs` | probe의 BOM·입력·privacy·resource·registry cleanup·파일/함수 크기 계약 8개를 고정한다. |
| `.github/workflows/alhangeul-desktop.yml` | Windows x64에서 pinned `rhwp` probe를 build/run하고 exact SHA context와 outcome을 14일 artifact로 항상 보존한 뒤 최종 gate로 실패를 전달한다. |
| `tests/actions-workflows.test.mjs` | probe build/run/outcome/upload/gate 순서, Windows 전용 조건, exact SHA와 artifact 보존 계약을 검증한다. |
| `package.json` | probe 계약 테스트를 `test:automation` inventory에 추가한다. |
| `mydocs/plans/task_m010_14_impl.md` | 실측 resource budget, 64-byte IPC header, registry precedence·owner path와 snapshot/conditional restore 순서를 확정한다. |
| `mydocs/orders/20260824.md` | Stage 1 완료·Stage 2 승인 대기로 갱신한다. |
| `mydocs/working/task_m010_14_stage1.md` | Stage 1 구현·Windows 증적·결정·잔여 위험을 기록한다. |

### 확정 resource budget

| 항목 | 확정 상한 | Windows 실측 근거 |
|---|---:|---|
| 입력 stream | 64 MiB | 정상 최대 426,496 B. 64 MiB+1은 모든 경로 실패 |
| 요청 `cx` | 1–1024 px | 최종 BGRA 1024²와 결속 |
| SVG | 16 MiB | 최대 1,292,217 B |
| preview compressed bytes | 16 MiB | 최대 72,948 B |
| preview decoded pixels | 16,777,216 px | 최대 741,376 px |
| 최종 BGRA pixels | 1,048,576 px | 1024 × 1024 |
| IPC bitmap payload / 전체 frame | 4,194,304 B / 4,194,368 B | BGRA payload + 고정 64 B header |
| worker committed memory | 256 MiB | 정상 direct peak working set 최대 13,377,536 B; 전체 probe 최대 138,240,000 B |
| direct / 전체 deadline | 1,500 / 2,000 ms | 정상 direct 최대 81 ms, 정상 bench 최대 385 ms |

64 MiB+1 preview process가 peak working set 138,240,000 B까지 증가했으므로 입력 stream cap은 COM DLL에서 worker spawn 전에 적용한다. worker commit과 probe working set은 동일 지표가 아니므로 256 MiB Job limit의 실제 accounting·종료는 Stage 3 native test에서 다시 검증한다.

### registry와 installer 결정

disposable candidate를 모두 등록했을 때의 관찰 결과는 다음과 같다.

| 관찰 상태 | 선택된 handler |
|---|---|
| active ProgID + extension + `SystemFileAssociations` | active ProgID |
| extension + `SystemFileAssociations` | extension ShellEx |
| `SystemFileAssociations`만 | `SystemFileAssociations` |

따라서 association owner path는 `.hwp`·`.hwpx` extension 아래 thumbnail category ShellEx default value로 제한한다. active ProgID와 `SystemFileAssociations`는 쓰지 않으며, 기존 active ProgID handler가 있으면 그것이 계속 우선한다.

MSI는 HKLM/Registry64, NSIS per-user는 HKCU/Registry64에서 `snapshot -> CLSID -> extension handler -> SHChangeNotify` 순서로 적용한다. upgrade는 기존 원본 snapshot을 덮어쓰지 않는다. rollback/uninstall은 현재 값이 Alhangeul CLSID일 때만 원래 value kind/data 또는 부재 상태를 복원하고, 제3자가 바꾼 값은 보존한다.

## 본문 변경 정도 / 본문 무손실 여부

코드·테스트·내부 계획 문서 작업이다. 제품 공식 문서는 수정하지 않았고 `third_party/rhwp` gitlink와 내용도 변경하지 않았다.

기존 desktop workflow의 matrix·bundle·installer smoke 순서는 보존하고 Windows build 앞에 diagnostic probe 단계만 추가했다. fixture artifact에는 hash·size·mtime·resource metadata만 기록하고 이름, 절대 경로, 문서 본문은 기록하지 않는다.

## 검증 결과

구현계획서의 Stage 1 필수 로컬 명령:

```bash
node --test tests/thumbnail-core-probe.test.mjs tests/actions-workflows.test.mjs
pnpm run check:rhwp-pin
git diff --check
```

결과:

- OK — targeted Node test 21/21 통과
- OK — `rhwp v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 pin 검증 통과
- OK — `git diff --check` 출력 없이 종료 코드 0

추가 회귀 검증:

```bash
pnpm run test:automation
```

- OK — automation 계약 210/210 통과

Windows x64 exact-SHA 명령:

```powershell
cargo build --manifest-path third_party/rhwp/Cargo.toml --bin rhwp --release
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/benchmark-thumbnail-core.ps1 `
  -RhwpBinary third_party/rhwp/target/release/rhwp.exe `
  -FixtureRoot third_party/rhwp/saved `
  -OutputDirectory diagnostics/thumbnail-core
```

GitHub Actions 증적:

- run: [32694691244](https://github.com/postmelee/alhangeul-tauri/actions/runs/32694691244)
- Windows job: `97334510757`
- exact SHA: `a12e7b77e425d49b9773cd7f493499ac7bc0fd51`
- runner: Windows NT `10.0.26100.0`, AMD64
- artifact: `alhangeul-windows-x64-thumbnail-core`, ID `9508625891`, 3,269 B, 만료 `2026-09-07T05:57:01Z`
- artifact digest: `sha256:92e84b3f4dd8ad4bcf74c82e6d90fcfc8d8e85855b8e340e9c2fdae0665617b4`
- outcome: build/probe/upload/final gate 모두 success, summary status `passed`
- fixture: 정상 7개 + 파생 4개, 33개 process memory sample 모두 0보다 큼
- 동작: preview 없음에서도 direct 성공, stale preview와 무관하게 direct 성공, 손상·64 MiB+1은 실패, 원본 hash·size·mtime 불변

진단 보정 과정에서는 null/0 memory sample, hard-coded registry 기대와 `ASSOCSTR_DEFAULTICON(15)` 오사용을 artifact로 확인했다. 최종 script는 native `GetProcessMemoryInfo`와 `ASSOCSTR_SHELLEXTENSION(16)`을 사용하며 위 exact SHA에서 재검증했다.

## 잔여 위험

- 정상 fixture 7개는 pinned upstream sample이며 복잡한 실사용 문서 분포 전체를 대표하지 않는다. byte/pixel/deadline cap은 보수적 headroom을 두고 Stage 3·6에서 실제 worker와 Explorer로 재검증한다.
- Stage 1은 CLI process baseline이다. worker spawn, pipe, SVG raster, cold font와 Explorer 동시 요청 비용은 Stage 3·6에서 측정한다.
- peak working set은 Job Object의 committed memory accounting과 동일하지 않다. 256 MiB process limit과 초과 종료는 Stage 3 Windows native test가 필요하다.
- registry probe의 dummy CLSID는 실제 COM DLL이 아니므로 `IShellItemImageFactory` activation은 예상대로 `0x80040154`를 반환했다. lookup precedence만 확정했으며 실제 bitmap activation은 Stage 3·4·6에서 검증한다.
- 현재 macOS host에서 Windows COM, registry, Tauri native build 성공을 주장하지 않는다. Windows 근거는 위 exact-SHA GitHub runner artifact로 한정한다.

## 다음 단계 영향

- Stage 2는 확정된 byte/pixel/frame 상한을 공유 `limits`와 protocol decoder test에 그대로 반영한다.
- Stage 2 direct API는 preview 없음·stale preview에서도 first-page direct 결과가 우선되는 fixture 계약을 고정한다.
- Stage 3 worker는 입력 64 MiB 초과를 spawn 전에 거부하고 256 MiB Job process limit, 1,500/2,000 ms deadline과 4,194,368 B frame cap을 적용한다.
- Stage 4 installer는 extension ShellEx만 등록하고 active ProgID·`SystemFileAssociations`를 쓰지 않으며 snapshot/conditional restore transaction을 구현한다.
- 임시 remote ref `codex/task14-stage1-probe`는 성공 artifact 회수와 본 보고 반영 뒤 제거한다. Stage 2는 `local/task14`에서만 진행한다.

## 승인 요청

- Stage 1 산출물, 확정 resource budget, extension ShellEx owner path와 installer transaction을 승인하면 Stage 2의 공유 document preview core와 desktop adapter 분리로 진행한다.
