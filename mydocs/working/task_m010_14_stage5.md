# Task #14 Stage 5 보고서 — Windows thumbnail 공식 문서와 회귀 gate 정렬

GitHub Issue: [#14](https://github.com/postmelee/alhangeul-tauri/issues/14)
구현계획서: [`task_m010_14_impl.md`](../plans/task_m010_14_impl.md)
Stage: 5

## 단계 목적

Stage 1~4에서 확정하고 hosted Windows에서 검증한 Windows Explorer thumbnail의 process, IPC, fallback, resource, cache와 installer 소유 경계를 공식 문서로 정렬한다. 플랫폼 중립 회귀 gate를 다시 실행해 Stage 6 exact-SHA Explorer 수동 수용에 넘길 문서·source 기준선이 일치하는지 확인한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/architecture/WINDOWS_THUMBNAILS.md` | 158줄 신규 문서. 고정 CLSID·filename, COM handler/worker 분리, direct-first protocol, resource budget, cache, registry transaction, 자동·수동 gate와 unsigned 제한 기록 |
| `README.md` | hosted 자동 gate가 실제 Shell bitmap까지 통과했지만 Explorer UI 수용과 공개 installer는 미완료임을 명시 |
| `docs/README.md` | 공식 아키텍처 문서 인덱스에 Windows thumbnail 문서 추가 |
| `docs/DEVELOPMENT.md` | handler·worker·공유 core 구조, 소유 경계, 실제 package script와 artifact 검증 명령, 현재 기능 상태 정렬 |
| `docs/architecture/UPSTREAM.md` | desktop preview와 worker만 pinned native `rhwp` render를 사용하고 COM DLL은 protocol-only라는 경계 추가 |
| `docs/operations/DESKTOP_RELEASE.md` | native workflow의 thumbnail build·PE·installer/Shell gate와 Stage 4 exact SHA/run 증적, 재실행 조건과 수동 gate 경계 기록 |
| `mydocs/orders/20260826.md` | Stage 5 완료와 Stage 6 승인 대기 상태 반영 |

모든 기존 공식 문서는 권장 300 LOC 이하를 유지했다. 가장 긴 `docs/operations/DESKTOP_RELEASE.md`는 294줄이고 신규 아키텍처 문서는 158줄이다.

## 본문 변경 정도 / 본문 무손실 여부

기존 문서를 전면 재작성하지 않았다. README와 문서 인덱스에는 현재 상태와 링크만 추가했고, `UPSTREAM.md`와 `DESKTOP_RELEASE.md`에는 승인된 thumbnail 경계와 exact 검증 증적을 해당 기존 절에 삽입했다. `DEVELOPMENT.md`의 실제 구현과 달랐던 HWPX 저장·autosave 두 문장은 현재 README와 source 경계에 맞게 부분 교정했다. 기존 release, upstream, 인쇄와 artifact 증적은 삭제하거나 의미를 바꾸지 않았다.

## 검증 결과

실행 명령:

```bash
git diff --check
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

결과:

- OK — `git diff --check`: 오류 없음
- OK — product boundary: 262 files scanned
- OK — product version: root, desktop package, Cargo manifest·lock과 Tauri config 모두 `0.1.0`
- OK — release metadata: `Alhangeul 0.1.0`
- OK — rhwp pin: `v0.8.2` / `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 일치
- OK — automation: 232 tests passed. thumbnail core/build/registration, Windows packaging·installer smoke와 workflow 계약 포함
- OK — upstream: 35 tests passed
- OK — Studio: 21 files, 97 tests passed
- OK — Studio production build: 213 modules transformed, `dist` 생성 성공

격리 worktree에는 처음 `node_modules`가 없었으므로 `pnpm install --frozen-lockfile`로 lockfile 그대로 479 package를 local store에서 연결한 뒤 Studio test/build를 실행했다. 설치와 build 뒤 tracked source 추가 변경은 없었다.

## 잔여 위험

- hosted 자동 gate는 COM activation과 실제 HWP/HWPX Shell bitmap을 확인했지만 Explorer 보기 크기·DPI·cache 갱신의 화면 결과는 확인하지 않았다.
- 한컴이 설치된 사용자 환경의 기존 thumbnail handler/default app 공존과 uninstall 복원은 Windows VDI 수동 수용이 필요하다.
- 검증 artifact는 unsigned, 14일 보존 진단물이며 SmartScreen·조직 보안 정책과 공개 배포 적합성을 검증하지 않는다.
- Stage 5 문서를 포함한 새 exact SHA는 아직 push·native workflow dispatch하지 않았다.

## 다음 단계 영향

- Stage 6은 Stage 5 commit을 포함한 exact SHA를 `publish/task14`에 push하고 CI/native workflow의 checkout SHA와 모든 job 성공을 확인한다.
- 같은 exact artifact를 Windows VDI에서 설치해 Explorer HWP/HWPX 첫 페이지, 보기 크기·DPI·cache 갱신, 손상·제한 fallback, 한컴 공존과 uninstall cleanup을 수동 확인한다.
- Stage 6에서도 release tag, GitHub Release, 코드 서명, package 게시와 updater 활성화는 수행하지 않는다.

## 승인 요청

- Stage 5 산출물과 검증 결과를 승인하면 Stage 6 Windows x64 exact-SHA Explorer 수용으로 진행한다.
