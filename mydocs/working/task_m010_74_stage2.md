# Task #74 Stage 2 완료보고 — 로컬 글꼴 사용 선택 지속·복원

GitHub Issue: [#74](https://github.com/postmelee/alhangeul-tauri/issues/74)
구현계획서: [`task_m010_74_impl.md`](../plans/task_m010_74_impl.md)
Stage: 2
작성일: 2026-09-24
검증 소스: `ebe57297e84cab8426b44558200093e05936df5a`

## 단계 목적

로컬 글꼴 사용/미사용 선택을 native 설정으로 저장·복원하고 문서 진입·새 창에서 같은 선택을
읽게 한다. 취소·저장 실패·감지 실패를 구분하고 upstream의 고정 저장 성공 안내를 제품의
실제 상태 안내로 교체한다. 실제 renderer 공급·표시 수용은 Stage 3·4에 남긴다.

Stage 1 보고 뒤 “진행해줘.”로 Stage 2 착수를 승인받았다. 중간 검증 후보 보고 뒤 다시 받은
“진행해줘.”로 후보 push와 native CI 1회 실행을 승인받아 수행했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/local_font_preferences.rs`, `local_font_commands.rs`, `lib.rs` | version 1 선택 전용 설정, 원자 저장, mutex·revision, 창 이벤트·snapshot command |
| `apps/desktop/src-tauri/src/local_font_preferences_tests.rs` | 실제 디스크 복원·취소·손상·저장 실패·삭제·동시 쓰기 회귀 6개 |
| `apps/studio-host/src/core/local-font-preferences.ts`, `local-font-state.ts`, `local-fonts.ts` | 선택·목록 상태 분리, 임시 선택, 응답 세대 검사, 자동 복원·감지 합치기 |
| `apps/studio-host/src/core/local-font-controller.ts`, `local-font-lifecycle.ts` | 문서 진입, 안내, 수동 재감지, 뷰 갱신, focus·창 이벤트·cleanup |
| `apps/studio-host/src/ui/desktop-local-font-settings.ts` | 기존 ModalDialog 기반 사용/미사용·재감지 UI와 정확한 상태 문구 |
| `apps/studio-host/local-font-entry-hooks.ts`, `vite.config.ts`, `vitest.config.ts` | exact main 함수 진입점 2곳과 설정 메뉴 marker, 불일치 시 build 실패 |
| `apps/studio-host/src/command/dispatcher.ts` | native 설정 command 및 lifecycle 등록·회수 |
| 대응 Studio `.test.ts` | 실제 upstream 소비자, 상태·동시성·오류, hook·UI action·cleanup 회귀 |
| `docs/architecture/UPSTREAM.md` | 승인된 문서 위치에 두 hook과 설정 저장 의미·소유 경계 반영 |
| `mydocs/plans/task_m010_74*.md`, `mydocs/orders/20260924.md` | 단계·CI 승인과 결과, 다음 단계 승인 대기 기록 |

## 본문 변경 정도 / 본문 무손실 여부

- upstream source·Stable pin·bundled WASM·lockfile·12개 alias는 유지했다. 허용 글꼴 root와 제한 family 정책도 변경하지 않았다.
- `stored`와 `native-preference`는 실제 사용 선택 저장을 뜻한다. 목록·글꼴 bytes 저장이나 모든 renderer 적용 완료로 설명하지 않는다.
- 미사용은 직접 감지·공급을 중단하며 OS 글꼴 해석을 차단하지 않는다. 취소는 native 메모리에만 유지하고 저장 실패는 해당 창 임시 선택으로 안내한다.
- 두 exact entry hook은 초기 복원과 Tauri 안내 분기만 추가한다. 일반 browser의 upstream 안내 본문은 유지한다.
- 뷰 갱신은 기존 공개 lifecycle을 사용한다. dirty·serializer·원본 글꼴명 변경을 추가하지 않았다. 저장/재열기 실사용 회귀는 Stage 4에 남긴다.
- 승인된 중간 검증 커밋을 유지한다. 이번 보고 커밋은 문서만 추가·갱신하며 검증된 제품 소스와 workflow를 변경하거나 이력을 재작성하지 않는다.

## 검증 결과

로컬 플랫폼 중립 명령:

```bash
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

- 제품 경계: 644 files scanned, 통과.
- upstream: 36 passed, 0 failed.
- Studio: 35 files, 212 passed. 설정 실패의 임시 선택, 취소, 응답 순서 역전·늦은 감지, 문서 교체, 실패 후 fallback 갱신과 UI action을 포함한다.
- build: 241 modules transformed, 통과. 기존 externalization·chunk 크기·정적/동적 import 경고 유지.
- upstream worktree clean, pin `496333b27d21ddb9114ba9ae340bcb895870c9a7` 불변.

승인된 원격 실행:

```bash
git push origin ebe57297e84cab8426b44558200093e05936df5a:refs/heads/publish/task74
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task74 -f scope=full -f profile=native
```

| 근거 | 결과 |
|---|---|
| run / attempt | [35969672923](https://github.com/postmelee/alhangeul-tauri/actions/runs/35969672923) / 1, completed/success |
| workflow / source SHA | 모두 `ebe57297e84cab8426b44558200093e05936df5a`; API·checkout 로그에서 확인 |
| profile / scope | `native` / `full`; scope 이름은 full artifact 수용을 뜻하지 않음 |
| fast Node·Studio | 성공; Studio 212개, upstream 36개 및 build 포함 |
| fast Windows PowerShell | 성공; Windows desktop 실행 검증은 아님 |
| Linux Unit tests | 성공; automation 960개, upstream 36개, Studio 212개, build·GUI harness typecheck 등 |
| document-preview Rust | 11+4개 통과, render 및 protocol-only Clippy 통과 |
| desktop Rust | 183+21+3개 통과, 0 failed; 새 설정 회귀 6개 모두 `ok` |
| desktop Clippy | `pnpm run clippy:desktop`, `-D warnings` 통과 |
| artifacts / installer | profile에 따른 skipped; 설치본 생성·검증 결과 없음 |

계획의 집중 명령 `pnpm run test:desktop -- local_font_preferences`보다 넓은 전체
`pnpm run test:desktop`를 Linux에서 실행해 동일 6개를 포함한 결과를 확인했다.
디스크 파일을 읽는 새 native service 복원 테스트는 통과했지만 실제 앱 종료·재실행 GUI 수용과는 구분한다.
CI 원문은 run 로그와 로컬 `/tmp/task74-stage2-native-ci.log`에 보존했다.

## 잔여 위험

- Windows desktop Rust·Windows/Linux 설치본 GUI와 실제 글꼴 적용은 아직 검증하지 않았다. native profile 성공을 최종 full 수용으로 처리하지 않는다.
- UI 회귀는 제품 body/action을 실행하고 upstream modal shell을 대체한다. 실제 keyboard/focus 검증은 설치본 수용에 남긴다.
- 등록된 FontFace 회수, bytes 실패 cache, CanvasKit 재준비와 실제 표시 증거는 Stage 3·4 대상이다.
- 로컬 Docker 이미지 조회는 containerd I/O 오류로 실패했다. 엔진·기존 컨테이너를 변경하지 않았고 native 검증은 승인된 Linux CI에서 수행했다.

## 다음 단계 영향

- Stage 3에서 필요 글꼴 공급, 소유 FontFace 회수, 실패·삭제·재감지 cache 무효화와 renderer 공개 lifecycle 연결을 검증한다.
- native 선택 지속·창 상태 기반은 이번 단계 결과를 사용한다. 테스트의 목록 수·저장 상태만으로 화면 적용을 선언하지 않는다.
- Stage 4에서 최종 exact 후보의 full과 Windows/Linux 설치본을 별도 승인받아 수용한다.

## 승인 요청

- Stage 2 산출물·검증 결과 검토와 Stage 3 진입 승인.
- 추가 CI 실행·최종 PR·릴리즈는 이번 승인 범위에 포함하지 않는다.
