# Task #82 Stage 1 — 실제 Windows/Linux 화면 확보

GitHub Issue: [#82](https://github.com/postmelee/alhangeul-tauri/issues/82)
구현계획서: [task_m010_82_impl.md](../plans/task_m010_82_impl.md)
Stage: 1

## 단계 목적

기존 Linux 앱 이미지와 같은 원본 문서를 Windows에서 촬영하고 양쪽 탐색기에 8개 문서의
실제 첫 페이지 썸네일을 확보한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| scripts/site-capture/* | 고정 샘플, 실제 OS 촬영, 표시 설정 복원, 진단 |
| .github/workflows/alhangeul-site-capture.yml | 기존 공개 설치본 재사용, Windows/Linux 촬영 |
| tests/gui/specs/site-capture.e2e.ts | 원본 문서·100% 배율 확인 |
| site/assets/windows-editor.png | run 36676600660, 1282×924 |
| site/assets/windows-explorer.png | run 36677497300, 1180×780, 192px·4열×2행 |
| site/assets/linux-explorer.png | run 36670325455, 1180×780, 8개 첫 페이지 |

원본 PNG SHA-256:
- windows-editor: `3034cef5c00e16eda0d1a51804ab60f12d4e3594d8a9b1220061f0ef43e76c86`
- windows-explorer: `460f225615e9876aea9e3aeeca382a25e2ebaf41b71105af92a8c30878c0e35d`
- linux-explorer: `2182a6476a972533e726d5ee64875c92557aac26894aeaf30df4be3fcfce61f8`

## 본문 변경 정도 / 본문 무손실 여부

원본 문서·제품 bytes와 기존 linux-editor.png를 보존했다. 새 이미지는 artifact PNG 그대로
복사했으며 UI 합성·문서 편집을 하지 않았다. Windows는 Alt+PrintScreen 실제 창 캡처다.

## 검증 결과

```bash
node --test tests/site-capture.test.mjs tests/actions-workflows.test.mjs
pnpm run typecheck:gui
shellcheck scripts/site-capture/linux-gallery.sh
actionlint .github/workflows/alhangeul-site-capture.yml .github/workflows/alhangeul-desktop.yml
git diff --check
```

30 tests 및 위 정적 검사 통과. 위 세 Actions 성공과 실제 PNG 육안 확인.
Windows IconsOnly=1을 0으로 바꾼 후 Explorer 재시작해야 화면에 반영됐다.
run 36675197659에서 재시작 전/후 비교와 HWP/HWPX API 성공 확인. 설정 및 해상도 복원 성공.
Snipping Tool 자동화는 기대 이미지를 반환하지 않았고 내장 활성 창 캡처로 대체했다.

## 잔여 위험

OS별 기본 글꼴·도구막대·파일관리자 배치는 동일하지 않다. 촬영 성공은 모든 설치 환경의
재검증을 뜻하지 않는다. #69 잔여 범위는 이 작업에서 완료 처리하지 않는다.

## 다음 단계 영향

세 새 자산과 기존 Linux 앱 자산을 사용해 OS별 두 장을 전환한다. 릴리즈 bytes는 유지한다.

## 승인 요청

사용자가 이미지 확인 후 이번 턴에 '진행해줘'로 Stage 2 사이트 구현 진입을 승인했다.
추가 승인 없이 해당 범위 구현을 진행하며 운영 Pages 배포와 PR 병합은 포함하지 않는다.
