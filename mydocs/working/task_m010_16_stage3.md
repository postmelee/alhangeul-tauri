# Task #16 Stage 3 보고서 — updater release inventory와 Pages manifest gate

GitHub Issue: [#16](https://github.com/postmelee/alhangeul-tauri/issues/16)
구현계획서: [`task_m010_16_impl.md`](../plans/task_m010_16_impl.md)
Stage: 3

## 단계 목적

Stage 2의 Windows/Linux updater service가 소비할 release artifact와 static manifest 사이에
검증 가능한 공급 경계를 만든다. production key나 GitHub Secret을 만들지 않은 상태에서
Windows x64 NSIS·MSI와 Linux x64 AppImage의 installer·`.sig` 1:1 cardinality, exact source SHA,
version/tag, SHA-256, Minisign/Ed25519 서명과 release URL을 단일 inventory로 고정한다. 완전한
published inventory가 source에서 승인된 경우에만 Pages output에 `updater/stable.json`을 생성하고,
일반 artifact build·현재 unreleased Pages는 기존처럼 Secret과 manifest 없이 동작하게 한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/updater/release-inventory.mjs` | 세 updater target, installer·`.sig`, exact release identity, SHA-256과 실제 Minisign/Ed25519 서명을 검증하고 deterministic inventory를 작성 |
| `scripts/updater/release-config.mjs` | repository 밖 0600 임시 Tauri overlay에 version, `createUpdaterArtifacts`, canonical endpoint·public key와 Windows passive updater mode만 기록 |
| `scripts/updater/manifest.mjs` | 완전한 release inventory를 Tauri custom target 세 개의 version·notes·UTC timestamp·URL·signature manifest로 결정적 변환 |
| `scripts/pages/release-data.mjs`, `site/release.json` | release notes, nullable inventory와 `manifestPublished` gate를 schema에 추가하되 현재 값은 unreleased/null/false로 유지 |
| `scripts/build-pages.mjs`, `scripts/check-pages.mjs`, `scripts/pages/site-files.mjs` | tracked source manifest를 거부하고 gate가 true인 경우에만 output manifest를 생성·exact byte 재검증 |
| `scripts/check-release-metadata.mjs` | updater 전면 금지를 Windows/Linux Rust exact pin 허용, web dependency·base config·tracked overlay 금지 경계로 교체 |
| `scripts/verify-desktop-artifacts.mjs` | 기존 일반 artifact inventory walker와 SHA-256 helper를 updater verifier가 재사용할 수 있게 export |
| `.github/workflows/alhangeul-desktop.yml` | 기본 `artifact` mode를 보존하고 exact-SHA Windows/Linux x64 updater build, 서명 slice 검증, 기본 false·job-level write publish job을 분리 |
| `.github/workflows/pages.yml` | Pages 배포 전에 updater release fixture까지 포함한 source/output contract test 실행 |
| `package.json`, `.gitignore` | updater config·artifact verifier·focused test entrypoint와 재생성 가능한 updater 작업 경로 ignore 추가 |
| `tests/updater-release.test.mjs` | 실제 fixture key로 installer 서명, swap·누락·빈 파일·private path, URL/target drift, config 권한과 partial manifest를 검증 |
| `tests/pages.test.mjs`, `tests/actions-workflows.test.mjs` | manifest false/true output, source 금지, workflow mode·Secret 격리·publish gate 회귀 검증 |
| `mydocs/orders/20260830.md` | Task #16을 Stage 3 완료·Stage 4 승인 대기로 갱신 |

신규 역할별 source는 `release-inventory.mjs` 294 LOC, `release-config.mjs` 109 LOC,
`manifest.mjs` 65 LOC, `updater-release.test.mjs` 287 LOC로 구현계획서의 권장 300 LOC 상한 안에 있다.

## 본문 변경 정도 / 본문 무손실 여부

코드·automation 작업이다. 기존 일반 artifact mode의 Windows x64·Linux x64·Linux arm64 matrix,
thumbnail 진단, desktop artifact inventory와 Windows installer smoke 순서는 보존하고 mode 기본값을
`artifact`로 고정했다. base `tauri.conf.json`에는 updater endpoint, public key 또는
`createUpdaterArtifacts`를 넣지 않았다. 현재 `site/release.json`도 `unreleased`, download null,
inventory null, `manifestPublished=false`를 유지하며 `_site/updater/stable.json`은 생성되지 않는다.

production key 생성, GitHub Secrets 등록, workflow dispatch, tag·release 생성과 Pages 배포는 수행하지
않았다. publish job은 updater mode와 명시적 `publish_release=true`가 모두 있어야 하고 해당 job에만
`contents: write`를 부여한다. signing private key 두 개는 signed build step 한 곳에서만 참조하며
일반 build와 Pages workflow에는 Secret 참조가 없다.

## 검증 결과

실행 명령:

```bash
node --test tests/updater-release.test.mjs tests/pages.test.mjs tests/actions-workflows.test.mjs
pnpm run build:pages
pnpm run check:pages
pnpm run check:release-metadata
pnpm run test:automation
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — focused updater·Pages·workflow contract `68` tests, `68` pass, `0` fail.
- OK — 실제 Ed25519 fixture로 Minisign prehashed signature와 trusted comment를 검증하고 missing/extra
  `.sig`, 0-byte installer, signature swap, mutable/wrong URL·tag·repository, target mapping,
  prerelease, partial manifest와 private-key-like artifact를 거부했다.
- OK — `Pages build completed: 11 source files, 2 root assets`.
- OK — `Pages check passed: source=11, output=13`; current output에
  `_site/updater/stable.json`이 없음을 별도 확인했다.
- OK — `Release metadata check passed: Alhangeul 0.1.0`.
- OK — 전체 automation `314` tests, `314` pass, `0` fail.
- OK — `Product boundary check passed (315 files scanned).`
- OK — `git diff --check` 출력 없음.
- 보조 정적 점검 OK — 두 workflow YAML parse 성공, 신규 updater source·test 300 LOC 이하.

## 잔여 위험

- production key와 Secret이 없으므로 Tauri가 실제 Windows/Linux runner에서 만드는 installer 이름,
  `.sig`와 임시 overlay의 native build 정합성은 아직 실행하지 않았다. Stage 4 checkpoint A~C 승인과
  exact-SHA native build에서 확인해야 한다.
- publish job과 Pages manifest builder는 정적·fixture 계약만 검증했다. GitHub Release 생성, 원격 asset
  read-back, tag 결속, Pages 원자 게시를 실제 실행하지 않았다.
- MSI·NSIS·AppImage의 실제 `N → N+1`, dirty document, cross-format, 변조·network 실패는 Stage 5
  수용 범위로 남아 있다.

## 다음 단계 영향

- Stage 4는 production key 생성 위치·password·독립 백업을 먼저 제시하고 checkpoint A 승인을 받은
  뒤에만 key를 생성한다. 이어 Secret 등록도 checkpoint B 승인 전 수행하지 않는다.
- public key 승인 뒤 tracked release overlay와 공식 updater/release 문서를 정렬하고, Stage 3의
  inventory schema·key fingerprint·canonical HTTPS endpoint를 변경 없이 사용한다.
- updater workflow dispatch, release/tag/Pages 게시를 이번 보고서 승인만으로 실행하지 않는다.

## 승인 요청

- Stage 3 산출물과 검증 결과를 승인하면 Stage 4 production key·release 운영 통합으로 진행한다.
