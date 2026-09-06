# Task #45 Stage 2 완료 보고 — Windows/Linux 홈과 제품 시각 체계

GitHub Issue: [#45](https://github.com/postmelee/alhangeul-tauri/issues/45)
구현계획서: [`task_m010_45_impl.md`](../plans/task_m010_45_impl.md)
Stage: 2

## 단계 목적

기존 HOP 계열 Pages 화면을 Windows와 Linux 제품에 맞는 알한글 홈으로 재구성했다. 참고 Pages의
작은 반투명 header, 가운데 정렬 hero, 넓은 여백, 실제 제품 화면, 기능 소개, FAQ와 철학 문구의
정보 계층만 가져오고 제품 색상과 콘텐츠는 blue/neutral 시각 체계로 다시 작성했다. 공개 전
`unreleased` 상태에서는 MSI·NSIS·AppImage 다운로드나 updater 가능 상태를 만들지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `site/index.html` (232줄) | semantic header→hero→actual visual→feature→download→FAQ→philosophy→footer 홈 재작성 |
| `site/styles.css` (188줄) | 반투명 nav, responsive section, product window, Corporate/Premium motion과 reduced-motion 추가 |
| `site/script.js` (115줄) | keyboard feature switch, fail-closed release hydration, progressive reveal 추가 |
| `site/assets/windows-app.png` (1,030×801, 39,153 bytes) | 검증된 Windows NSIS GUI probe의 실제 새 문서 화면 |
| `site/assets/linux-editor.png` (1,280×900, 68,210 bytes) | 검증된 Linux HWP fixture 편집 화면 |
| `site/assets/linux-drag-in.png` (1,280×900, 178,918 bytes) | 검증된 Linux HWPX drag-in 결과 화면 |
| `site/assets/linux-pdf.png` (1,280×900, 66,740 bytes) | 검증된 Linux searchable PDF 저장 완료 화면 |
| `site/assets/og-main.png` (1,920×1,080, 421,054 bytes) | 최종 로컬 hero를 16:9 PNG로 고정한 공유 이미지 |
| `scripts/build-pages.mjs` (150줄) | `site/assets/`와 승인 root asset의 출력 경로 충돌 거부 추가 |
| `scripts/check-pages.mjs` (197줄) | source product asset과 root asset을 합친 exact output inventory 검사 추가 |
| `tests/pages.test.mjs` (260줄) | source 파일 수·root asset 경로 충돌을 검증하고 분리한 디자인 test를 기존 자동화 진입점에 연결 |
| `tests/pages-design.test.mjs` (120줄) | 정보 계층, 자산 hash/크기, 키보드, no-JS/reduced-motion, 금지 표현 검사 추가 |
| `mydocs/orders/20260827.md` | Stage 2 완료와 Stage 3 승인 대기로 진행 상태 갱신 |

파일·함수 권장 상한을 지키기 위해 시각 계약 test를 `pages-design.test.mjs`로 분리했다. 기존
`pages.test.mjs`가 이를 import하므로 Pages workflow와 `test:automation`의 기존 실행 경로에서도
두 test 묶음이 함께 실행된다. 외부 package dependency와 lockfile 변경은 없다.

### 제품 화면 provenance

| Pages asset | source commit / run / environment | 원본 SHA-256 | crop |
|---|---|---|---|
| `windows-app.png` | `91df796d4de2a5b7c4d888bbb8bb862021154c34` (`publish/task35`), [run 32952401240](https://github.com/postmelee/alhangeul-tauri/actions/runs/32952401240), `windows-2025`, runner image `win25-vs2026 20260818.207.1`, Windows `10.0.26100.0`, tauri-driver `2.0.6`; NSIS와 MSI probe 모두 success | `9e50463e32afbcfed2e864fb761efa8c1be0d21bf2dfad4a8a9f552fbce1c411` | 없음 |
| `linux-editor.png` | `16149e8a99c7c870cca71d89bdc94f1e8069dc58` (`publish/task19`), native run `32919925454`, [acceptance run 32921517032](https://github.com/postmelee/alhangeul-tauri/actions/runs/32921517032), `ubuntu-22.04`, tauri-driver `2.0.6`, `third_party/rhwp/samples/biz_plan.hwp`; 모든 acceptance step success | `a9e9c9889d28e3fc465938fd3b311210bcf92a37346f10952903fa0574c3b14c` | 없음 |
| `linux-drag-in.png` | 위 Linux exact SHA/run, `third_party/rhwp/samples/hwpx/form-002.hwpx`, scenario `linux-native-drag-in` success | `ee021b47b66e8a6069f2eec918a27153c8a15df4a22c3a37e82d275f2131cbd7` | 없음 |
| `linux-pdf.png` | 위 Linux exact SHA/run, scenario `linux-direct-pdf` success | `3b646ac975aa4b3720add31dcef78a9b42b87a8e4260d3e8825581db947df742` | 없음 |

네 제품 화면은 repository의 공개 fixture 또는 빈 문서를 사용하며 사용자명, 개인 경로, token과
비공개 문서 내용을 포함하지 않는다. OG 이미지는 실제 제품 증적이 아니라 이 Stage의 최종 Pages
hero를 로컬 브라우저 1,920×1,080 viewport에서 캡처한 디자인 자산이다. PNG SHA-256은
`f6718a0927ba056acb5e54e5067964eb370b500968ebee6d0fa3b197a924024f`다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 2는 승인된 디자인 재구성 단계이므로 기존 `site/index.html`과 `site/styles.css`를 의도적으로
전면 재작성했다. 제품 실행 코드, release schema, Pages workflow와 updater manifest는 변경하지
않았다. `site/release.json`은 계속 `unreleased`이며 세 download 값은 null, manifest는 비게시다.

## 검증 결과

실행 명령:

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs
rg -ni 'thumbnail|quick look|finder|macbook|dmg|macos' site/
git diff --check
```

추가 회귀 명령:

```bash
pnpm run test:automation
pnpm run check:product-boundary
```

결과:

- OK — Pages build: source 9개와 승인 root asset 4개를 `_site`에 생성
- OK — Pages check: source 9개, output 13개; broken link·asset drift·조기 manifest 없음
- OK — Pages focused test 22개 통과, 실패·skip 없음; 시각 계약 6개가 기존 진입점에 포함됨
- OK — 금지 표현 검색 결과 없음(`rg` exit 1은 no match)
- OK — automation test 250개 통과, 실패·skip 없음
- OK — product boundary 265개 파일 검사 통과
- OK — 변경 파일 whitespace 오류 없음

수동 시각·상호작용 확인:

- OK — `http://127.0.0.1:4173/` local static server에서 1,280×900과 390×844 확인
- OK — desktop `scrollWidth=1280`, mobile `scrollWidth=390`; horizontal overflow 없음
- OK — header→hero→visual→feature→download→FAQ→philosophy→footer landmark와 heading 순서 확인
- OK — 네 실제 이미지 load 완료, intrinsic size 유지, unpublished download anchor 0개
- OK — 방향키로 feature 두 번째 항목 선택 시 focus, `aria-pressed`, 이미지와 caption 동시 변경
- OK — native `<details>` FAQ open, skip link/semantic anchor/focus-visible source 계약 확인
- OK — normal motion에서 16px reveal과 8px feature 전환 확인; reduced-motion/no-JS는 source test로
  최종 콘텐츠 가시성과 animation/transition 즉시 완료를 확인
- OK — 모바일 강조 단어의 음절 중간 줄바꿈을 발견해 `white-space: nowrap`으로 보정 후 재확인

## 잔여 위험

- Pages는 계속 공개 전 상태다. 실제 installer version·direct URL과 updater manifest는 후속 release와
  Issue #16의 artifact/signature 검증 없이는 활성화할 수 없다.
- 이번 Stage는 로컬 시각 확인까지만 수행했다. public Pages exact-SHA 배포와 외부 URL read-back은
  구현계획대로 Stage 4에서 한 번만 수행한다.
- Windows/Linux 제품 화면은 검증 시점 app version `0.1.0`의 실제 증적이다. 제품 UI가 의미 있게
  바뀌면 새 exact-SHA acceptance 자산과 hash로 교체해야 한다.

## 다음 단계 영향

- Stage 3은 현재 home의 blue/neutral token, header/footer와 fail-closed release hydration을 재사용해
  updates와 feedback 페이지를 추가한다.
- Stage 3 checker는 세 페이지 내부 graph, canonical/metadata, keyboard/focus, 390px와 200% text zoom
  계약을 확장하되 현재 actual asset provenance와 download 비게시 상태를 보존해야 한다.
- 로컬 미리보기 서버는 작업지시자가 Stage 2 디자인을 직접 확인할 수 있도록 계속 실행한다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 업데이트·문의 페이지와 접근성 구현으로 진행한다.
