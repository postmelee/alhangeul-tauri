# Task #74 Stage 3 완료보고 — 필요한 글꼴 공급과 캐시 회수

GitHub Issue: [#74](https://github.com/postmelee/alhangeul-tauri/issues/74)
구현계획서: [`task_m010_74_impl.md`](../plans/task_m010_74_impl.md)
Stage: 3
작성일: 2026-09-24
구현 전 HEAD: `170a0019b78364253436ea94534f54d1a2f5ce15`

## 단계 목적

Stage 2에서 복원한 선택을 실제 CSS FontFace·CanvasKit bytes 공급과 연결한다. 문서 전환,
재감지, 미사용 전환, 삭제·읽기 실패와 늦은 응답에서 이전 글꼴 자원이 남지 않게 한다.
Stage 2 보고 뒤 “진행해줘.”를 Stage 3 착수 승인으로 적용했다. 추가 push/CI는 실행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/src/core/local-font-provider.ts` | 소유 FontFace·등록 promise·bytes·실패를 세대별 관리, 중복 합치기·회수·늦은 응답 폐기 |
| `apps/studio-host/src/core/local-font-records.ts` | 제한 family/alias 제외, bytes 요청용 face 식별자 유지 |
| `apps/studio-host/src/core/local-fonts.ts` | 실패한 file-backed resolve 제외, PostScript alias 처리, 모호한 face 거부, 공급 중 세대 확인 |
| `apps/studio-host/src/core/local-font-controller.ts` | 문서 진입 시 필요한 파일 재확인, 최초 선택·재감지 시 공급 후 기존 뷰 callback 실행, 종료 시 회수 |
| `apps/studio-host/src/core/local-font-application.test.ts` | 실제 upstream 표시 체인·CanvasKit/RendererSession을 포함한 공급 회귀 10개 |
| `apps/studio-host/src/core/local-fonts.test.ts` | 임의 bytes를 공개 정적 TTF로 교체, 기존 bridge 계약 유지 |
| `tests/gui/local-fonts/Abel-Regular.ttf`, `OFL.txt`, `manifest.json` | 공식 Google Fonts exact commit의 unmodified 정적 TTF·라이선스·SHA-256 |
| `tests/gui/local-fonts/abel.hwp`, `abel.hwpx`, `generate.mjs` | bundled WASM으로 생성한 공개 Latin 문서와 생성 절차 |
| `tests/gui/local-fonts/fixture.mjs`, `fixture.test.mjs` | 무결성·격리 root 설치/회수·관측 기록 helper, 문서 저장/재열기 계약 |
| 구현계획·오늘할일 | Stage 3 승인·세부 구현·검증 상태 |

## 본문 변경 정도 / 본문 무손실 여부

- native root·read 검증, upstream source, Stable pin, bundled WASM, lockfile과 기존 12개 alias는 변경하지 않았다.
- 문서 진입은 catalog를 재사용하면서 provider만 새 세대로 시작해 필요한 bytes를 다시 읽는다. 재감지는 catalog도 무효화한다. 미사용·창 종료는 provider가 소유한 FontFace만 회수한다.
- file-backed 공급 실패는 표시용 resolve에서 제외한다. system-installed의 OS 해석은 유지하되 허용 root 밖 bytes 실패를 성공으로 처리하지 않는다.
- catalog에는 collection index·variation coordinate가 없으므로 standalone static sfnt TTF/OTF만 직접 공급한다. TTC/OTC·가변 face·기타 미확인 container는 fallback으로 둔다. native의 허용 확장자/root를 넓히지 않는다.
- CanvasKit private map에는 접근하지 않는다. 기존 공개 `RendererSession.invalidateDocument()`가 `resetDocumentResources()`를 호출해 성공·실패 cache를 회수한다.
- 글꼴 변경은 뷰 갱신 callback에 한정되며 dirty·serializer 변경을 추가하지 않았다. 공개 fixture의 저장/재열기 후 Abel 글꼴명과 본문은 보존된다. 설치본에서의 dirty/undo·원본 문서 수용은 Stage 4에 남는다.
- 제품 공식 문서는 Stage 4에서 실제 수용 결과에 맞춰 갱신한다. 이번 단계의 fixture metadata는 승인된 `tests/gui/local-fonts/`에 둔다.

## 검증 결과

```bash
pnpm --filter @postmelee/alhangeul-studio-host test src/core/local-font-application.test.ts src/core/local-font-consumers.test.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
node --test tests/gui/local-fonts/fixture.test.mjs
git diff --check
```

- 집중 회귀: 2 files, 16 passed. 실제 upstream 소비자 상태와 공급 lifecycle을 함께 확인했다.
- 제품 경계: 653 files scanned, 통과.
- upstream: 36 passed, 0 failed.
- Studio 전체: 36 files, 222 passed.
- build: TypeScript·Vite 통과. 기존 externalization·chunk·정적/동적 import 경고 유지.
- fixture 계약: 3 passed. 고정 hash, 두 형식에서 각각 HWP/HWPX export 후 글꼴명·본문 보존, 기존 파일을 덮어쓰지 않는 설치·회수, 공급 수치만으로 수용 선언하지 않는 관측 기록을 확인했다.
- upstream worktree clean, native·pin·lock diff 없음. native 소스가 바뀌지 않아 추가 Rust CI는 실행하지 않았다. Stage 2 CI 성공을 이번 frontend 후보의 전체 수용으로 대체하지 않는다.
- 출력은 `/tmp/task74-stage3-{focused,boundary,upstream,studio,build,fixture}.log`에 보존했다.

주요 회귀 근거:

- 병렬 요청은 파일 읽기와 FontFace 등록을 한 번만 수행한다. 미사용 전환 후 외부 소유 FontFace는 남고 제품 소유 객체만 제거된다.
- 읽기·등록·감지 중 세대가 바뀌면 이전 요청은 새 자원을 등록하거나 실패 상태를 덮어쓰지 않는다.
- 다음 문서에서는 필요한 bytes를 다시 읽고 catalog 전체는 재스캔하지 않는다. 파일 삭제 후 resolve가 사라지고 명시적 재감지에서 회복된다.
- 실제 `fontFamilyChainForDisplay`가 Abel의 PostScript alias를 로컬 family로 우선 연결한다. 동명 face는 추측하지 않으며 제한 family는 resolve/공급에서 제외한다.
- 실제 CanvasKit `prepareLocalFonts`의 실패 cache는 catalog 재감지만으로는 유지되고, 공개 session 무효화 후 다시 등록된다. 성공 cache도 무효화 때 native 객체를 회수한다. 테스트에서는 native font parser 경계만 대체했으며 화면 raster 수용은 아니다.

## 잔여 위험

- Windows/Linux 실제 WebView·CanvasKit 화면과 metric은 아직 검증하지 않았다. CSS chain·등록 수·bytes 성공을 화면 적용 완료로 해석하지 않는다.
- 동일 family의 웹 대체 글꼴과 OS 글꼴 사이 실제 선택 우선순위, dirty/undo·저장·재열기와 PDF/인쇄/썸네일 최소 회귀는 Stage 4에서 확인한다.
- Abel은 Latin fixture이며 한글 coverage나 모든 face/container 지원 근거가 아니다. fixture 출처·hash는 manifest에 고정했다.
- 설치 helper는 임시 디렉터리 계약만 검증했다. 실제 Windows/Linux 사용자 폰트 root에 fixture를 설치하거나 기존 시스템 글꼴을 변경하지 않았다.
- raw 관측 수집은 `acceptance=unverified`를 유지한다. screenshot·metric·renderer·후보 SHA를 함께 검토해야 실제 수용할 수 있다.

## 다음 단계 영향

- Stage 4에서는 이 단계 커밋을 후보로 non-force push하고 `ci.yml`의 `profile=full`, `scope=full`을 1회 실행하도록 승인받는다. Windows x64·Linux x64/arm64 필수 job과 설치/package 결과를 확인한다.
- 같은 후보의 Windows x64·Linux x64 설치본에서 최초 선택, 반복 문서, 새 창, 재실행, 미사용, 재감지, 삭제·실패 시나리오를 확인한다. 환경이 없으면 미실행으로 남긴다.
- 승인된 공식 문서와 Stage 4 보고는 실제 확인한 renderer·공급·표시 결과에 맞춰 작성한다.

## 승인 요청

- Stage 3 결과 검토 및 Stage 4 진입.
- 이 단계 커밋의 `publish/task74` non-force push와 동일 SHA의 full CI 1회 실행.
- 실제 설치본 수용 이후에만 최종 보고·PR 단계로 진행한다. 릴리즈·서명·게시·updater 활성화는 포함하지 않는다.
