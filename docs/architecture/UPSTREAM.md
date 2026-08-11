# upstream `rhwp` 경계

Alhangeul의 유일한 지속 upstream은 [`edwardkim/rhwp`](https://github.com/edwardkim/rhwp)다.

## 현재 고정 상태

- upstream URL: `https://github.com/edwardkim/rhwp.git`
- Stable release tag: `v0.8.2`
- resolved commit: `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`
- 읽기 전용 source submodule: `third_party/rhwp`
- 기계 검증 가능한 출처 lock: `rhwp-core.lock`
- bundled WASM: `apps/studio-host/vendor/rhwp-core`
- native Rust lockfile: `apps/desktop/src-tauri/Cargo.lock`
- WASM 생성 도구: `wasm-pack 0.15.0`
- WASM 생성 profile: `wasm-pack build --target web --release`

`rhwp-core.lock`은 repository, ref kind, release tag, resolved commit, upstream `Cargo.lock` SHA-256, WASM 도구·profile과 관리 artifact의 경로·크기·SHA-256을 기록한다. 관리 artifact는 `package.json`, JavaScript·TypeScript binding, WASM binary와 type declaration, upstream `LICENSE`다.

## Stable pin 정책

의존성 갱신은 Stable `rhwp` release tag와 그 tag가 가리키는 resolved commit을 함께 입력해야 한다. 같은 release 기준으로 다음 경계를 원자적으로 맞춘다.

1. `third_party/rhwp` source submodule
2. native Rust dependency를 고정하는 `apps/desktop/src-tauri/Cargo.lock`
3. 같은 source commit에서 새로 생성한 bundled WASM package
4. 위 출처와 artifact hash를 기록하는 `rhwp-core.lock`

branch, 이동 가능한 floating ref, tag 없이 전달된 commit은 Stable 갱신 입력으로 사용하지 않는다. preview 검증이 필요하면 Stable pin을 바꾸는 흐름과 분리된 별도 Issue에서 범위와 복구 기준을 먼저 정한다.

## 코드 소유권

`third_party/rhwp`는 vendor source로 취급하고 Alhangeul 기능을 구현하기 위해 직접 수정하지 않는다.

- `apps/desktop/`: Tauri shell, native document session, 저장·내보내기·인쇄, 창 관리, 파일 연결과 packaging
- `apps/studio-host/`: exact upstream Studio entry를 쓰는 Vite host, Tauri bridge와 desktop event·command·font leaf adapter, 최소 제품 UX 보정
- `assets/`, `docs/`, `scripts/`: 제품 자산, 공식 문서와 운영 자동화

studio host의 실제 Vite root와 entry는 각각 `third_party/rhwp/rhwp-studio`, 그 아래 `index.html`과 `src/main.ts`다. local `index.html`, `src/main.ts`, Toolbar, CanvasView, Ruler, renderer와 범용 dialog·style 복제본은 허용하지 않는다. 제품 title·접근성 label·새 창 항목·제품 style/icon만 HTML transform으로 보충하고, upstream import를 대체하는 alias는 native host·font policy·제품 정보에 필요한 12개 leaf adapter로 제한한다.

`apps/studio-host/alhangeul-overrides.ts`가 adapter owner와 disposition의 진실 원천이다. `apps/studio-host/src/core/upstream-boundary.test.ts`는 12개 alias, `legacy-upstream-copy` 0개, 금지 entry와 제거된 shadow의 물리적 부재, adapter 300 LOC 상한을 검사한다. `tests/rhwp-baseline.test.mjs`는 exact entry, upstream 메뉴 command와 HWPX/PDF 실행 경계를 함께 고정한다. engine API나 renderer bug는 먼저 upstream에서 해결하고, 데스크톱 통합 차이는 이 경계 안의 leaf adapter에 둔다.

## 문서 저장과 PDF 경계

upstream embed runtime을 상속하는 local leaf wrapper는 `getDesktopStudioHandlers()`로 `loadFile`, `pageCount`, `getPageSvg`, `exportHwp`, `exportHwpx`, `notifySaved`만 native host에 노출한다. HWP/HWPX source save는 현재 형식에 맞는 exporter bytes를 chunk staging하고 Rust에서 요청 형식·확장자·parser 결과가 일치한 뒤 원자적으로 교체한다. native commit 성공 뒤에만 `notifySaved`로 upstream dirty/recovery 상태를 정리한다.

PDF command는 upstream `file:print-to-pdf` 메뉴 위치와 활성 규칙을 유지하되 실행만 Alhangeul이 소유한다. active handler의 `getPageSvg(page)` 결과를 페이지 순서대로 native PDF job에 전달하며 staged HWP를 재파싱하지 않는다. PDF 성공·실패·취소는 source path·format·revision·dirty·recent와 upstream recovery draft를 바꾸지 않고 `notifySaved`를 호출하지 않는다.

## 갱신 자동화 경계

`scripts/update-upstream.sh`는 승인된 의존성 갱신 작업에서만 실행한다. 입력은 Stable tag와 resolved commit이며, 둘이 같은 commit을 가리키는지 fetch 후 검증한다.

현재 pin을 재현하는 명령은 다음과 같다.

```sh
scripts/update-upstream.sh \
  --tag v0.8.2 \
  --commit 9b16aa9e23f476e2b335d7c029fc9f24a199d63c \
  --run-checks
```

script는 dirty upstream source와 origin 불일치를 먼저 거부하고, source checkout → native Cargo lock 갱신 → 임시 경로의 fresh WASM build → managed artifact 동기화 → `rhwp-core.lock` 작성 → read-only 검증 순서로 처리한다. lock writer는 갱신 흐름에서만 사용하고 `pnpm run check:rhwp-pin`의 verifier는 파일을 수정하지 않는다.

실패 시 자동 reset을 하지 않으며 시작 commit과 실패 단계를 출력한다. 운영자는 `git status --short`와 `git diff --submodule=log`로 범위를 확인한 뒤 [DEVELOPMENT.md](../DEVELOPMENT.md)의 명시적 경로 rollback 절차를 사용한다.

## 플랫폼 중립 수용 기준

- tag와 resolved commit 출처가 기록되어 있다.
- source submodule, native Cargo lock, bundled WASM과 `rhwp-core.lock`이 같은 `rhwp` release를 가리킨다.
- `pnpm install --frozen-lockfile`이 통과한다.
- `pnpm run check:product-boundary`, `pnpm run check:product-version`, `pnpm run check:rhwp-pin`, `pnpm run check:release-metadata`가 통과한다.
- `pnpm run test:automation`이 통과한다.
- `pnpm run test:upstream`, `pnpm run test:studio`, `pnpm run build:studio`가 통과한다.

Rust desktop test·Clippy, Tauri build·GUI·packaging은 지원 대상인 Windows/Linux의 승인된 후속 플랫폼 작업에서 검증한다. 이 플랫폼 중립 수용 결과만으로 native 배포 준비가 완료되었다고 판단하지 않는다.

## `v0.8.2` known issue 분류

upstream `v0.8.2` changelog에는 다음 두 Studio E2E 실패가 known issue로 기록되어 있다.

- `print-pdf-issue3126`: PDF 안내 modal assertion 실패. 인쇄 surface 자체는 수동 확인되었으나 원인은 아직 확정되지 않았다. upstream #3450에서 추적한다.
- `issue-2214`: 페이지 로컬 repaint 계약 실패가 `v0.8.1`부터 이어진다. 회귀 여부는 확정되지 않았으며 upstream #3412에서 추적한다.

known issue는 성공으로 간주하는 예외 목록이 아니다. pinned source commit에서 같은 upstream E2E와 같은 재현 조건·실패 지점이 확인될 때만 upstream known issue로 분류한다. Alhangeul adapter test/build에서만 발생하거나 실패 지점이 달라진 경우에는 Alhangeul 회귀 후보로 두고 원인을 조사한다. 이 작업에서는 upstream source를 backport하거나 두 known issue를 임의로 보정하지 않는다.
