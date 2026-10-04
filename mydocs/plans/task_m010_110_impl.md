# Task #110 구현계획서 — 완료 변경의 main 정렬

수행계획서: [task_m010_110.md](task_m010_110.md)
GitHub Issue: [#110](https://github.com/postmelee/alhangeul-tauri/issues/110)
마일스톤: M010

## 승인 근거

작업지시자가 같은 스레드에서 “진행해줘. 병합및 이번 작업 마무리까지 별도 승인없이 계속 진행해줘.”라고 지시했다. 수행계획 승인, 본 구현계획과 3개 Stage 진행, 검증, 두 PR 게시·검토·병합, 이슈 종료와 이번 작업 부산물 정리를 포괄 승인으로 기록한다. 계획서의 제외 범위와 기존 작업 보호는 유지한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 기준선과 기존 수용 근거 | working/task_m010_110.json, stage1 보고 | exact ref·Release·22개 공개 파일·기존 CI 상태 |
| 2 | main 이력 통합과 README | README.md, stage2 보고 | ancestry·제품/lock/site 불변·제품 계약 검사 |
| 3 | 통합 검증과 PR 준비 | stage3 보고·검증 근거 | Node/Studio·release·Pages 계약 및 source tree |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| README.md | root README | README.md | OK | 기존 공개 안내 충돌 해결 |
| 계획 | mydocs/plans | task_m010_110.md, task_m010_110_impl.md | OK | 작업 추적 |
| 근거·단계 보고 | mydocs/working | task_m010_110.json, task_m010_110_stage1/2/3.md | OK | 승인·실행 증거 |
| 최종 보고 | mydocs/report | task_m010_110_report.md | OK | PR 게시 시 작성 |
| 오늘할일 | mydocs/orders | 20261005.md | OK | 기존 #108 행 보존 |
| 완료 작업 공식 문서·웹 | 기존 docs/site/templates | 기존 경로 그대로 병합 | OK | 새 정책·배포 없음 |

## Stage 1 — 기준선과 기존 수용 근거

### 산출물

- mydocs/working/task_m010_110.json
- mydocs/working/task_m010_110_stage1.md

### 변경 내용

- 최신 main/devel ref와 common ancestor, 제품 source, 직접 변경 경로를 고정한다.
- 기존 성공 PR #109 fast run 37222603474와 Pages run 37223289065의 실제 job/step 성공을 확인한다.
- 기존 Windows 업그레이드 run 37179376994와 Linux run 37158705809의 전체/개별 job 상태를 분리한다. 실패한 Linux 전체 run을 전체 성공으로 표현하지 않는다.
- 기존 v0.1.1 tag/source와 11개 공개 asset의 식별자·크기·digest, 공개 사이트 22개 파일 hash를 기록한다.

### 검증

```bash
git merge-base origin/main origin/devel
git diff --name-only origin/main origin/devel
git diff --name-only v0.1.1 origin/devel -- apps crates assets rhwp-core.lock pnpm-lock.yaml .gitmodules
# GitHub ref/Release/tag/Actions API와 기존 배포 22개 파일 HTTP/hash 대조
git diff --check
```

### 커밋

`Task #110 Stage 1: main 정렬 기준선과 기존 수용 근거 확정`

## Stage 2 — main 이력 통합과 README 충돌 해결

### 산출물

- README.md
- mydocs/working/task_m010_110_stage2.md

### 변경 내용

- 승인한 exact main을 작업 브랜치에 --no-ff merge하고 README 충돌 1개를 해결한다.
- “v0.1.1의 업데이트 검증 결과와 알려진 제한은 릴리즈 안내에서 확인하세요. 버전별 실제 검증 환경과 남은 제한은 버전별 릴리즈 기록에 정리되어 있습니다.”의 두 링크를 유지한다.
- main/devel ancestry와 승인 devel 대비 README·#110 기록 외 변경 부재를 검증한다.
- 분리 worktree에서 pinned submodule을 준비하고 pnpm frozen lockfile로 검증 의존성을 설치한다. submodule source와 lock을 수정하지 않는다.

### 검증

```bash
git merge-base --is-ancestor 7bab9062b7d231faad53465536aff407d535f52d HEAD
git merge-base --is-ancestor 1d3817c7133658c9e4251f65f5202baafd0624f4 HEAD
git diff --name-only 1d3817c7133658c9e4251f65f5202baafd0624f4 HEAD -- apps crates assets rhwp-core.lock pnpm-lock.yaml .gitmodules site scripts .github
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run check:committed-rhwp
git diff --check
```

### 커밋

merge commit으로 이력과 단계 보고를 함께 묶는다: `Task #110 Stage 2: main 이력 보존과 README 공개 안내 통합`.

## Stage 3 — 통합 계약 검증과 PR 준비

### 산출물

- mydocs/working/task_m010_110_stage3.md
- working/task_m010_110.json의 통합 검사 결과

### 변경 내용

- 아래 플랫폼 중립 검증을 수행하고 명령별 결과·실제 수량·scope를 기록한다.
- 이미 배포된 Pages와 새 빌드 output, 기존 devel의 workflow/script/test/product tree 동일성을 확인한다.
- 첫 task PR은 Refs #110으로 만들고 이슈를 main 병합 완료까지 OPEN으로 유지한다.

### 검증

```bash
pnpm run check:release-notes
pnpm run test:release-notes
pnpm run test:automation
pnpm run typecheck:gui
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run build:pages
pnpm run check:pages
git diff --check
```

### 커밋

`Task #110 Stage 3: 릴리즈·Studio·Pages 통합 계약 검증`

## 검증

- 실패 검증은 같은 Stage에서 원인을 확인하고 회복한 뒤 보고한다.
- 이번 추가 변경은 수용된 devel 대비 README·기록만으로 제한한다. 새 제품·workflow 구현 변경은 수행계획 범위를 다시 확인한다.
- PR 게시 후 exact head/base·synthetic merge candidate SHA의 자동 fast 3개 job 및 모든 step 성공을 확인한다.
- main PR 후보 tree와 수용된 devel/CI 후보 tree가 완전히 같으면 해당 결과를 재사용한다. tree 불일치 시 승인된 exact source fast 실행을 수행하며 부분 검증 범위를 명시한다.
- main/devel ref가 이동하면 PR과 검사 증거를 최신 exact 기준으로 다시 대조한다.
- 기존 Release asset·tag·공개 22개 파일/피드 hash를 병합 후 다시 확인한다. 신규 native build·서명·배포를 수행하지 않는다.

## 커밋

- 구현계획 단독: `Task #110: 구현계획과 전체 진행 승인 기록`
- 각 Stage 산출물과 단계 보고서는 한 커밋으로 묶는다.
- 최종 보고·오늘할일은 task-final-report 절차에서 별도 커밋한다. 이때 구현 3개 단계 완료와 원격 PR·main 병합 대기를 구분한다.

## 단계 의존성

Stage 1 → Stage 2 → Stage 3 → 최종 보고/devel PR → fast·검토·devel merge → devel/main PR·검토·merge → read-back·이슈 close·cleanup. 각 전환은 작업지시자의 이번 포괄 승인 아래 진행한다.

## 위험과 대응

- **README 공개 정보 손실**: 버전과 업데이트 검증을 유지하고 두 안내 링크를 모두 보존한다.
- **PR 조기 이슈 종료**: 첫 PR에는 Refs #110만 사용하고 최종 main 수용 뒤 종료한다.
- **기존 증거의 확대 해석**: native/GUI 재실행을 했다고 표현하지 않는다. 실패 전체 run과 성공 개별 job를 구분한다.
- **점유된 devel/사용자 변경**: 기존 checkout을 변경하지 않고 종료 시 detached origin/devel로 돌아가 worktree를 보관한다.

## 승인 요청 사항

이번 같은 스레드의 명시 포괄 승인으로 본 계획·각 단계·PR/병합/정리를 계속 진행한다. 제외 범위 변경이 필요하면 별도로 범위를 확인한다.
