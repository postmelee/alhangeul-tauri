# Task #122 Stage 1 — rhwp v0.9.0 후보 통합과 변경 영향 검증

[이슈 #122](https://github.com/postmelee/alhangeul-tauri/issues/122) · [구현계획서](../plans/task_m010_122_impl.md) · 2026-11-09

## 단계 목적

Alhangeul v0.1.3 준비에 사용할 Rust core, Studio, WASM의 출처를 rhwp [v0.9.0](https://github.com/edwardkim/rhwp/releases/tag/v0.9.0)으로 고정하고 제품 adapter와 Worker의 호환성을 확인했다.

## 산출물

| 파일 또는 참조 | 변경 요약 |
|---|---|
| `third_party/rhwp`, `rhwp-core.lock` | Stable 태그의 커밋 `c9095c5f67632e6721e800ccc7fb43ea49d26682`에 gitlink와 생성물 출처를 고정했다. upstream Cargo.lock SHA-256은 `6184ebd0c4d86f71314b11e756f1e910001b8eac7f4fc7d4cbd2acfac393c86f`다. |
| desktop, document-preview, thumbnail-worker, linux-thumbnailer의 Cargo.lock | 같은 upstream 소스 기준으로 native 의존성 4종을 갱신했다. |
| `apps/studio-host/vendor/rhwp-core/` | wasm-pack 0.15.0으로 `wasm-pack build --target web --release`를 실행했다. 관리 산출물 6개를 검증했다. WASM은 11,821,756 → 26,836,346바이트이고 새 SHA-256은 `9d26197106cbe47236247c6c5cc8a32777dd794dc747d7360586f9b5dde7d7a6`다. |
| 제품 문서·경계 테스트·썸네일 fixture 참조 | 새 태그와 commit을 반영했다. 생성기 allowlist를 통과한 후보 diff는 18개 파일이다. |
| [글꼴·Worker 호환 PR #123](https://github.com/postmelee/alhangeul-tauri/pull/123) | 기존 v0.8.7 기준 필수 검사를 통과한 뒤 devel에 일반 병합했다. 양쪽 태그의 변경 범위는 [Stage 1.1 보고서](task_m010_122_stage1.1.md)에 기록했다. |
| [자동 동기화 후보 PR #124](https://github.com/postmelee/alhangeul-tauri/pull/124) | 동일 태그의 열린 후보 1건. base는 devel `9f811db9fe5d282b91cbe64867eaa79870cc053d`, head는 `b8a238b0c2a584d1a8ac65e0bcb940756a7c29bd`다. draft 상태이며 head를 `local/task122`에 fast-forward로 통합했다. |

## 본문 변경 정도 / 동작 보존

제품의 로컬 글꼴 선택, 감지 및 렌더러 연결을 두 태그에서 검증했다. v0.9.0 PDF import Worker는 제품이 함께 배포하는 WASM을 사용하며, upstream의 선택적 AI 도우미는 제품 빌드에서 비활성화했다. 이번 단계의 앱 버전은 v0.1.2다.

## 검증 결과

- [첫 실행](https://github.com/postmelee/alhangeul-tauri/actions/runs/42561853953)에서 Studio 글꼴 검사 22건이 실패했다. 보정 후 [선행 PR 검사](https://github.com/postmelee/alhangeul-tauri/actions/runs/42621450159)가 통과했다.
- [재실행 42622195018](https://github.com/postmelee/alhangeul-tauri/actions/runs/42622195018)은 main `6dcb05e96ec2075d09d8a60160e1d82f08c0811b`의 workflow에서 병합된 devel을 기준으로 공식 WASM을 생성했다. pin, upstream 39/39, Studio 289/289와 빌드, Ubuntu Rust 테스트 211건과 Clippy, allowlist 및 committed 검사가 통과했다.
- 후보 head의 [PR 검사](https://github.com/postmelee/alhangeul-tauri/actions/runs/42627534231)는 Node·Studio, Windows PowerShell과 종합 필수 검사까지 모두 통과했다.
- 공식 후보를 별도로 checkout해 `check:rhwp-pin`, `check:committed-rhwp`, `test:upstream` 39/39, `test:studio` 289/289, `build:studio` 통과를 확인했다. 통합한 작업 브랜치에서도 pin 및 committed 검사를 통과했다.
- Studio entry가 폼·PDF Worker를 각각 참조하고 PDF Worker와 main이 같은 `rhwp_bg-DBpb5G9i.wasm`을 참조한다. 배포용 파일은 vendor WASM과 바이트·해시가 일치했다. Node에서 번들 메시지 핸들러를 호출해 PDF Worker의 WASM 정책 조회(입력 한도 67,108,864바이트), 폼 Worker의 `MoveDocEnd` 명령 반환을 확인했다.

## 잔여 위험

Ubuntu Clippy에서 upstream 의존성 경고가 출력됐다. 늘어난 WASM이 설치본에서 로드되는지와 Windows/Linux의 실제 편집·인쇄·썸네일 동작은 Stage 3에서 검증한다.

## 다음 단계 영향

Stage 2는 위 후보를 기준으로 v0.1.3 제품 메타데이터와 릴리즈 후보 노트를 갱신하고 관련 계약 검사를 수행한다. 설치본 수용과 공개 배포 판단은 이후 단계에 남아 있다.

## 승인 요청

Stage 1 결과 검토와 Stage 2 진입 승인을 요청한다.
