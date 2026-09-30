# Task #85 Stage 3 — 공개 문서 통합 검증과 PR 인계

GitHub Issue: [#85](https://github.com/postmelee/alhangeul-tauri/issues/85)
구현계획서: [task_m010_85_impl.md](../plans/task_m010_85_impl.md)
Stage: 3

## 단계 목적

공개 Markdown·양식의 실제 표시, 기존 문서/Pages/upstream 계약과 제품 불변을 검증하고
최종 보고·devel 대상 Open PR을 준비한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| .github/ISSUE_TEMPLATE/bug_report.yml | 실제 preview에서 드러난 rhwp URL 자동 링크의 한국어 접미사 문제를 명시적 Markdown 링크로 보정 |
| mydocs/working/task_m010_85_stage3.md | 통합 검증·기본 브랜치 체크·인계 기록 |
| mydocs/report/task_m010_85_report.md | 수용 결과·원격 설정·검증 한계·후속 작업 |
| mydocs/orders/20260930.md | 구현·로컬 검증 완료 및 PR 검토/병합 대기 기록 |

## 본문 변경 정도 / 본문 무손실 여부

Stage 1~2 문서 내용은 유지한다. 폼 설명의 URL 표기 한 곳만 수정해 실제 클릭 주소를 보존했다.
제품·사이트 소스·upstream·lockfile·workflow·release/tag/manifest 변경은 없다.

## 검증 결과

```sh
pnpm run check:product-boundary
pnpm run build:pages
pnpm run check:pages
node --test tests/rhwp-managed-references.test.mjs tests/pages.test.mjs tests/pages-design.test.mjs tests/pages-showcase.test.mjs
python3 /tmp/task85-doc-audit.py --network
git diff --check
```

- OK: 기존 회귀 59 passed / 0 failed / 0 skipped. README pin·Pages 데이터/설계/OS 화면 계약 유지.
- OK: product boundary 730 files scanned. Pages build 16 source files / 2 root assets,
  Pages check source=16 / output=19. 빌드 결과는 배포하지 않았다.
- OK: 공개 문서·폼의 로컬 링크/이미지 41개와 anchor 1개 정상. 서로 다른 외부 URL 17개 중
  공개 16개 HTTP 200, 로그인 필요한 비공개 보안 제보 경로는 enabled=true API로 확인.
- OK: 실제 `publish/task85` GitHub README preview에서 이미지 5개 모두 로드, 원시 강조 기호 없음.
  CONTRIBUTING/SECURITY/CODE_OF_CONDUCT도 실제 GitHub 제목·본문 정상 표시.
- OK: GitHub bug/feature Issue Form preview에서 이름·설명·label과 필수/선택 항목 정상 표시.
  bug upstream 비교에 필수 별표 없음. 발견한 데모 URL 문제는 수정 후 GitHub Markdown API의
  href가 정확히 `https://edwardkim.github.io/rhwp/`인지 확인했다.
- OK: Stage 2의 About/homepage/topics/private reporting read-back 유지, task/PR template hash 불변.
- OK: devel 원격 SHA는 작업 기준선 `f5702ce56b07421b0cad6c9119a2bd2afe4a06ad`와 같다.
- OK: 변경 파일은 승인한 문서·폼·내부 기록에 한정, `git diff --check` 통과.

## 잔여 위험

- 실제 기본 브랜치 Community Standards UI는 Description/README/License/Issue templates/PR template
  5개 Added, 행동 강령/Contributing/Security policy 3개 Not added yet다. 새 파일은 게시 브랜치에
  존재하므로 PR 병합 뒤 8개 전체 체크를 다시 확인해야 한다. API health score로 이를 대체하지 않는다.
- 제출은 Open PR까지다. 병합·이슈 close·새 릴리즈·Pages 배포는 실행하지 않는다.
- `fast` CI는 최종 PR head에 대해 실행하고 결과를 기다리지 않는다. 링크와 미수용 상태를 PR에 남긴다.
- 문서 작업이므로 제품 native 재빌드·실제 이메일/취약점 전송·전체 제품 수용을 반복하지 않았다.

## 다음 단계 영향

- CI 완료 통보 후 해당 head 결과를 확인하고 PR 검토/병합을 진행한다.
- 병합 후 Community Standards 8개와 기본 브랜치 chooser·문서 연결을 확인한다.
- 기존 첫 릴리즈 위험은 그대로이며, 다음 릴리즈에서 실제 production N→N+1을 검증한다.

## 승인 상태

작업지시자의 PR 생성까지 계속 진행 승인에 따라 최종 보고와 publish/task85 → devel Open PR을 게시한다.
병합·이슈 종료 승인은 포함하지 않는다.
