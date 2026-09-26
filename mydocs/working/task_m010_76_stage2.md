# Task #76 Stage 2 — v0.8.6 통합

GitHub Issue: [#76](https://github.com/postmelee/alhangeul-tauri/issues/76)
구현계획서: [task_m010_76_impl.md](../plans/task_m010_76_impl.md)
Stage: 2

## 단계 목적

자동 후보의 core·Studio·WASM을 같은 stable로 수용하고 제품 소유 adapter를 새 시작 동작에 맞춘다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| third_party/rhwp, rhwp-core.lock, vendor/rhwp-core, 네 Cargo.lock | v0.8.6 / f1f9c6ae58344ee9368996d3543f76b9345cf227 |
| desktop-startup-entry.ts와 회귀 | Tauri에서 native 세션 없이 자동 생성되는 빈 문서를 생략, 기존 파일 → 새로 만들기 유지 |
| GUI startup·native print helper | 새 스킨 안내와 제품 글꼴 설정을 알려진 고유 UI로 처리 |
| UPSTREAM.md, DEVELOPMENT.md, README.md | current pin과 native 시작 경계 기록 |
| WINDOWS_FONT_ACCEPTANCE.md | 새 설치본 최종 Windows 점검 순서와 무료 글꼴 링크 |

## 본문 변경 정도 / 본문 무손실 여부

자동 후보 #78의 커밋을 merge하여 이력을 유지했다. upstream source는 패치하지 않았다. 스킨 선택과 browser의 자동 빈 문서는 보존하며 Alhangeul native 저장 소유권만 유지한다. 글꼴 목록 UI 개선·Abel 폭 보정은 범위 밖이다.

## 검증 결과

- check:rhwp-pin: exact tag·commit·6 WASM 산출물·네 lock 일치.
- check:product-boundary: 668 파일 통과. check:product-version과 check:release-metadata: 0.1.0 일치.
- test:upstream 39, test:studio 235, test:automation 969 통과.
- build:studio와 typecheck:gui 통과. Vite의 기존 chunk 크기·혼합 import 경고는 남는다.
- 자동 후보 run 36224131632의 Linux native test:desktop 및 clippy:desktop 통과. 최종 통합 SHA의 전체 native·설치본은 Stage 3에서 별도 검증한다.
- git diff --check 통과.

## 잔여 위험

새 GUI selector와 실제 OS 저장·PDF·인쇄는 설치본 실행 전까지 미검증이다. Windows 최종 사용자 수용은 설치본 인계 후 진행한다. macOS native build는 수행하지 않았다.

## 다음 단계 영향

이 제품 source를 Windows x64·Linux x64/arm64 full CI에 전달하고, exact Linux x64 artifact의 full/local-fonts GUI를 실행한다. native 시작 경계에 대한 새 문서 저장도 확인한다.

## 승인 근거

사용자의 #74 반영 → 별도 동기화/v0.8.6 수용 → 설치본 검증 순차 진행 승인을 적용한다. 공개 release는 수행하지 않는다.
