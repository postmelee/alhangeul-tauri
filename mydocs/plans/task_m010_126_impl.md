# Task #126 구현계획서 — Alhangeul v0.1.3 공개

수행계획서: [task_m010_126.md](task_m010_126.md)  
GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126) · M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 공개 입력과 main 확정 | release PR, exact main SHA, Stage 1 보고 | live refs/Release/환경, main ancestry·tree, PR #125의 성공 체크·원시 제한 대조 |
| 2 | 최종 일반·서명 후보 생성 | producer run/attempt·archive 목록·서명 inventory, Stage 2 보고 | all/full 일반 및 비게시 updater 필수 job, archive digest·파일 SHA256·Minisign 3종 |
| 3 | 실제 게시 파일과 노트 수용 | task_m010_126.json, v0.1.3.notes.json, 11개 게시 목록, Stage 3 보고 | Windows2·AppImage·DEB·RPM·arm64 설치/문서, notes 계약·타입·집중 회귀 |
| 4 | GitHub Release 공개 | tag·draft/public metadata, read-back receipts, Stage 4 보고 | 11개 파일 독립 다운로드 hash/서명/inventory, body exact bytes, stable/latest |
| 5 | Pages와 실제 업데이트 | site/release.json·HTML·upgrade 입력, PR·Pages run, Stage 5 보고 | Pages 계약·HTTP/desktop/mobile, NSIS/MSI/AppImage 0.1.2→0.1.3 실제 업데이트·보존 |
| 6 | 최종 기록과 종료 | 최종 notes·기술 기록·report·보드·PR, Stage 6 보고 | 문서·최종 공개 상태, 필요한 notes/Pages 재검증, PR required·일반 merge·cleanup |

## 문서 위치 확인

공식 원문과 기술 기록은 docs/releases, 배포 데이터/생성 HTML은 site, task 기록은 mydocs의 기존 계획 경로를 사용한다. 새로운 공식 문서 루트는 만들지 않는다.

## Stage 1 — 공개 입력과 main 확정

### 산출물

release PR, exact main SHA, Stage 1 보고.

### 변경 내용

수행계획서 Stage 1와 PUBLIC_RELEASE_RUNBOOK의 대응 gate를 진행한다. 실행 직전 exact SHA·파일·run 입력을 기록하고 결과를 후속 gate로 넘긴다.

### 검증

live refs/Release/환경, main ancestry·tree, PR #125의 성공 체크·원시 제한 대조. 각 단계에서 `git diff --check`를 수행한다.

### 커밋

`Task #126 Stage 1: 공개 입력과 main 확정` — 단계 보고서와 산출물을 함께 커밋한다.

## Stage 2 — 최종 일반·서명 후보 생성

### 산출물

producer run/attempt·archive 목록·서명 inventory, Stage 2 보고.

### 변경 내용

수행계획서 Stage 2와 PUBLIC_RELEASE_RUNBOOK의 대응 gate를 진행한다. 실행 직전 exact SHA·파일·run 입력을 기록하고 결과를 후속 gate로 넘긴다.

### 검증

all/full 일반 및 비게시 updater 필수 job, archive digest·파일 SHA256·Minisign 3종. 각 단계에서 `git diff --check`를 수행한다.

### 커밋

`Task #126 Stage 2: 최종 일반·서명 후보 생성` — 단계 보고서와 산출물을 함께 커밋한다.

## Stage 3 — 실제 게시 파일과 노트 수용

### 산출물

task_m010_126.json, v0.1.3.notes.json, 11개 게시 목록, Stage 3 보고.

### 변경 내용

수행계획서 Stage 3와 PUBLIC_RELEASE_RUNBOOK의 대응 gate를 진행한다. 실행 직전 exact SHA·파일·run 입력을 기록하고 결과를 후속 gate로 넘긴다.

### 검증

Windows2·AppImage·DEB·RPM·arm64 설치/문서, notes 계약·타입·집중 회귀. 각 단계에서 `git diff --check`를 수행한다.

### 커밋

`Task #126 Stage 3: 실제 게시 파일과 노트 수용` — 단계 보고서와 산출물을 함께 커밋한다.

## Stage 4 — GitHub Release 공개

### 산출물

tag·draft/public metadata, read-back receipts, Stage 4 보고.

### 변경 내용

수행계획서 Stage 4와 PUBLIC_RELEASE_RUNBOOK의 대응 gate를 진행한다. 실행 직전 exact SHA·파일·run 입력을 기록하고 결과를 후속 gate로 넘긴다.

### 검증

11개 파일 독립 다운로드 hash/서명/inventory, body exact bytes, stable/latest. 각 단계에서 `git diff --check`를 수행한다.

### 커밋

`Task #126 Stage 4: GitHub Release 공개` — 단계 보고서와 산출물을 함께 커밋한다.

## Stage 5 — Pages와 실제 업데이트

### 산출물

site/release.json·HTML·upgrade 입력, PR·Pages run, Stage 5 보고.

### 변경 내용

수행계획서 Stage 5와 PUBLIC_RELEASE_RUNBOOK의 대응 gate를 진행한다. 실행 직전 exact SHA·파일·run 입력을 기록하고 결과를 후속 gate로 넘긴다.

### 검증

Pages 계약·HTTP/desktop/mobile, NSIS/MSI/AppImage 0.1.2→0.1.3 실제 업데이트·보존. 각 단계에서 `git diff --check`를 수행한다.

### 커밋

`Task #126 Stage 5: Pages와 실제 업데이트` — 단계 보고서와 산출물을 함께 커밋한다.

## Stage 6 — 최종 기록과 종료

### 산출물

최종 notes·기술 기록·report·보드·PR, Stage 6 보고.

### 변경 내용

수행계획서 Stage 6와 PUBLIC_RELEASE_RUNBOOK의 대응 gate를 진행한다. 실행 직전 exact SHA·파일·run 입력을 기록하고 결과를 후속 gate로 넘긴다.

### 검증

문서·최종 공개 상태, 필요한 notes/Pages 재검증, PR required·일반 merge·cleanup. 각 단계에서 `git diff --check`를 수행한다.

### 커밋

`Task #126 Stage 6: 최종 기록과 종료` — 단계 보고서와 산출물을 함께 커밋한다.

## 검증

- Node/Studio 및 Windows PS는 PR required 또는 ci.yml fast로 확인한다.
- producer: alhangeul-desktop.yml의 artifact/all/full/run_tests=true 및 updater/publish_release=false, 동일 최종 main.
- 설치: release-file-acceptance, release-linux-file-acceptance, release-fedora-vm-acceptance에 고정 candidate JSON을 전달한다.
- 노트: pnpm run check:release-notes, test:release-notes, build:pages, check:pages 및 영향 계약/타입 검사.
- 공개: draft/public 다운로드 11종 hash와 inventory/Minisign, production manifest와 공개 화면.
- upgrade: production-upgrade-check에 이전/대상 Release·manifest 고정 입력, 같은 형식 3종의 실제 설치·재실행·보존.
- 실패 시 원인과 변화 입력을 먼저 기록한다. 단순 반복 실행하지 않는다.

## 단계 의존성

앞 단계의 필수 검증·보고 완료 후 다음 단계에 진입한다. Pages는 Release read-back 뒤, 실제 upgrade는 production manifest 게시 뒤 수행한다. 구현/검증 입력을 원격 실행해야 할 때 publish/task126에 게시하고, devel 변경은 PR을 거친다. 릴리즈 인계용 중간 PR은 #126을 닫지 않는다.

## 위험과 대응

기존 hosted NSIS thumbnail·강제 MSI 3010 제한과 새 실패를 구분한다. 새 필수 실패는 회복하고, 검증/지원 범위를 약화하지 않는다. 실제 서명 inventory가 없는 notes 값을 가공하지 않는다. private 증거는 T7에 보존한다.

## 승인 기록

2026-11-11의 “등록하고 릴리즈 완료까지 계속 진행해줘.”를 수행계획서와 위 단계에 적용한다. 정확한 실행 입력·결과를 기록하며 기존 키·보호·지원 범위 안에서 완료까지 계속한다.
