# Task #50 Stage 4 — Linux HWPX 실제 설치와 파일 관리자 시각 수용

GitHub Issue: [#50](https://github.com/postmelee/alhangeul-tauri/issues/50)
구현계획서: [`task_m010_50_impl.md`](../plans/task_m010_50_impl.md)
Stage: 4
검증일: 2026-09-01

## 단계 목적

검증 probe가 private `XDG_DATA_HOME`에 자체 MIME XML을 만들던 보완을 제거하고,
실제 DEB/RPM package가 설치한 system MIME XML·thumbnailer registration·제품
helper만으로 HWP/HWPX가 동작하는지 재수용한다. Ubuntu 22.04 x64의 Nautilus와
Thunar/Tumbler에서 실제 온새미로 HWP 및 form-002 HWPX의 최초·cached·changed
호출, cache metadata, 화면과 손상 문서 실패를 함께 판정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | 489 LOC; 설치 전 MIME 상태, 설치 파일·owner·hash, 설치 후 실제 content type과 outcome 증적 추가 |
| `scripts/linux-thumbnail-manager-probe.sh` | 179 LOC; private MIME 생성·갱신 제거, package 소유 system XML·registration·helper와 실제 MIME 검증 |
| `scripts/linux-thumbnail-manager-session.sh` | 202 LOC; 실제 HWP/HWPX의 최초·cached·changed 호출, PNG cache metadata와 failure cache 판정 |
| `tests/gui/linux/native-ui/thumbnail-files.test.mjs` | 143 LOC; package-only·실사용 문서·nested failure cache·크기 계약 |
| `tests/linux-gui-workflow.test.mjs` | 342 LOC; 설치 전후 MIME·package owner·outcome 계약 |
| `tests/linux-thumbnail-registration.test.mjs` | 85 LOC; manager probe가 MIME database를 만들지 않는 계약 |
| `mydocs/plans/task_m010_50_impl.md`, `mydocs/orders/20260901.md` | 승인·실행 결과 및 Stage 5 승인 대기 상태 |

## 본문 변경 정도 / 본문 무손실 여부

- 제품 runtime, renderer, `apps/linux-thumbnailer`, Tauri bundle 설정 및
  `third_party/rhwp`는 변경하지 않았다. 실제 문서도 읽기 전용 원본 SHA로
  사용했고 repository fixture를 수정하지 않았다.
- 기존 fresh `XDG_DATA_HOME`·cache 격리는 유지했다. 다만 probe가
  `alhangeul-probe.xml`을 만들고 `update-mime-database`를 직접 실행하던 보완은
  제거했다. 설치 뒤에도 private MIME path가 없으며 `/usr/share`의 package 소유
  파일만 사용한다.
- 손상 HWP가 만드는 Freedesktop failure marker는 성공 thumbnail이 아니다.
  최초 실행에서 드러난 nested `thumbnails/fail/gnome-thumbnail-factory` 경로를
  전체 상대 경로 component로 판정하도록 고쳤으며 실패 허용 기준은 낮추지 않았다.
- 기존 workflow 489 LOC와 workflow 계약 test 342 LOC는 단일 acceptance 순서와
  단일 계약 집합을 유지하는 legacy 초과 파일이다. 이번 Stage는 해당 순서에
  필요한 관측만 추가했고 별도 unrelated 구조 분리를 섞지 않았다. 신규·변경
  manager script와 native-ui test는 300 LOC 이하다.
- 공식 제품·운영 문서는 계획대로 Stage 5에 남겼다.

## 검증 결과

### 플랫폼 중립

```bash
node --test tests/gui/linux/native-ui/thumbnail-files.test.mjs tests/linux-gui-workflow.test.mjs tests/linux-thumbnail-registration.test.mjs tests/linux-thumbnail-packaging.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/linux-thumbnail-manager-probe.sh scripts/linux-thumbnail-manager-session.sh
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

- 관련 계약 테스트: **28 pass, 0 fail**.
- 전체 automation: **390 pass, 0 fail**.
- Product boundary: **312 files scanned, passed**.
- ShellCheck, actionlint 및 diff whitespace: OK.
- 지원 범위 밖 macOS 호스트에서 Rust desktop build/test를 실행하지 않았다.

### Exact native/package candidate

- 기준 `devel`: `8b865fa55b55aea232d0fb034a518c807ac4c003`
- source/workflow candidate: `241e0674d2abe41b8fc5bd521725321ddadc4398`
- rhwp pin: `496333b27d21ddb9114ba9ae340bcb895870c9a7`
- [Native run 33502167628](https://github.com/postmelee/alhangeul-tauri/actions/runs/33502167628), attempt 1, 전체 성공.

| 환경 | 결과 | 실제 package 수용 범위 |
|---|---|---|
| Ubuntu 22.04 x64 | 성공 | DEB·RPM install/reinstall/update-failure rollback/uninstall, MIME lifecycle |
| Ubuntu 22.04 arm64 | 성공 | DEB install/reinstall/update-failure rollback/uninstall, MIME lifecycle |
| Windows x64 | 성공 | desktop build 및 별도 MSI·NSIS fresh installer smoke |

Linux 두 target에서 강화된 core gate, helper test/fmt/Clippy와 bundle inventory도
함께 통과했다. x64 RPM은 Ubuntu runner에서 `rpm --nodeps` transaction을 검증한
것이며 Fedora dependency resolution 또는 RPM GUI 설치 성공으로 확장하지 않는다.

| native artifact | ID | Artifact SHA-256 |
|---|---:|---|
| `alhangeul-desktop-linux-x64` | `9798794911` | `eaac4b0fa3b02706e393f28e7f634e39469fe37a8cdecefa945eb527e6ed0d5d` |
| `alhangeul-linux-x64-thumbnail-package` | `9798781134` | `b84366417456d67ddb6c4a0b98e7f686a895c8b8892dc3e803f5a7578d4090eb` |
| `alhangeul-linux-arm64-thumbnail-package` | `9798600209` | `36e3a4d8690c944c69dda850b4bf24bc2b0056c6a4002a19cb21b263e8beeeac` |
| `alhangeul-linux-x64-thumbnailer` | `9798324826` | `d5d6920eb065b17267e6846796b199327372d4e74a96b2a19bc0175d12c337fd` |

### Exact Linux GUI와 package-only MIME

- [Linux GUI run 33504817069](https://github.com/postmelee/alhangeul-tauri/actions/runs/33504817069), attempt 1, 전체 성공.
- 입력 source와 workflow acceptance ref, native build ref가 모두
  `241e0674d2abe41b8fc5bd521725321ddadc4398`이며 native run ID는
  `33502167628`이다.
- evidence artifact `alhangeul-linux-gui-33504817069`: ID `9799546121`,
  SHA-256 `5444688b8402f9e0e80c78d8a84fba04d3a0c1b1977f8b4a7b5dadb0856e3da3`.
- validate, checkout, source, handoff, download, helper handoff/download/verify,
  inventory, pre-install MIME, install, installed thumbnail, manager probe와 기존
  제품 GUI outcome이 모두 `success`다.

| 관측 | 설치 전 | 설치 후 |
|---|---|---|
| 실제 HWP | `application/x-hwp` | `application/x-hwp` |
| 실제 HWPX | `application/zip` | `application/x-hwpx` |
| private MIME path | 없음 | 없음 |
| 제품 MIME XML | 없음 | `/usr/share/mime/packages/alhangeul-hwpx.xml` |

설치된 세 경로는 모두 package `alhangeul` 소유였다. helper SHA-256은
`00aa122e894ff3972a3664b06e5241f0627a71c139617b07dab54305fa1b010f`,
registration은 `42146f0cc8dd9397cf4885bcda0fded980c05ea1004a8fe641b970c6e06433da`,
MIME XML은 `b2fb7fda666bc217da9c90b48fcf09e7b68b6ad5275a97ce12db5a1bcd528c50`이다.
환경은 Nautilus `1:42.6-0ubuntu2`, Thunar `4.16.10-1`, Tumbler
`4.16.0-1`, shared-mime-info `2.1-2`였다.

### 파일 관리자 호출·cache 수용

| manager | 실제 HWP/HWPX first | cached | changed | 성공 cache PNG | 손상 문서 성공 PNG |
|---|---|---|---|---:|---:|
| Nautilus | 각각 2 / 2회 | 각각 2 / 2회 | 각각 4 / 4회 | 4개 + failure marker 1개 | 0개 |
| Thunar/Tumbler | 각각 2 / 2회 | 각각 2 / 2회 | 각각 4 / 4회 | 4개 | 0개 |

- cached 단계에서 실제 문서 helper 호출은 증가하지 않았고, 문서 mtime을 바꾼
  changed 단계에서 각 호출이 증가했다. 두 실제 문서의 cache PNG `Thumb::URI`와
  `Thumb::MTime` metadata도 확인했다.
- Nautilus의 failure marker 1개는
  `thumbnails/fail/gnome-thumbnail-factory` 아래에만 있었다. 전체 상대 경로로
  제외한 뒤 `failureSuccessPngs=0`이었다.
- Thunar/Tumbler는 손상 fixture를 재시도해 failure 호출이 2→4→6으로 늘었지만
  성공 cache PNG는 만들지 않았다. 재시도 자체를 정상 render로 오인하지 않는다.

### 시각 판독

- 실제 fixture SHA-256은 온새미로 HWP
  `e8592e74c9a8425c4ee2c5824d012ebe45e9f6dd36880b784ba594b4fd0a31ce`,
  form-002 HWPX
  `5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4`로
  repository 원본과 일치했다.
- 512px render SHA-256은 온새미로
  `2a499693e01e811eff49c6aff3102720945ae54c00d75bb102e56cbdd94a8abf`,
  form-002
  `35bd3ce2d05def6bf9ad525bc2a0a5b62f30ad3e1eb7c208e085a9e01a7be8ee`다.
- 사람이 512px render와 Nautilus·Thunar changed screenshot을 확인했다.
  온새미로는 제목과 곡선형 표지, form-002는 표와 본문이 구분되어 보였다.
  손상 HWP는 generic 문서 아이콘이었고 제품 아이콘이나 빈 placeholder를 성공
  thumbnail로 판정하지 않았다.

### 검증 중 보정

- 첫 GUI run `33500966551`은 pre/post MIME, installed owner, Nautilus lifecycle과
  기존 제품 GUI가 통과했지만 failure cache의 immediate parent만 검사해 nested
  failure marker 한 개를 성공 PNG로 잘못 셌다.
- 해당 artifact에서 정상 네 문서는 `thumbnails/large`, 손상 문서는
  `thumbnails/fail/gnome-thumbnail-factory` 아래에만 있음을 직접 대조했다.
  전체 relative path component를 검사하는 `241e067`에서 동일 gate를 재실행해
  최종 GUI run을 통과했다. MIME·render·failure 기준은 완화하지 않았다.
- 최종 native/GUI 검증 뒤 제품 소스는 변경하지 않았다. 이 보고서와 상태 문서만
  후속 단계 commit에 포함하므로 보고서 commit 전체가 원격 실행된 것으로
  표현하지 않는다.

## 잔여 위험

- 파일 관리자 GUI 근거는 Ubuntu 22.04 x64와 위에 기록한 package/version
  조합이다. 다른 배포판·desktop/version 전반의 성공으로 확대하지 않는다.
- arm64는 DEB lifecycle와 helper를 검증했지만 GUI file-manager 수용은 범위 밖이다.
- x64 RPM은 Ubuntu transaction 근거만 있고 Fedora GUI 수용 근거는 아니다.
- 캡처는 첫 페이지가 식별되고 cache lifecycle이 동작하는 수용 근거다. 문서 앱과
  pixel-perfect fidelity 비교나 첫 페이지 layout 개선은 이번 이슈 범위가 아니다.
- GUI evidence artifact 보존 기간 뒤에는 동일 exact-SHA workflow를 재실행해야
  원본 캡처와 metadata를 다시 받을 수 있다.

## 다음 단계 영향

- Stage 5에서는 이번에 실제 입증한 Ubuntu 22.04 x64 GUI, x64 DEB/RPM
  transaction 및 arm64 DEB 범위만 README·architecture·개발·운영 문서에 반영한다.
- package 설치만으로 HWPX가 `application/x-hwpx`가 되고 private MIME 주입이
  없다는 계약, cache·손상 문서 판정 및 검증 명령을 공식 문서와 정렬한다.
- Stage 5 최종 회귀는 플랫폼 중립 검증과 이번 exact-SHA native/GUI 증적 경계를
  보존한다. release, 배포, PR 게시 또는 이슈 close는 별도 최종 절차 전 수행하지
  않는다.

## 승인 요청

- Stage 4 산출물과 검증 결과를 검토한 뒤 Stage 5 진입 승인을 요청한다.
- 승인 전 공식 제품 문서 변경, PR 게시, release 또는 이슈 close는 진행하지 않는다.
