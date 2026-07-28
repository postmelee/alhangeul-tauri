# Task #5 Stage 1 완료보고서 — Desktop artifact 계약과 검증기

GitHub Issue: [#5](https://github.com/postmelee/alhangeul-tauri/issues/5)
구현계획서: [`task_m010_5_impl.md`](../plans/task_m010_5_impl.md)
Stage: 1

## 단계 목적

GitHub Actions와 native runner를 활성화하기 전에 Windows/Linux Tauri bundle의 최소 성공 조건을 platform-neutral fixture로 고정하는 단계다.

Windows x64의 MSI·NSIS, Linux x64의 DEB·RPM·AppImage, Linux arm64의 DEB 존재와 0바이트 여부를 검사하고, 다운로드 후 동일 파일인지 다시 확인할 수 있도록 상대 경로·종류·크기·SHA-256 inventory를 deterministic JSON으로 기록하는 검증기를 구현했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/verify-desktop-artifacts.mjs` | 288줄. 세 platform의 필수 bundle 계약, 재귀 file 검사, symbolic link 거부, streaming SHA-256, deterministic JSON write/verify와 CLI를 구현했다. |
| `tests/desktop-artifacts.test.mjs` | 324줄. 세 platform 정상 fixture와 누락·0바이트·변조·삭제·추가·CLI 오류를 다루는 15개 test를 추가했다. |
| `package.json` | `check:desktop-artifacts` script를 추가했다. 기존 script와 dependency는 변경하지 않았다. |

전체 Stage 1 source diff는 3개 파일, 613 insertions다. 외부 package를 추가하지 않고 Node.js 내장 모듈과 test runner만 사용했다.

검증기의 CLI 계약은 다음으로 확정했다.

```text
pnpm run check:desktop-artifacts -- \
  --platform <windows-x64|linux-x64|linux-arm64> \
  --root <bundle-root> \
  [--write-inventory <json-path> | --verify-inventory <json-path>]
```

inventory에는 `schemaVersion`, `platform`, 정렬된 `requiredKinds`, 상대 경로 순으로 정렬된 `files[]`의 `path`·`kind`·`size`·`sha256`만 기록한다. timestamp, runner 절대 경로, 사용자 경로는 포함하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

코드·테스트 작업이므로 문서 본문 무손실 여부는 해당하지 않는다.

`package.json`은 새 검증 명령 한 줄만 추가했으며 기존 build/test 명령과 package metadata를 보존했다. `.github/workflows/`와 repository Actions 설정은 변경하지 않았다. 현재 macOS host에서는 native Tauri build, desktop Rust test·clippy를 실행하지 않았다.

구현 중 추가 product-boundary 검사에서 unsupported platform fixture가 금지된 platform 식별자를 사용한 사실을 발견했다. 거부 동작 자체는 유지하면서 입력을 중립적인 `unsupported-x64`로 바꿨고, 최종 product-boundary 검사는 통과했다.

## 검증 결과

구현계획서의 Stage 1 필수 명령:

```bash
node --test tests/desktop-artifacts.test.mjs
node scripts/verify-desktop-artifacts.mjs --help
git diff --check
```

결과:

- OK — artifact fixture 15/15 통과
  - Windows x64 MSI·NSIS write/verify
  - Linux x64 DEB·RPM·AppImage write/verify
  - Linux arm64 DEB write/verify
  - 필수 종류 누락과 0바이트 거부
  - 기록 후 bundle 내용 변조·삭제·추가 거부
  - inventory JSON 변조 거부
  - unknown option·필수 인자 누락·상충 inventory mode 거부
  - package script가 전달하는 argument separator 허용
- OK — help가 세 platform과 `--write-inventory`/`--verify-inventory` 계약을 표시
- OK — `git diff --check`가 출력 없이 종료 코드 0으로 통과

추가 회귀 검증:

```bash
node --check scripts/verify-desktop-artifacts.mjs
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run check:desktop-artifacts -- --help
```

- OK — Node syntax 검사 통과
- OK — product boundary 178개 파일 검사 통과
- OK — `rhwp v0.8.2`, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 pin 검증 통과
- OK — pnpm package script를 통한 CLI help 호출 통과

## 잔여 위험

- 실제 Tauri bundle directory 구조와 파일명은 아직 Windows/Linux runner에서 생성하지 않았다. 특히 NSIS는 `nsis/` 디렉터리 아래 `.exe`라는 현재 Tauri 출력 계약을 Stage 3 native run에서 확인해야 한다.
- fixture는 파일 종류·크기·hash 계약을 검증하지만 installer가 실제로 설치·실행되는지는 검증하지 않는다. 설치 smoke는 이번 Issue 범위 밖이다.
- inventory checksum은 build와 download 사이 파일 동일성을 확인하는 수단이며 코드 서명이나 배포물 진위 보장을 대체하지 않는다.
- workflow 연결, manual trigger·permissions·matrix 정적 검사는 Stage 2 전까지 적용되지 않는다.

## 다음 단계 영향

- Stage 2는 `check:desktop-artifacts` CLI를 native build 직후, artifact upload 직전에 호출해야 한다.
- inventory 출력 경로는 bundle root의 `alhangeul-artifact-inventory.json`으로 고정해 기존 `bundle/**` upload에 함께 포함한다.
- Stage 2의 `tests/actions-workflows.test.mjs`는 세 platform matrix, `check:rhwp-pin`, artifact verifier 순서, manual-only trigger와 최소 권한을 검증해야 한다.
- Stage 2에서도 GitHub Actions를 활성화하거나 workflow를 dispatch하지 않는다. remote canary는 Stage 2 완료보고 승인 뒤 Stage 3에서 별도로 진행한다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2의 workflow 최소 보정과 로컬 정적 검증으로 진행한다.
