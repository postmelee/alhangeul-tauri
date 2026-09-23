# Task #7 Stage 2 보고서 — 제품 버전 정렬과 자동 검증

GitHub Issue: [#7](https://github.com/postmelee/alhangeul-tauri/issues/7)
구현계획서: [`task_m010_7_impl.md`](../plans/task_m010_7_impl.md)
Stage: 2

## 단계 목적

Stage 1.1에서 승인된 `0.1.0 재시작` 결정을 현재 제품 version surface 다섯 곳에 원자적으로 반영하고, root `package.json`을 기준으로 drift를 지속 거부하는 read-only 검증기와 fixture test를 도입한다.

내부 Studio package, `rhwp` upstream version과 Task #5의 `0.3.1` 역사 증적은 제품 version 변경 대상에서 제외한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `package.json` | 제품 version `0.1.0`, `check:product-version` script와 automation test 대상 추가 |
| `apps/desktop/package.json` | desktop package version을 `0.1.0`으로 정렬 |
| `apps/desktop/src-tauri/Cargo.toml` | `alhangeul-desktop` package version을 `0.1.0`으로 정렬 |
| `apps/desktop/src-tauri/tauri.conf.json` | Tauri bundle·About source version을 `0.1.0`으로 정렬 |
| `apps/desktop/src-tauri/Cargo.lock` | 단일 `alhangeul-desktop` package entry만 `0.1.0`으로 정렬 |
| `scripts/check-product-version.mjs` | 191 LOC, 다섯 surface의 strict SemVer·exact match를 검사하는 read-only CLI |
| `tests/product-version.test.mjs` | 238 LOC, 정상·drift·구조 오류·CLI 계약 fixture 13개 |

## 구현 결과

### 제품 version 정렬

root `package.json`, desktop `package.json`, Cargo manifest, Tauri config와 Cargo lock의 `alhangeul-desktop` entry가 모두 `0.1.0`을 선언한다.

Cargo metadata는 manifest의 새 version을 `0.1.0`으로 해석했지만 기존 lock의 root package entry를 자동 갱신하지 않았다. 따라서 dependency graph를 재생성하지 않고 해당 단일 entry만 `0.1.0`으로 정렬한 뒤 `--locked --offline` metadata로 일치를 재검증했다. Cargo lock diff에는 이 한 줄 외 변경이 없다.

### read-only verifier

`scripts/check-product-version.mjs`는 다음 계약을 적용한다.

- root `package.json` version을 제품 진실 원천으로 읽고 strict SemVer인지 검사한다.
- desktop package, Cargo `[package]`, Tauri config와 Cargo lock의 단일 `alhangeul-desktop` entry를 root 값과 exact match한다.
- JSON parse 실패, version 누락, Cargo table/package 누락·중복과 값 drift를 경로·expected·actual이 포함된 오류로 거부한다.
- 기본 repository root와 fixture용 `--root <path>`만 지원하고 unknown option·누락 값을 거부한다.
- 검증 과정에서 repository나 fixture 파일을 수정하지 않는다.

### regression test

신규 test 13개가 다음을 검증한다.

- 정상 다섯 surface 일치와 파일 무변경
- desktop package, Cargo manifest, Tauri config와 Cargo lock의 개별 drift
- invalid strict SemVer와 손상된 root JSON
- desktop·Cargo version 필드 누락
- Cargo lock package 누락·중복
- fixture root CLI 성공과 unknown option·누락 값 실패

기존 upstream baseline test가 Tauri config의 `desktopConfig.version`을 `__ALHANGEUL_VERSION__`으로 주입하고 About 대화상자에서 `rhwp` version과 분리 표시하는 계약을 계속 검증하므로 해당 UI source는 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- 승인된 현재 제품 surface 다섯 곳의 `0.3.1`만 `0.1.0`으로 변경했다.
- Cargo lock dependency graph, Tauri identifier, package/crate 이름과 About 주입 연결은 변경하지 않았다.
- `apps/studio-host/package.json`의 private `0.1.0`, vendored `rhwp 0.8.2`는 각각 독립 책임으로 유지했다.
- Task #5 보고서·단계 문서와 `DESKTOP_RELEASE.md`의 `0.3.1` run·artifact·checksum은 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
node --test tests/product-version.test.mjs
pnpm run check:product-version
pnpm run test:automation
pnpm run test:upstream
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps
git diff --check
```

결과:

- OK — product-version fixture 13/13 통과
- OK — 실제 repository 다섯 surface가 모두 `0.1.0`으로 일치
- OK — automation 36/36 통과
- OK — upstream 32/32 통과, About의 Alhangeul/`rhwp` version 분리 계약 유지
- OK — locked offline Cargo metadata가 `alhangeul-desktop@0.1.0`으로 성공
- OK — verifier와 test는 각각 191/238 LOC로 권장 상한 이내
- OK — `git diff --check` 통과

구현 첫 fixture 실행에서는 root JSON reader의 반환 객체를 SemVer 함수에 직접 전달한 오류가 드러났다. root surface와 문자열 값을 분리한 뒤 같은 test를 재실행해 최종 13/13 결과를 확보했으며 실패 상태는 커밋하지 않았다.

## 잔여 위험

- verifier의 TOML reader는 현재 Cargo manifest·lock의 필요한 package/version 구조만 읽는 최소 parser다. 구조가 바뀌어 field가 누락·중복되면 조용히 통과하지 않고 실패하도록 설계했다.
- CI와 native workflow는 아직 `check:product-version`을 호출하지 않는다. Stage 3에서 build 전 gate로 연결해야 한다.
- 실제 Windows/Linux About UI와 새 `0.1.0` bundle 이름은 아직 native build로 확인하지 않았다. Stage 5 exact-SHA matrix 검증 대상이다.
- Task #5의 마지막 native artifact는 역사적으로 `0.3.1`이다. 새 `0.1.0` artifact 증적이 생기기 전까지 공식 배포물로 해석하면 안 된다.

## 다음 단계 영향

- Stage 3은 두 workflow에서 dependency 설치 뒤, build와 `rhwp` 검사 전에 `pnpm run check:product-version`을 실행하도록 연결한다.
- README, DEVELOPMENT, PROVENANCE와 DESKTOP_RELEASE에 `0.1.0` 재시작, M010 관계, Actions/native smoke와 비배포 경계를 반영한다.
- Task #5 `0.3.1` 증적과 Pages workflow는 Stage 3에서도 변경하지 않는다.

## 승인 요청

- Stage 2의 `0.1.0` 정렬, read-only verifier, fixture 13개와 검증 결과를 승인하면 Stage 3의 CI 연결과 공개 문서 정렬로 진행한다.
