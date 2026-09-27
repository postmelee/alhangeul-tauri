# Task #74 Stage 1 완료보고 — 로컬 글꼴 소비자 상태 통합

GitHub Issue: [#74](https://github.com/postmelee/alhangeul-tauri/issues/74)
구현계획서: [`task_m010_74_impl.md`](../plans/task_m010_74_impl.md)
Stage: 1
작성일: 2026-09-24
기준: `local/task74`, 구현 전 HEAD `4f5e088`

## 단계 목적

감지에 쓰는 Alhangeul adapter와 실제 upstream 상태 분석·표시 글꼴 체인이 하나의 상태를 읽도록 연결한다. 이번 단계는 반복 안내의 분리 캐시 원인을 보정하며 설정 지속·재실행 복원·실제 renderer 적용 수용은 다음 단계로 남긴다.

구현계획 보고 후 같은 task의 “진행해줘.”를 구현계획과 Stage 1 착수 승인으로 적용했다. 원격 push, CI dispatch와 Stage 2는 실행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/local-font-overrides.ts` | 32 LOC. exact upstream 상대 import 두 곳을 기존 adapter로 연결하는 pre resolver |
| `apps/studio-host/vite.config.ts`, `vitest.config.ts` | production과 test에 동일 plugin 연결 |
| `apps/studio-host/src/core/local-fonts.ts` | 264 LOC. 소비자가 요구하는 detection method export 추가, state method와 일치 |
| `apps/studio-host/src/core/local-font-consumers.test.ts` | 127 LOC. 실제 upstream 분석·표시 체인, 반복 문서·빈 목록·초기화·실패·native 지원 회귀 6개 |
| `apps/studio-host/src/core/local-font-overrides.test.ts` | 105 LOC. 경로 경계, Vite dev 동일 module ID, build 단일 상태 모듈 검증 10개 |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | 두 config의 연결 계약 검사 추가, 기존 12개 alias·shadow 부재 검사 유지 |
| `docs/architecture/UPSTREAM.md` | 승인된 공식 위치에 상대 import resolver 경계와 수용 한계 1문단 추가 |
| `mydocs/plans/task_m010_74*.md`, `mydocs/orders/20260924.md` | 승인·단계 상태, 실제 표시 체인 테스트 진입점 반영 |

## 본문 변경 정도 / 본문 무손실 여부

- `third_party/rhwp` source, Stable pin, bundled WASM, native Rust, package/lockfile은 변경하지 않았다.
- 기존 12개 alias와 entry/renderer 소유권을 유지한다. resolver는 `core/document-font-status.ts`, `core/font-substitution.ts`의 정확한 `./local-fonts.ts` import만 처리한다. 다른 importer·raw query·다른 module은 변경하지 않는다.
- 기존 상태 API에서 `stored`의 메모리 snapshot 의미는 아직 유지된다. false를 무조건 true로 바꾸거나 문서마다 prompt flag를 강제로 끄지 않았다. native 설정 저장과 안내 정합은 Stage 2 대상이다.
- 표시 체인의 실제 local-font 소비자는 `resolveFont` 자체가 아니라 이를 호출하는 `fontFamilyChainForDisplay`임을 확인해 구현계획의 테스트 진입점을 정밀화했다. 범위 확대는 없다.
- 공식 문서 기존 본문은 유지하고 resolver 설명만 추가했다.

## 검증 결과

실행 명령:

```bash
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm --filter @postmelee/alhangeul-studio-host test src/core/local-font-consumers.test.ts
pnpm --filter @postmelee/alhangeul-studio-host test src/core/local-font-consumers.test.ts src/core/local-font-overrides.test.ts src/core/local-fonts.test.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
git -C third_party/rhwp status --porcelain --untracked-files=all
git diff --exit-code -- rhwp-core.lock pnpm-lock.yaml third_party/rhwp
```

결과:

- **원인 재현**: native IPC만 mock하고 실제 upstream 소비자를 실행했다. 브라우저 지원 stub을 맞춘 수정 전 5개 검사에서 4개가 예상대로 실패했다. 감지 후 adapter는 `stored=true`이나 report는 `localSnapshotLoaded=false`, `localSnapshotStored=false`, `localSnapshotComplete=false`, `shouldPromptLocalAccess=true`였다.
- **집중 회귀 OK**: 최종 `3 files / 20 tests passed`. 같은/상이 문서의 감지 결과 재사용, 빈 목록의 조사 완료와 미조사 구별, force 재조회·clear·조회 실패 반영, Local Font Access API 없는 Tauri 지원 여부를 확인했다.
- **Vite 경계 OK**: dev container에서 상대 import와 alias가 같은 adapter ID로 resolve됐다. 실제 두 upstream 소비자를 포함한 메모리 build의 모듈 목록에서 `core/local-fonts.ts`는 Alhangeul adapter 하나이며 별도 upstream 상태 모듈이 없다.
- **제품 경계 OK**: `Product boundary check passed (629 files scanned)`.
- **upstream OK**: `36 tests / 36 pass / 0 fail`. exact pin·managed artifact·변조 거부·갱신 script 계약을 검증했다.
- **Studio 전체 OK**: `29 files / 183 tests passed`.
- **Studio build OK**: TypeScript와 Vite build 완료, 236 modules transformed. CanvasKit의 Node 모듈 externalization, Tauri 정적/동적 import 혼용과 500 kB 초과 chunk 경고는 남아 있으며 오류는 아니다. 이번 단계에서 bundle 분할 범위를 추가하지 않았다.
- **diff/pin OK**: `git diff --check` 통과. gitlink와 tag는 `496333b27d21ddb9114ba9ae340bcb895870c9a7`, submodule 최종 status는 빈 출력이다. pin/lockfile diff도 없다.
- **환경 복구**: 초기 sandbox 내 pnpm 요청은 DNS 제한으로 실패해 중단한 뒤 허용된 네트워크 접근으로 frozen install을 완료했다. submodule 초기화 때 non-pointer Git LFS 경고와 sandbox metadata 쓰기 제한이 있었으나 허용된 Git 상태 확인 뒤 최종 clean을 확인했다. tracked upstream 파일·LFS 정책·원래 checkout은 수정하지 않았다.
- **미실행**: Windows/Linux native·GUI·설치본 검증, CI fast/full, 릴리즈·서명·원격 push. 현재 실행은 플랫폼 중립 검증이며 실제 설치본에서 반복 모달이 사라졌다는 수용 결과는 아니다.

## 잔여 위험

- `loadStoredLocalFonts`는 아직 메모리 snapshot이며 재실행 지속이 없다. 고정된 저장 성공 안내와 미사용 선택 지속도 Stage 2에서 해결해야 한다.
- system 목록과 실제 bytes 읽기/renderer 등록/화면 적용은 다르다. file-backed 폰트의 등록 해제·실패 cache·CanvasKit 결과는 Stage 3 이후 수용 대상이다.
- resolver는 pinned source의 두 import 경계를 대상으로 한다. upstream 갱신 시 import 변경을 다시 확인해야 하며 이번 task는 pin을 갱신하지 않는다.
- native catalog mock은 실제 Windows/Linux 글꼴 설치·권한·WebView 환경을 대신하지 않는다.

## 다음 단계 영향

- Stage 2에서 native 설정 저장·복원, 사용/미사용/취소, 창 간 revision, 두 entry hook과 수동 설정 UI를 구현한다.
- `stored`를 실제 native 선택 저장과 연결하면 이번 회귀의 상태 기대도 그 계약에 맞춰 갱신하되 단일 소비자 상태 검증은 유지한다.
- Stage 2 native test는 Windows/Linux 실행 환경이 필요하다. 원격 push/CI가 필요하면 exact 후보와 범위를 제시해 별도 승인받는다.

## 승인 요청

- Stage 1 산출물·검증 결과 검토와 Stage 2 진입 승인.
- 이번 보고는 Issue #74 전체 완료나 실제 설치본 글꼴 적용 수용이 아니다.
