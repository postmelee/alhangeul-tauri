# Task #113 Stage 3.3 — 문서 재로드 없는 글꼴 리소스 갱신 보정

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 승인된 Stage 3 안의 제품 보정 3.3
상태: 로컬 보정·회귀 완료 / 새 exact source의 원격 수용 진행
확인일: 2026-10-08 (Asia/Seoul)

## 단계 목적

보정 전 FF의 CanvasKit 글꼴 삭제·재감지에서 canvas가 사라진 문제에 대해 문서 전체
invalidate/load 대신 upstream font-resource API를 호출한다. 실제 진단은 renderer 초기화
성공·오류 없음·canvas 0개이며, 새 API의 실제 GUI 수용은 이번 로컬 보고 범위 밖이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/local-font-entry-hooks.ts` (64 LOC) | refreshView의 invalidate/load를 refreshFontResources 한 호출로 대체 |
| `apps/studio-host/src/core/local-font-entry-hooks.test.ts` (94 LOC) | API 계약·실제 transformed callback 순서 및 문서 교체 회귀 2건 |
| `apps/studio-host/src/core/local-font-application.test.ts` (273 LOC) | 기존 view mock 3곳을 새 API·실제 session resource reset으로 정렬 |
| 기존 계획·오늘할일 | 명시 승인, 로컬 결과와 새 bytes의 검증 경계 기록 |

## 본문 변경 정도 / 본문 무손실 여부

현재 document/view/session/renderer/decision guard와 글꼴 준비 후 paint 순서를 유지한다.
third_party content·gitlink·WASM·native lock·제품 version은 보정 전과 동일하다. 기존 회귀의
실제 CanvasKit typeface 삭제/재공급 및 document/decision 교체 뒤 paint 거부 assertion을 유지한다.
제품 변경은 공개 승인 범위를 확대하지 않으며 기존 FF의 파일/서명을 새 source에 승계하지 않는다.

## 검증 결과

```bash
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/local-font-entry-hooks.test.ts
pnpm run test:studio
pnpm run build:studio
pnpm run test:automation
pnpm run test:upstream
pnpm run typecheck:gui
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run check:action-pins
pnpm run check:release-notes
git diff --check
```

- focused **5/5**, Studio **283/283**, automation **1326/1326**, upstream **39/39** 통과.
- 초기 Studio 실패 4건은 기존 mock의 loadDocument API 불일치였다. mock 정렬 후 fail 0,
  unhandled error 0으로 통과했다. assertion/skip/timeout 완화 없음.
- Studio build·GUI typecheck 통과. 기존 chunk/dynamic-import 경고가 있으며 build exit 0이다.
- boundary 818 files, 제품 0.1.2 version/metadata, rhwp087/1a76570e...의 6 artifact,
  Action pins 29 files/165 references/11 pins, notes check 2 documents, diff check 통과.
- 로그는 `/private/tmp/task113-stage3.3-*.log`에 보존했다. 로컬 native 빌드는 수행하지 않았다.

## 잔여 위험

- 실제 CanvasKit 삭제/복구와 새 창/재시작 성공은 새 product P의 Windows/Linux GUI에서 확인한다.
- FF 전체 native·signed·PDF 성공은 보정 전 기준이다. FF local-fonts failure는 그대로 보존한다.
- 현재 tracked draft candidate/notes의 source와 6 file·3 signature는 FF다. 새 producer의 실제
  metadata가 확인된 뒤 모든 입력을 함께 갱신한다. hash/source를 임의 치환하지 않는다.
- NSIS hosted thumbnail 제한과 MSI 3010 post-reboot 미검증, Wayland/GPU·물리 printer 경계 유지.

## 다음 단계 영향

이 source·보고서 묶음 commit의 exact SHA를 product P로 계산해 ordinary all/full/tests=true와
updater 0.1.2/v0.1.2/publish=false를 같은 workflow/checkout P로 실행한다. 실제 6종 파일·
3 Minisign·전 플랫폼 설치/문서/글꼴/PDF/인쇄/thumbnail을 새 bytes로 검증한다.

## 승인 기록과 진행 경계

2026-10-08 같은 스레드의 “진행해줘”와 “최소 보정·새 source 재검증 (권장)” 답변은 최소
product 보정과 새 source 전체 빌드·비게시 production signing·6종 GUI 재검증을 승인했다.
이 로컬 하위 범위 다음의 원격 검증은 같은 승인에 따라 이어간다. Stage 3 전체 완료,
Stage 4 진입·main 승격·Release/tag/Pages/feed 공개 승인은 아직 성립하지 않았다.
