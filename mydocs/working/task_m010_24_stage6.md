# Task #24 Stage 6 보고서 — v0.8.4 최종 수용 경계 확정

GitHub Issue: [#24](https://github.com/postmelee/alhangeul-tauri/issues/24)
구현계획서: [`task_m010_24_impl.md`](../plans/task_m010_24_impl.md)
Stage: 6

## 단계 목적

Stage 5까지의 Windows/Linux native 수용과 공식 증적을 final canary head에 고정하고,
Stage 3 native accepted SHA 이후 경로를 감사한다. 실행 코드·workflow·generated artifact
변경이 없을 때 기존 native matrix를 계승하고 Task #24 PR에 전달할 최종 Go/No-Go 경계를
확정한다.

## 산출물

| 파일·원격 증거 | 변경·결과 요약 |
|---|---|
| `publish/task24` Stage 5 head | `73cda55ffa3950b4c7cb04c3464ca07a176d8807`을 non-force fast-forward push했다. |
| [Alhangeul CI #31814890022](https://github.com/postmelee/alhangeul-tauri/actions/runs/31814890022) | `workflow_dispatch`, `publish/task24`, Stage 5 exact head에서 Unit tests job `94814078265` 전체 성공 |
| native path audit | Stage 3 accepted SHA `88baa5666ec55bf043844bae01ec4d422278851c` 이후 변경이 계획서·공식 증적·오늘할일·Stage 보고서 8개 경로뿐임을 확인했다. |
| `mydocs/working/task_m010_24_stage6.md` | 최종 CI, native 계승 판정, single-release·플랫폼 제한과 PR handoff를 기록했다. |

### Final CI exact-SHA 확인

| 항목 | 값 |
|---|---|
| Event | `workflow_dispatch` |
| Branch | `publish/task24` |
| Head SHA | `73cda55ffa3950b4c7cb04c3464ca07a176d8807` |
| Job | Unit tests `94814078265` |
| Conclusion | `success` |
| 범위 | 제품 경계·version·release metadata·rhwp pin, automation·upstream·Studio test, Studio build, Ubuntu desktop Rust test·Clippy |

### Native accepted SHA 이후 path audit

```text
M docs/architecture/UPSTREAM.md
M docs/operations/DESKTOP_RELEASE.md
M mydocs/orders/20260813.md
A mydocs/orders/20260815.md
M mydocs/plans/task_m010_24_impl.md
A mydocs/working/task_m010_24_stage3.md
A mydocs/working/task_m010_24_stage4.md
A mydocs/working/task_m010_24_stage5.md
```

위 경로는 수행계획·단계 보고·오늘할일과 승인된 공식 운영 증적뿐이다. 제품 실행 코드,
Cargo/JavaScript dependency, bundled WASM/Studio, workflow, packaging script와 generated
artifact 변경은 없다. 따라서 Stage 3 native run
`31688732973`의 Windows x64·Linux x64·Linux arm64 build와 Windows installer smoke를
계승하며 native matrix를 다시 dispatch하지 않는다. Stage 6 보고서와 후속 최종 보고서도
같은 비실행 문서 범위로 분류한다.

## 본문 변경 정도 / 본문 무손실 여부

- Stage 6은 Stage 보고서와 오늘할일 상태만 변경한다.
- Stage 5 공식 문서와 제품 source는 수정하지 않는다.
- PR #32의 branch, commit `b3712714f6733aa75ff50dd346b89850136b5458`, open draft 상태를
  변경하지 않았다.
- release tag, GitHub Release, 서명, package 게시, Pages와 updater를 실행하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
gh run view 31814890022 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
git diff --name-status \
  88baa5666ec55bf043844bae01ec4d422278851c..73cda55ffa3950b4c7cb04c3464ca07a176d8807
git diff --check
git status --short
```

결과:

- OK — frozen install, 제품 경계 199 files, 제품 version `0.1.0`, release metadata와
  rhwp `v0.8.4` pin 6 artifacts 검증 통과.
- OK — automation 120/120, upstream 35/35, Studio 105/105, Studio production build 성공.
- OK — final CI run은 exact Stage 5 head이며 모든 JavaScript/Rust test와 Clippy 성공.
- OK — source submodule, native Cargo lock, bundled WASM과 전체 Studio는
  `v0.8.4` / `496333b27d21ddb9114ba9ae340bcb895870c9a7`로 일치.
- OK — Windows x64와 Linux x64 GUI 수용, Linux arm64 build-only 한계와 artifact checksum이
  공식 문서·Stage 보고서에 일치한다.
- OK — path audit에 실행 영향 경로가 없어 native 재실행 불필요.
- OK — `git diff --check` 통과. Stage 6 보고서 작성 전 working tree는 clean이었다.

## 잔여 위험

- Linux arm64 실제 GUI, Linux AppImage/RPM 설치·실행, Windows MSI 수동 GUI는 미실행이다.
- Windows/Linux GUI 수용은 대표 환경·fixture에 한정하며 모든 WebView runtime, 배포판,
  enterprise policy, GPU/Wayland와 physical printer 조합을 대표하지 않는다.
- Actions artifact는 2026-08-27 만료 예정인 임시 검증물이며 공개 다운로드가 아니다.
- GUI exact-SHA 자동화는 Task #34·#35 범위다. Task #24는 일회성 수동 수용을 공식
  자동화 gate로 확대하지 않는다.

## 다음 단계 영향

- Task #24의 최종 판정은 제한사항을 명시한 Go다.
- `task-final-report`로 최종 보고서를 작성하고 Stage 6·최종 보고 커밋을
  `publish/task24`에 non-force push한 뒤 `devel` 대상 Open PR을 만든다.
- PR 본문은 PR #32 immutable candidate를 Task #24가 수용한 입력으로 설명하고
  `Refs #24`를 사용한다. PR #32 merge·close, Issue #24 close와 Task PR merge는 이번
  지시 범위에 포함하지 않는다.

## 승인 경계

- 작업지시자가 #24 PR 생성까지 연속 진행을 명시했으므로 `task-final-report`를 바로 적용한다.
- PR 생성 뒤에는 merge나 정리를 진행하지 않고 작업지시자 검토를 기다린다.
