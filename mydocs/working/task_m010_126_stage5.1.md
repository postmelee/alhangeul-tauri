# Task #126 Stage 5.1 — 공개 웹·업데이트 입력 고정

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md)

## 단계 목적

Stage 4에서 독립 검증한 공개 파일을 웹과 production 업데이트 검증에 연결한다. devel PR과 Pages 배포에 필요한 입력을 먼저 커밋하며, Stage 5 전체 완료는 실제 공개 HTTP 및 3종 업데이트 수용 후 별도로 기록한다.

## 산출물

- published v0.1.3 notes 원문과 생성 HTML, 사이트 release data·업데이트 목록·README 현재 버전.
- 0.1.2→0.1.3 입력과 최초 feed fixture, selector·workflow 및 회귀 검사.
- Release 407055948 → 441647361, source 6dcb05e96ec2075d09d8a60160e1d82f08c0811b → bcb892d49a9003615f3acd980babd71e59e147dd.
- 최초 manifest SHA256: `91874d92fd583f6b9985fbc15ab844be33ccdd1b11041a3321ef2b6762381e52`.
- 새 tag object: `8bb3b997cd2279c1e92f440ed7d1f1810c14b7cd`, 공개 시각 `2026-11-11T12:19:34Z`.

## 본문 변경 정도 / 본문 무손실 여부

기존 버전의 notes·fixture·검증 이력은 보존한다. 최신 버전 링크만 갱신하고 v0.1.3 안내를 추가한다. 제품 바이너리·키·tag는 변경하지 않는다. 현재 문구에는 실제 업데이트 검증 완료를 주장하지 않는다.

## 검증 결과

- `pnpm run check:release-notes`: 3 documents 통과.
- `pnpm run test:release-notes`: 종료 코드 0.
- `node --test tests/pages.test.mjs tests/production-upgrade-v012.test.mjs tests/production-upgrade-v013.test.mjs tests/production-upgrade-workflows.test.mjs`: 154/154 통과.
- Windows fast job에도 신규 v0.1.3 계약을 포함해 운영체제별 입력 경로 처리를 확인한다.
- 신규 tuple·workflow 집중 검사: 19/19 통과. 이전 manifest/source/version/key, 불완전 문서·dirty 증거 및 Windows 3010을 거부한다.
- `pnpm run typecheck:gui`, `git diff --check`: 통과.
- T7 검증 복사본의 `pnpm run build:pages`, `pnpm run check:pages`: source 20 / output 24 통과.

## 잔여 위험

이 커밋만으로 Pages 게시나 실제 업데이트 성공을 의미하지 않는다. 원격 PR required, exact Pages 및 공개 HTTP 검증 후 NSIS·MSI·AppImage 업그레이드를 실행해야 한다. Stage 3·4의 알려진 제품 제한은 그대로 유지한다.

## 다음 단계 영향

중간 devel PR은 #126을 닫지 않는다. 성공한 필수 체크와 일반 merge 후 exact merged SHA로 Pages를 게시한다. 실제 업그레이드는 위 manifest와 공개 파일을 재사용하며 제품을 재빌드하지 않는다.

## 승인 기록

작업지시자의 “등록하고 릴리즈 완료까지 계속 진행해줘.”에 따라 Stage 5를 계속한다. PR·Pages·실제 업데이트 검증 결과는 후속 보고에 기록한다.
