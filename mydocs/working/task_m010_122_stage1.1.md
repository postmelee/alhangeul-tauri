# Task #122 Stage 1.1 — v0.9.0 Studio 호환성 선행 보정

[이슈 #122](https://github.com/postmelee/alhangeul-tauri/issues/122) · [구현계획서](../plans/task_m010_122_impl.md) · 2026-11-09

## 단계 목적

첫 [동기화 실행](https://github.com/postmelee/alhangeul-tauri/actions/runs/42561853953)은 새 pin과 WASM 검증 후 Studio 글꼴 테스트 22건에서 실패했다. 기존 v0.8.7 사용자를 위한 글꼴 선택·감지 동작을 유지하면서 v0.9.0에서도 같은 제품 카탈로그를 참조하도록 보정했다.

## 산출물

| 경로 | 변경 |
|---|---|
| apps/studio-host/local-font-entry-hooks.ts | 두 태그의 문서 초기화와 글꼴 프롬프트 선언을 인식하고 중복·누락을 검사한다. |
| apps/studio-host/local-font-overrides.ts | 문서 글꼴 프로그램 선택, 진단, 메타파일·PUA 렌더러의 상대 import를 제품 adapter에 연결한다. |
| apps/studio-host/src/core/local-font*.ts, host-font*.ts | 이름·스타일별 후보와 변경 이름을 찾고 기존 공급자를 통해 바이트를 읽는다. 분할 host face의 순서와 중복 식별자 거부를 검사한다. |
| apps/studio-host/vite.config.ts | PDF import Worker의 상대 import에 제품이 고정한 WASM 모듈을 공급하고 선택적 AI 도우미를 빌드에서 끈다. |

## 본문 변경 정도 / 동작 보존

upstream 소스·gitlink와 앱 버전을 유지했다. 제품이 소유하는 Vite 설정과 글꼴 경계에서 양쪽 버전을 지원한다. 소스 출처는 v0.8.7의 `1a76570e`과 v0.9.0의 `c9095c5f`다.

## 검증 결과

- **v0.8.7** — 고정 pnpm 의존성으로 `check:product-boundary`, `check:product-version`, `check:rhwp-pin` 통과. `test:upstream` 39/39, `test:automation` 1360/1360, `test:studio` 289/289, `build:studio` 통과.
- **v0.9.0 사전 검증** — 태그 소스와 같은 태그의 기존 WASM package로 `test:studio` 대상 중 288개 통과. 앱 pin을 확인하는 1개는 기존 pin을 유지한 사전 검증에서 제외했다. 실제 HWP/HWPX PDF snapshot 검사도 포함한다. `build:studio`가 성공했다.
- **Worker** — 생성된 PDF import Worker와 Studio main이 같은 WASM 파일명을 참조하고, 그 파일이 입력 vendor WASM과 바이트 단위로 같음을 확인했다. 폼 명령 Worker도 별도 파일로 생성돼 main에서 참조한다. 이 검사는 빌드 출력을 대상으로 했다.

## 잔여 위험과 다음 단계 영향

자동 동기화가 새로 생성한 공식 candidate WASM, 현재 pin, Ubuntu native 및 PR required 결과는 후속 실행에서 확인한다. Windows/Linux 설치본의 Worker·문서·인쇄·글꼴 동작은 Stage 3 수용 대상이다.

## 승인 기록

작업지시자는 선행 PR 검증 및 일반 병합, 동기화 재실행을 승인했고 추가 Worker·AI 설정을 같은 PR에 반영하도록 지정했다. Stage 1 전체의 완료는 새 후보가 게시되고 검증된 뒤 판정한다.
