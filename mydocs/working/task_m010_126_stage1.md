# Task #126 Stage 1 — 공개 입력과 main 확정

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md) · Stage 1

## 단계 목적

후보와 공개 상태를 대조하고 최종 main 빌드 소스를 고정한다.

## 산출물

| 파일/대상 | 변경 요약 |
|---|---|
| 수행·구현계획서, 오늘할일 | 6단계·문서 위치·전체 진행 승인 기록 |
| PR #127 | devel → main 일반 병합 |
| 본 보고 | 실제 gate 입력과 검증 근거 |

## 본문 변경 정도 / 본문 무손실 여부

기존 후보 기록과 공개 데이터는 수정하지 않았다. 계획 문서 신규 및 보드 행 추가만 수행했다.

## 검증 결과

- 이슈 #126: OPEN, M010/enhancement. 중복 열린 릴리즈 이슈/PR 없음.
- 공개 latest: v0.1.2, publishedAt 2026-10-08T16:49:38Z. 기존 main `6dcb05e96ec2075d09d8a60160e1d82f08c0811b`.
- [PR #127](https://github.com/postmelee/alhangeul-tauri/pull/127): CLEAN/MERGEABLE·non-draft 확인 후 expected head `2b055bb4066b9d3555b74f20bdf895740c76d61a`로 일반 병합.
- 최종 main `bcb892d49a9003615f3acd980babd71e59e147dd`, 부모는 기존 main과 위 devel. tree `a5e008f6df84460f56778fcc0d48116efa96bd41`.
- `git diff --exit-code origin/main origin/devel` 및 c7cc1ee6↔devel 비교: 성공. PR #125의 [42951652590](https://github.com/postmelee/alhangeul-tauri/actions/runs/42951652590) Node/Studio·Windows PS·required 모두 SUCCESS를 다시 확인. main PR 자체에는 해당 trigger/check가 없다.
- `git diff --exit-code 2de5aa319d29e125bec0efc58f9e5526fc4a65d6 origin/main -- apps crates rhwp-core.lock third_party/rhwp pnpm-lock.yaml package.json`: 차이 없음. 이후 차이는 수용 하네스/문서이며 생성 workflow의 추가 mode는 기존 artifact/updater 생성 경계를 변경하지 않는다.
- `node scripts/check-product-version.mjs`: 5곳 0.1.3; `node scripts/check-release-metadata.mjs`: 성공. rhwp gitlink v0.9.0/c9095c5f와 고정 vendor가 유지된다.
- release 환경: 기존 reviewer postmelee, prevent_self_review=false, ref 제한 없음. 기존 서명 Secret 이름 2개 존재·2026-09-22 이후 변경 없음. 값은 조회하지 않았다. github-pages는 devel만 허용한다. 보호 설정 변경 없음.
- T7 실제 mount 확인, 기존 rhwp의 누락 output/pkg/target 연결을 정책 도구로 구성: linked 3/pending []. 로컬 빌드 없음.
- `git diff --check`: 성공.

## 잔여 위험

기존 NSIS raw 12 실패/thumbnail not-accepted, 강제 MSI 3010/post-reboot-unverified, Authenticode 미서명을 유지한다. 최종 파일에서 같은 패턴인지 확인하며 새 실패는 별도로 회복한다. 키 복구본 내용은 조회하지 않았고 기존 키 관리 책임/보관 정책을 유지한다.

## 다음 단계 영향

main ref가 위 SHA인 것을 dispatch 직전 확인한다. 일반 artifact는 all/full/run_tests=true, updater는 version0.1.3/tagv0.1.3/publish_release=false로 같은 source에서 만든다. 동시 ref concurrency를 고려해 순차 dispatch/실행을 확인한다. public tag/Release/Pages는 아직 변경하지 않았다.

## 승인 기록

작업지시자의 2026-11-11 “등록하고 릴리즈 완료까지 계속 진행해줘.”에 따라 Stage 2로 이어간다. 실제 서명 환경의 정상 reviewer 절차를 적용하며 bypass나 보호 변경은 하지 않는다.
