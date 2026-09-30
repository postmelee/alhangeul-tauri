# README 배지 Stage 2 보고서

GitHub Issue: [#90](https://github.com/postmelee/alhangeul-tauri/issues/90)
구현계획서: [task_m010_90_impl.md](../plans/task_m010_90_impl.md)
Stage: 2

## 단계 목적

rhwp 후보 tag 갱신 시 상단 배지와 기존 Stable pin을 함께 갱신하고 실패 경계를 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| scripts/update-rhwp-managed-references.mjs | 전체 배지 exact rule와 private 표시 helper, 5행 추가 |
| tests/rhwp-managed-references.test.mjs | 정상 갱신·배지 실패 4개 시나리오·실제 snapshot 확인 |

## 본문 변경 정도 / 본문 무손실 여부

managed path allowlist·export API·동기화 workflow는 같다. 기존 README Stable pin 규칙과
다른 관리 참조·historical 자료 보존 검증을 유지한다. 실제 rhwp lock·submodule·제품 파일은 변경하지 않았다.
updater 172 LOC, 테스트 260 LOC로 파일 권장 상한 이내다.

## 검증 결과

```sh
node --test tests/rhwp-managed-references.test.mjs tests/rhwp-sync-changes.test.mjs tests/rhwp-upstream-sync-workflow.test.mjs
pnpm run check:product-boundary
pnpm run test:upstream
git diff --check
```

- focused tests: 25/25 통과. managed-reference 9개, changed-path 5개, workflow 11개.
- 정상 후보 tag 전환에서 alt·SVG 표시·릴리즈 tag 링크·Stable pin이 함께 갱신된다.
- 배지 누락·중복·표시 버전 불일치·링크 불일치 4개 사례에서 writes=0, 관리 파일 bytes 동일.
- 실제 저장소 snapshot의 current lock marker를 후보 v999.0.0으로 전환하는 기존 검증 통과.
- Product boundary: 730 files scanned, 통과.
- upstream: 39/39 통과. 실제 core/WASM/native lock의 v0.8.6 정합성과 기존 갱신 계약 확인.
- git diff --check: OK. 제품·lock·submodule·workflow·site diff 없음.

## 잔여 위험

상단 배지 형식을 수정하면 관리 marker도 함께 바꿔야 한다. 실제 snapshot 테스트가 드리프트를 검출한다.
이 검증은 후보 snapshot과 동기화 계약 검증이며 실제 scheduled workflow 실행 증거로 확대하지 않는다.

## 다음 단계 영향

통합 diff와 GitHub README 실제 이미지·링크를 확인하고 최종 보고·PR을 준비한다.

## 승인 범위

요청된 배지의 유지관리 보완을 완료했다. 계획된 최종 검토와 PR 준비를 이어간다.
