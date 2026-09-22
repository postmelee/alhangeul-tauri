# Task #70 Stage 4 보고서 — 최종 수용과 첫 공개 인계 준비

GitHub Issue: [#70](https://github.com/postmelee/alhangeul-tauri/issues/70)
구현계획서: [task_m010_70_impl.md](../plans/task_m010_70_impl.md)
Stage: 4, 작성일: 2026-09-22

## 단계 목적

키 보관·복구, 공개키·Secret 전환, 실제 서명 검증의 증거를 정리하여 #69가 첫 공개 준비를
재개할 수 있게 한다. #69 자체의 공개 Go 판단이나 실행을 대신하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/report/task_m010_70_report.md` | 최종 수용 기준·증거 및 #69 인계 순서 |
| 본 보고서 | 마지막 단계 검증과 승인 경계 |
| #70 계획·오늘할일 | 구현·검증 완료, PR 승인 대기 |

## 본문 변경 정도 / 본문 무손실 여부

제품·검사 코드는 Stage 3 후보 이후 변경하지 않았다. #69 원래 worktree의 계획·버전 기록은
수정하지 않고 인계 내용을 #70 최종 보고에 둔다. 통합 후 양쪽 오늘할일·문서를 보존하여 병합한다.
기존 성공·실패 시점 기록과 공개 fingerprint를 보존하고 비밀·실제 비밀 보관 경로는 추가하지 않았다.

## 검증 결과

```text
git diff --exit-code 70fa1dd HEAD -- apps scripts tests .github docs site pnpm-lock.yaml
pnpm run check:release-metadata
git diff --check
git log --oneline cf0aac9..HEAD
```

- OK — 검증 source `70fa1dd407ec4abcbe3cf496f7ec01aee884377c` 이후 변경은 내부 결과 문서뿐이다.
  metadata 검사 통과. 제품·workflow 영향이 없으므로 full·서명 build를 반복하지 않는다.
- OK — Stage 1~3 근거와 최종 보고의 fingerprint·source·run/attempt가 일치한다.
  서명 archive ID/digest와 installer별 hash는 Stage 3 표를 진실 원천으로 연결했다.
- OK — #69 원래 worktree 미커밋 diff hash가 기존 확인값과 동일하다.
- OK — 계획된 문서 위치와 실제 변경 위치 일치, 상대 문서 링크·diff 검사 통과.
- 공개 상태는 Stage 3의 Release/tag 부재 및 publish skipped 관측을 인계한다.
  이번 단계에서 원격 push·PR·merge·Release·tag·Pages는 실행하지 않았다.

## 잔여 위험

- 최종 보고 완료와 PR merge는 다르다. #70 이슈는 아직 close하지 않는다.
- #69의 최종 main 후보와 공개 bytes·설치 환경 수용은 별도로 확정해야 한다.
- 비밀 보관 계정 의존·암호 재사용 및 과거 키 시험 설치본의 재설치 한계는 최종 보고에 남긴다.

## 다음 단계 영향

- 승인 후 #70 최종 커밋을 `publish/task70`으로 push하고 devel 대상 PR을 준비한다.
- merge 확인 후 cleanup 절차를 거쳐 #69 원래 변경을 보존한 채 최신 devel을 통합한다.
- #69에서는 키 준비 차단 해소만 반영하고, 환경/후보/게시 범위의 미확정을 자동 승인하지 않는다.

## 승인 요청

- Stage 4와 최종 보고를 승인하면 #70 원격 push·PR 게시를 진행한다. merge·릴리즈는 별도다.
