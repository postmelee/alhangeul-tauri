# Task #62 Stage 2 — exact artifact 재사용

GitHub Issue: [#62](https://github.com/postmelee/alhangeul-tauri/issues/62)
구현계획서: [task_m010_62_impl.md](../plans/task_m010_62_impl.md)

## 단계 목적

제품과 harness의 exact SHA를 구분하여 기존 bytes를 재빌드 없이 검사한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| scripts/ci/artifact-handoff.mjs | 기존 fail-closed run 검증 재사용, 승인 ID/digest 및 product version |
| alhangeul-installer-reuse.yml, ci.yml | installer profile, digest mismatch error, inventory 뒤 실제 MSI/NSIS |
| verify-desktop-artifacts.mjs | optional sourceSha 확장, legacy 읽기 호환, 명시 재사용 시 SHA 필수 |
| tests/ci-handoff.test.mjs, desktop-artifacts.test.mjs | SHA/ID/digest/만료/실패 run/legacy 회귀 |

## 본문 변경 정도 / 본문 무손실 여부

기존 handoff 검증과 설치 script는 변경하지 않았다. inventory는 기존 일반 검증을 유지하는 확장이다. CLI 옵션이 없으면 기존 형식 유지.

## 검증 결과

66개 targeted test 통과. 전체 automation 517/517 통과.
actionlint 및 diff --check 통과. 신규 실제 artifact 소비는 Stage 3에서 확인한다.

## 잔여 위험

sourceSha가 없는 legacy archive는 신규 재사용 경로에서 거부한다. archive 생산이 한 번 필요하다. 이 제약을 문서화했다.

## 다음 단계 영향

#63/#64 제품 생성 경로는 같은 sourceSha inventory를 보존해야 한다.

## 승인 요청

기존 전체 진행 승인 적용.

