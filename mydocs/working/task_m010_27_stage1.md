# Task #27 Stage 1 — 외부 Action provenance inventory

GitHub Issue: [#27](https://github.com/postmelee/alhangeul-tauri/issues/27)
구현계획서: [task_m010_27_impl.md](../plans/task_m010_27_impl.md)
Stage: 1

## 단계 목적

외부 Action 참조와 공식 upstream provenance를 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| .github/action-pins.json | 11개 action 경로의 version·sourceRef·resolved SHA·sourceUrl·위험 역할 |

## 본문 변경 정도 / 본문 무손실 여부

기존 workflow와 제품 코드는 변경하지 않았다. 공식 inventory만 추가했다.

## 검증 결과

- OK: 152개 외부 참조·25개 local 참조를 전수 확인; 가변 참조 98개.
- OK: GitHub 공식 repository의 git/ref, annotated tag 재귀 해제, commit 존재와 action.yml을 조회했다. 모든 외부 참조가 inventory에 대응한다.
- OK: checkout7.0.1/node7.0.0/upload7.0.1/download8.0.1와 Pages 기존 exact pin을 유지/정렬한다. cache는 기존 major5의 v5.1.0, token은 v3.2.0.
- OK: dtolnay stable snapshot의 toolchain 기본 stable·targets/components 입력을 확인했다. release tag가 없는 예외이며 설치 compiler 고정을 주장하지 않는다.
- OK: git diff --check.

## 잔여 위험

SHA provenance는 실행 호환성 수용과 다르다. 다음 단계의 계약/Windows/Linux CI로 확인한다.

## 다음 단계 영향

SHA 정렬과 YAML 전체 구조 기반 검사를 구현한다. YAML parser는 기존 lock에 있는 yaml 2.9.0을 직접 개발 의존성으로 선언해 우회 문법·composite/reusable 누락을 막는다.

## 승인 요청

사용자의 #27 전체 수행·PR 리뷰·병합 지시에 따라 Stage 2를 진행한다. 배포·secret 변경은 없다.
