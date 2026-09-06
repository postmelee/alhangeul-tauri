# Task #9 Stage 2 보고서 — prerelease metadata와 검증 자동화 정렬

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 2

## 단계 목적

Stage 1.1에서 승인한 `v0.1.0` prerelease 계약을 제품 metadata, 자동 검증, CI/native workflow와 공식 운영 문서에 반영한다. HWPX 저장을 지원하는 것으로 읽히던 Tauri 설명을 실제 기능에 맞추고, release metadata drift와 공개 후보 checksum 입력을 dependency 없이 검증한다.

이 단계는 application runtime, bundle matrix와 installer 생성 방식을 바꾸지 않는다. release PR, tag, GitHub Release, signing, updater, package repository와 Windows ARM64 구현도 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/check-release-metadata.mjs` | 제품명·version·identifier·publisher·설명·category·license·file association·updater 비활성 계약 검사 |
| `scripts/create-release-checksums.mjs` | 명시적 artifact root의 MSI·NSIS·AppImage·DEB·RPM 결정적 `SHA256SUMS` 생성 |
| `tests/release-metadata.test.mjs` | metadata 정상·drift·HWPX 저장 오인·updater·CLI 회귀 검사 |
| `tests/release-checksums.test.mjs` | 정렬·hash·empty·unsupported·duplicate·CLI 회귀 검사 |
| `package.json` | metadata/checksum command와 automation test 등록 |
| `apps/desktop/src-tauri/tauri.conf.json` | HWP/HWPX 열기·편집, HWP 저장, PDF 내보내기로 long description 정렬 |
| `.github/workflows/ci.yml` | release metadata gate 추가 |
| `.github/workflows/alhangeul-desktop.yml` | 조건부 native pretest에 release metadata gate 추가 |
| `tests/actions-workflows.test.mjs` | 새 gate 순서와 기존 trigger·권한·matrix·비배포 계약 동시 검사 |
| `docs/DEVELOPMENT.md` | metadata 검사와 candidate checksum 생성 명령 추가 |
| `docs/operations/DESKTOP_RELEASE.md` | baseline bundle, unsigned 경고, checksum, 재생성, No-Go와 rollback 계약 기록 |
| `mydocs/orders/20260729.md` | Stage 2 완료와 Stage 3 진입 승인 대기 반영 |

신규 script와 test는 각각 권장 300 LOC 미만이다.

| 파일 | LOC |
|---|---:|
| `scripts/check-release-metadata.mjs` | 267 |
| `scripts/create-release-checksums.mjs` | 228 |
| `tests/release-metadata.test.mjs` | 262 |
| `tests/release-checksums.test.mjs` | 187 |

## 본문 변경 정도 / 본문 무손실 여부

- application runtime과 bridge API는 변경하지 않았다.
- Tauri long description만 실제 기능 범위로 좁혔으며 product name, version, identifier, publisher, file association과 bundle target은 보존했다.
- CI/native workflow는 기존 수동 `workflow_dispatch`, `contents: read`, Windows/Linux matrix, 14일 artifact와 비배포 경계를 보존하고 read-only metadata gate만 추가했다.
- `README.md`는 이미 HWPX 저장 미지원과 공식 release 부재를 정확히 설명하므로 수정하지 않았다.
- DESKTOP_RELEASE의 과거 Task #5·#7 run, artifact ID, 크기와 hash 기록은 수정하지 않고 prerelease 후보 계약만 추가했다.

## 구현 결과

### release metadata 계약

- root, desktop package, Cargo와 Tauri version 정합성을 확인한다.
- Alhangeul 제품명, identifier, publisher, package 설명, category, copyright와 MIT license를 확인한다.
- HWP/HWPX file association의 extension, 이름, 설명과 MIME type을 구조적으로 확인한다.
- Tauri와 JavaScript/Rust dependency에서 updater 설정·의존성이 나타나면 실패한다.
- 기본 repository root와 fixture용 `--root`를 지원하며 파일을 수정하지 않는다.

### checksum 계약

- `--root`와 `--output .../SHA256SUMS`를 명시해야 한다.
- MSI, NSIS setup EXE, AppImage, DEB와 RPM만 허용한다.
- inventory, 기존 output과 AppDir 중간 산출물은 제외한다.
- 상대 경로를 byte 순서로 정렬하고 표준 SHA-256 두 칸 구분 형식으로 기록한다.
- 빈 installer, 지원하지 않는 파일, symbolic link와 대소문자를 무시한 중복 공개 asset 이름을 거부한다.

## 검증 결과

구현계획서 Stage 2 명령:

```bash
pnpm run check:release-metadata
pnpm run test:automation
git diff --exit-code origin/devel -- .github/workflows/pages.yml
git diff --check
```

추가 회귀 확인:

```bash
pnpm run check:product-boundary
pnpm run check:product-version
```

결과:

- OK — `check:release-metadata`: `Alhangeul 0.1.0` 계약 통과.
- OK — `test:automation`: 51 tests, 51 pass, 0 fail.
- OK — product boundary: 185 files scanned, violation 없음.
- OK — product version: root, desktop package, Cargo manifest·lock과 Tauri config 모두 `0.1.0`.
- OK — `.github/workflows/pages.yml`은 `origin/devel` 대비 변경 없음.
- OK — `git diff --check` 통과.
- OK — workflow test가 `workflow_dispatch`, `contents: read`, Windows/Linux 3개 matrix, release/deploy action 부재와 새 metadata gate 순서를 함께 확인했다.

## 잔여 위험

- 새 checksum 도구는 synthetic fixture에서 검증했으며 실제 Task #9 candidate artifact 적용은 Stage 3에서 수행해야 한다.
- workflow 파일의 정적 계약은 통과했지만 변경 commit의 GitHub Actions 실행 결과는 Stage 3 exact-SHA run 전까지 없다.
- RPM 호환 native 설치 환경과 Linux arm64 GUI session은 아직 확보되지 않았으며 Stage 4 필수 gate다.
- 첫 Windows prerelease는 unsigned이므로 SmartScreen 경고와 낮은 사용자 신뢰 위험이 남는다.
- Windows ARM64는 Issue #10 소유이며 현재 Task #9 matrix나 지원 표시에 추가하지 않았다.

## 다음 단계 영향

- Stage 3에서는 이 Stage 2 commit을 candidate exact SHA로 사용해 전체 플랫폼 중립 검증을 다시 실행한다.
- 별도 승인 뒤 `publish/task9`에 push하고 같은 SHA의 CI와 Windows x64·Linux x64·Linux arm64 native workflow를 dispatch한다.
- 다운로드 artifact inventory를 독립 검증하고 실제 MSI·NSIS·AppImage·DEB·RPM·arm64 DEB로 `SHA256SUMS` 초안을 생성한다.
- Stage 3 artifact는 14일 Actions candidate이며 최종 tag artifact나 공개 asset으로 재사용하지 않는다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3의 전체 수용 검증을 시작한다.
- `publish/task9` remote push와 GitHub Actions dispatch는 Stage 3 진입 승인에 포함되는 외부 상태 변경으로 별도 확인한다.
