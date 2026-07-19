# AGENTS.md

본 저장소에서 작업하는 모든 코딩 에이전트(Codex, Claude Code 등)가 따르는 운영 규칙. 매 턴 시스템 프롬프트로 적재되므로 항상 필요한 정책·제약·인덱스만 둔다. 절차 상세는 매뉴얼·SKILL로 분리한다.

## 프로젝트 개요

**목표**: Windows와 Linux에서 HWP/HWPX 문서를 열고 편집·저장·인쇄·내보내기할 수 있는 Tauri 기반 Alhangeul 데스크톱 앱 개발

- 제품명은 **Alhangeul**, 구현 저장소명은 `alhangeul-tauri`
- 지원 범위는 Windows와 Linux로 한정하며 다른 운영체제의 빌드, CI, 개발 검증, 패키징, 배포는 수행하지 않음
- `golbin/hop`은 최초 코드와 Git 이력의 출처일 뿐 upstream으로 사용하지 않으며 자세한 이력은 `docs/architecture/PROVENANCE.md`에 둠
- 제품의 유일한 지속 upstream은 `edwardkim/rhwp`; Stable release tag와 resolved commit을 함께 고정하고 Rust core와 bundled `rhwp-studio`를 같은 release 기준으로 관리
- 초기 코드에서 이어진 제품 전환 이력과 현재 소유 경계를 혼동하지 않음
- JavaScript 패키지 관리는 `pnpm`만 사용하며 npm/yarn lockfile, 명령, workflow cache key를 추가하지 않음

## 하이퍼-워터폴 핵심 규칙

이 프로젝트는 **하이퍼-워터폴** 방법론을 적용한다. 에이전트의 기본 동작(빠른 실행, 자율 수정)과 충돌하므로 반드시 숙지한다. 상세: [`agent_code_hyperfall_rule_conflict.md`](mydocs/manual/agent_code_hyperfall_rule_conflict.md).

- 소스 수정 전 반드시 작업지시자 승인 요청
- 작업은 GitHub Issue 기준으로 추적
- 새 기능, 버그 수정, 구조 변경은 `이슈 -> 브랜치 -> 오늘할일 -> 계획서 -> 구현 -> 검증 -> 최종 보고서 -> PR` 순서 절대 생략 금지
- 각 단계 완료 후 승인 없이 다음 단계 진행 금지
- 범위가 불명확하거나 기존 작업과 충돌할 가능성이 있으면 먼저 확인
- 사용자나 다른 작업자가 만든 변경은 되돌리지 않음
- 이슈 close는 작업지시자 승인 후 또는 PR merge 확인 후에만 수행
- 문서 수정은 기존 내용을 먼저 읽고 필요한 부분만 수정하며, 불가피할 때만 내용을 추가
- 제품/사용자/기여자/외부 통합/API/아키텍처/로드맵 문서를 생성, 이동, 수정할 때는 수행계획서에 문서 위치 판단을 기록하고 승인받음
- `mydocs/manual`은 대상 프로젝트 제품 문서 위치가 아니며, 공식 문서 루트(`docs/`, `specs/`, `site/`, `website/`, `adr/` 등)는 대상 프로젝트가 별도 task에서 명시적으로 선택
- 작업 완료 후 다음 작업에 필요하지 않은 로컬/원격 부산물은 정리
- PR merge와 이슈 close 후에는 `devel`로 돌아오고, 더 이상 필요 없는 `local/task{번호}` 브랜치와 임시 worktree를 정리

**승인 간주 조건**: 작업지시자가 같은 스레드에서 "계속 진행", "다음 단계 진행"처럼 명시 지시한 경우에만 해당 단계 승인으로 간주한다.

## 명명 규칙

- 마일스톤: `M{버전}` (예: M100=v1.0.0, M05x=v0.5.x). 문서 파일명은 `m{숫자}` 소문자 (예: `m100`)
- 브랜치: `local/task{이슈번호}` (작업), `publish/task{이슈번호}` (`devel` 대상 PR 게시용)
- 커밋 메시지:
  - 기본형: `Task #{번호}: 내용`
  - 단계: `Task #{번호} Stage {N}: 내용`
  - 하위 단계: `Task #{번호} [Stage {N.M}]: 내용`
  - 보고서 묶음: `Task #{번호} Stage {N} + 최종 보고서: 내용`
- 문서 파일명: `task_{milestone}_{이슈번호}{_impl|_stage{N}|_report}?.md`. 신규 문서는 마일스톤 포함 형식 강제. 상세: [`document_structure_guide.md`](mydocs/manual/document_structure_guide.md)
- 모든 문서는 이 저장소에 선택된 Hyper-Waterfall locale로 작성한다.

## 핵심 강제 규칙 (변경 전 매뉴얼 확인 필수)

- 핵심 스택은 Tauri 2, Rust, TypeScript, Vite, Vitest이며 adapter와 native 경계를 얇고 명시적으로 유지
- TypeScript UI는 명확한 bridge API를 호출하고, Rust는 native filesystem, document session, save/export/print, OS integration을 소유
- 경로, 인코딩, 날짜/시간, 프로세스 실행은 Windows와 Linux 차이를 고려하며 지원 범위 밖의 전용 분기나 검증 범위를 새로 추가하지 않음
- `third_party/rhwp`는 현재 읽기 전용 submodule 의존성이다. 독립적인 release pin 구조가 승인된 task에서 도입되기 전까지 수동 수정하지 않음
- `rhwp` 갱신은 Stable release tag + resolved commit provenance를 기록하고 Rust core와 bundled `rhwp-studio`의 동일 release 정합성을 검증하는 전용 task로만 수행
- 제품 코드, 빌드, CI, 패키징, 배포의 지원 대상은 Windows와 Linux로 한정
- 비밀, 서명 인증서, 토큰, 개인 문서 내용은 로그나 저장소에 기록하지 않음
- release tag 이동, force push, history rewrite는 작업지시자의 명시 승인 없이 수행하지 않음
- release, 배포, 서명, 패키지 게시, updater 활성화는 작업지시자의 명시 지시가 있을 때만 수행
- 변경 유형별 검증 범위와 Windows/Linux 실행 환경은 각 task 수행계획서에서 승인받음
- 모든 호스트에서 실행할 수 있는 기본 검증 명령은 `pnpm run check:product-boundary`, `pnpm run test:upstream`, `pnpm run test:studio`, `pnpm run build:studio`임. Rust desktop 검증과 Tauri build는 Windows/Linux 환경에서만 수행
- 파일과 함수는 역할이 흐려지기 전에 분리하고, 권장 상한은 파일 300 LOC, 함수 50 LOC, 매개변수 5개, 순환 복잡도 10으로 둠. 초과가 필요하면 수행계획서에 이유를 기록

## 필수 참조 문서

- [`README.md`](README.md) — 프로젝트 개요, 초기 설정, 빌드
- [`docs/architecture/UPSTREAM.md`](docs/architecture/UPSTREAM.md) — 현재 `rhwp` 의존 경계와 후속 release pin 기준
- [`docs/architecture/PROVENANCE.md`](docs/architecture/PROVENANCE.md) — 초기 코드와 제품 자산 출처
- [`docs/operations/DESKTOP_RELEASE.md`](docs/operations/DESKTOP_RELEASE.md) — artifact 검증과 후속 배포 준비 경계
- [`mydocs/manual/document_structure_guide.md`](mydocs/manual/document_structure_guide.md) — `mydocs/` 폴더 역할, 문서 파일명, 외부 PR 폴더 정책, Skills 위치 정책
- [`mydocs/manual/task_workflow_guide.md`](mydocs/manual/task_workflow_guide.md) — 타스크 진행 15단계, 커밋 메시지 규칙, 작업 시간 규칙
- [`mydocs/manual/git_workflow_guide.md`](mydocs/manual/git_workflow_guide.md) — 브랜치 정책, Git 다이어그램, 메인테이너/컨트리뷰터 워크플로우
- [`mydocs/manual/pr_process_guide.md`](mydocs/manual/pr_process_guide.md) — 외부 기여 PR 검토
- [`mydocs/manual/agent_code_hyperfall_rule_conflict.md`](mydocs/manual/agent_code_hyperfall_rule_conflict.md) — 하이퍼-워터폴과 에이전트 기본 동작 충돌 규칙
- [`.hyper-waterfall/version.json`](.hyper-waterfall/version.json) — 적용된 Hyper-Waterfall release와 locale 기준
- 프로젝트 고유 아키텍처, `rhwp` 의존성, 빌드·검증, 릴리스 문서는 각각의 별도 task에서 공식 문서 위치를 승인받은 뒤 추가

## Agent Skills

하이퍼-워터폴 절차의 정형 시점은 SKILL로 분리한다. 진실 원천은 `mydocs/skills/`이며, Codex(`.agents/skills`)와 Claude Code(`.claude/skills`)는 심볼릭 링크로 동일 본문을 인식한다. 상세: [`document_structure_guide.md`](mydocs/manual/document_structure_guide.md) 의 "Agent Skills 위치 정책".

## 작업 규칙

- 작업 시간의 시작과 종료는 작업지시자가 결정한다. 에이전트가 임의로 작업 종료를 제안하거나 시간을 한정하지 않는다.
