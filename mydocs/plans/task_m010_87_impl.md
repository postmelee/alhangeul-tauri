# 公開 기본 브랜치 전환과 원격 정리 구현계획서

수행계획서: [task_m010_87.md](task_m010_87.md)
GitHub Issue: [#87](https://github.com/postmelee/alhangeul-tauri/issues/87)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 산출 | 검증 |
|---|---|---|---|
| 1 | 기준선과 운영 정책 | DESKTOP_RELEASE·Stage 1 | 제품·CI tree·문서 위치·ref 근거 |
| 2 | 원격 정리와 계약 확인 | Stage 2 | 삭제 전후 ref·관련 로컬 계약·공개 불변 |
| 3 | PR 검토와 공개 기본 전환 | Stage 3·최종 보고·PR·원격 설정 | base/head/merge·UI 8/8·Release 불변 |

## 문서 위치 확인

| 파일 | 수행계획서 위치 | 실제 위치 | 일치 |
|---|---|---|---|
| 제품 브랜치 책임 | docs/operations/DESKTOP_RELEASE.md | 기존 문서의 짧은 절 | OK |
| 단계·최종 증거 | mydocs/working·report | task_m010_87_stage{N}/report | OK |

## Stage 1 — 기준선과 운영 정책

- 시작 main fc3cad15, devel 1ee2883e와 직전 f7b4917a fast CI tree 비교.
- tag object·Release ID/11 asset·공개 manifest hash·설정·branch tip을 임시 증거로 수집한다.
- 기존 운영 문서에 기본 main·기여 devel·예약 workflow와 Pages 책임·기존 tag 보존을 추가한다.
- Git ancestry·main..devel 제품 경로 diff·docs 상대 링크·git diff --check를 확인한다.
- 커밋: `Task #87 Stage 1: 공개 기본 브랜치와 개발 운영 경계 명시`.

## Stage 2 — 원격 정리와 계약 확인

- 삭제 전 remote exact tip·ancestry·open PR·queued/in_progress run 부재를 확인한다.
- automation/rhwp-v0.8.4-full-sync, codex/task14-stage4-probe, publish/task69만 삭제한다.
- publish/task35 고유 19 commits·열린 #35·다른 checkout과 main/devel을 보존한다.
- 아래 명령으로 이번 문서 영향과 기존 제품/사이트 계약을 검증한다.

```sh
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run build:pages
pnpm run check:pages
git diff --check
```

- 새 테스트나 workflow를 추가하지 않는다. 기존 exact CI의 Windows PowerShell 근거를 재사용한다.
- 커밋: `Task #87 Stage 2: 병합된 원격 부산물 정리와 계약 수용`.

## Stage 3 — PR 검토와 공개 기본 전환

- 단계 결과·최종 보고·완료 시각을 기록하고 publish/task87 → devel Open PR을 만든다.
- 허용 파일·diff·기여/보안/공개 문구·기존 Release 불변을 검토한 뒤 승인 범위로 병합한다.
- 최신 devel → main Open PR을 만들어 제품 source 불변·충돌·CI 증거 범위를 검토하고 병합한다.
- default_branch=main만 반영한 뒤 community API/실제 8 checks·README 이미지 5개·chooser·
  Security policy·About·Pages environment devel·upstream BASE_BRANCH=devel을 확인한다.
- tag object 및 asset ID/name/size/digest, production manifest hash를 시작 baseline과 대조한다.
- 최종 source 보고서는 PR 게시 시점의 준비·검증 상태를 보존하고, 병합 후 원격 수용은 이슈와
  PR 본문에 추가한다. 설정이 아직 미반영이면 완료로 기록하지 않는다.
- 커밋: `Task #87 Stage 3 + 최종 보고서: main 전환 검증과 PR 준비`.
- 이슈 완료 종료·publish/task87/local/task87 정리 후 devel clean으로 복귀한다.

## 단계 의존성과 승인

Stage 1 → 2 → 3 순서로 검증·보고·커밋한다. 수행계획서의 명시 승인 범위에 따라 각 단계와
두 PR 검토/병합·설정 확인까지 이어간다. 새로운 소스·릴리즈·미병합 ref 삭제가 필요해지면
별도로 판단하고 범위를 확대하지 않는다. 새 Actions가 필요하면 실행 후 기다리지 않는다.

## 위험과 대응

default branch 변경으로 scheduled workflow 기준과 PR 기본 대상이 이동한다. main의 같은
workflow와 명시 devel checkout/base를 확인하고, 기존 Pages devel 제한은 바꾸지 않는다.
삭제 ref가 시작 tip과 다르면 중단한다. 다른 작업 checkout은 정리하지 않는다.
