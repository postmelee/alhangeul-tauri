# `_templates/` 폴더 규칙

## 목적

하이퍼-워터폴 산출물의 출력 형식을 중앙에서 정의한다.

## 답하는 질문

"이 문서는 어떤 섹션과 제약으로 작성해야 하는가?"

## 작성 시점

새 산출물 종류가 추가되거나 기존 산출물 출력 형식을 바꿀 때.

## 허용 파일명

- `orders.md`
- `task_plan.md`
- `task_impl_plan.md`
- `stage_report.md`
- `final_report.md`
- `feedback.md`
- `tech_note.md`
- `troubleshooting.md`
- `external_pr_review.md`
- `external_pr_review_impl.md`
- `external_pr_report.md`
- `release_record.md`
- `release_notes.md`
- `website_release_note.html`
- 그 밖에 산출물 종류가 드러나는 이름

## 사용 템플릿

해당 없음. 이 폴더 자체가 템플릿 진실 원천이다.

## 제품 릴리즈 기록 양식

[release_record.md](release_record.md)는 이 저장소가 채택한 제품 릴리즈 기록 템플릿이다.
실제 결과는 `docs/releases/v<version>.md`에 작성하며 이 폴더에는 공개 이력·검증 결과를
쌓지 않는다. 준비 시 identity·검증 계획을 채우고 공개 후 승인·URL·artifact·read-back 결과를
갱신한다. 작성 순서는 [릴리즈 기록 인덱스](../../docs/releases/README.md)를 따른다.

## 사용자 릴리즈 안내 양식

[release_notes.md](release_notes.md)는 GitHub 전체 본문의 제목·토큰 규격이고,
[website_release_note.html](website_release_note.html)은 기존 사이트 디자인의 버전별 안내 규격이다.
사용자 문구와 검증된 metadata는 `docs/releases/v<version>.notes.json`에 작성한다.
`pnpm run generate:release-notes`는 검토용 본문·웹 HTML·짧은 updater notes를 만들며
`pnpm run check:release-notes`는 원문·템플릿·웹 생성물과 같은 버전 사이트 data의 drift를 검사한다.
실제 작성 명령과 승인 순서는 [릴리즈 인덱스](../../docs/releases/README.md#작성과-생성-및-검사)를 따른다.
생성·CI 성공은 공개 승인이 아니며 이 폴더에 실제 버전 결과를 쌓지 않는다.

## 반드시 포함할 내용

- 실제 파일 위치
- 작성 시점
- 작성 언어
- 필수 섹션
- 선택 섹션
- 검증 또는 승인 기준

## 두면 안 되는 내용

- 특정 task의 실제 검증 로그
- 완료 보고
- 작업지시자 승인 기록

## 다음 세션 AI가 복원해야 할 맥락

산출물별 출력 형식과, 어느 폴더에 어떤 문서를 만들어야 하는지.
