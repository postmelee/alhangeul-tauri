# Task #113 Stage 4.9.1 — 최종 업데이트 안내 source와 고정 회귀 입력 수용

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.9.1 (승인된 Stage4.9의 source/generic 하위 단계)
확인일: 2026-10-09 23:07 (Asia/Seoul)

## 단계 목적

이미 실제 수용한 Windows NSIS/MSI·Linux x64 AppImage의011→012 결과를 기존 사용자 원문에
정렬하고, 공개 notes-only 변경이 과거 고정 회귀 입력을 바꾸지 않도록 당시 bytes를 보존한다.
이번 하위 보고는 source/generic 수용이다. 새 exact head required와 승인된 body-only 공개는 후속이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| README.md | 실제011→012 업데이트·설정/HWP/HWPX 수용 문장1개 |
| docs/releases/v0.1.2.notes.json | updateInstructions/updaterSummary·checkedAt·운영PR119/120 근거 |
| site/release.json | 같은 짧은 안내 원문 정렬 |
| site/updates/v0.1.2.html | JSON 원문/기존 템플릿으로 재생성 |
| tests/fixtures/production-upgrade-v012-release.json | 기존 site release data3938bytes/51LOC를 그대로 고정 |
| tests/production-upgrade-v012.test.mjs | 위 고정 fixture read1행·이유 주석1행;200LOC |
| 기존 plan/report/orders·docs/releases 추적 | 승인·actual generic·공개/미공개 경계 |

## 본문 변경 정도 / 본문 무손실 여부

승인 patch5064367359bf42cf920b36e9f8b6db9e3d18c066e7b14c24c6f152ab0b592d57의6파일을
before/after hash 검산 후 적용했다. 사용자 주요 변화와 installer6종의 size/hash·inventory/3signature/
key/source/tag/publishedAt·기존 제한은 불변이다. issue113 OPEN·resolvedIssues=[]를 유지한다.

fixture SHA256은 `f42efdf1d8aad83c854401fee8b9f7d593924e2b3ebeae03c662f4df47327e19`다.
보고 base25952ec5의 site/release.json raw bytes와 같다. 실제 native evidence의 historical
manifest58ca·고정spec/legacy59/new29/assertion/runtime helper·workflow/의존성은 바꾸지 않았다.
새 public manifest는 notes만 변경하는 향후 Pages 입력이며 native 검증 당시 bytes로 쓰지 않는다.

## 검증 결과

실행 명령:

```bash
pnpm run test:automation
pnpm run typecheck:gui
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run check:committed-rhwp
pnpm run check:release-notes
pnpm run build:pages
pnpm run check:pages
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
node scripts/releases/notes-cli.mjs generate --version 0.1.2 --output-dir /private/tmp/task113-final-guidance-proposal/actual-generated
```

- 실제 automation1360/1360·fail/skip0, production/workflow/notes/Pages/updater/actions 지정369/369·
  fail/skip0, GUI types 모두 통과했다. 집중 명령 전체는 approval-inputs/actual-contracts-0.log에 보존했다.
- boundary/version/metadata/pin/committed-rhwp·notes2·Pages source19/root assets2/output23 통과다.
- upstream39·Studio283/43files·types/build 통과다. 기존 Vite dynamic import/chunk 경고는 보존한다.
- 임시1280/390 browser preview와 실제 normalized HTML bytes가 같다. 가로 넘침 없음과 결과
  문구/6다운로드/KST/한계를 확인한 preview를 재사용한다. local native Rust/Tauri 제품 빌드는 하지 않았다.
- actual-generated3은 승인한 generated3과 raw bytes/hash가 같다. `_site`의 향후 updater
  manifest2434/hashf751도 승인값과 같고 version/pub_date/platform URL/signature는 기존과 같다.
- `verify-actual.mjs` 읽기 검산은 source6 hashes·메타데이터/한계 불변·고정 fixture/raw bytes·
  frozen58ca·새f751·generic 로그·생성물·HTML/원래 fixed012 입력을 모두 확인했다.

| 생성물 | bytes | SHA256 |
|---|---:|---|
| 승인 GitHub body-only |6208| `d932d5f3a4e26cb07d38fe467dee4f86b6676cda4feb340fda64ec7040005e92` |
| HTML source |9166| `0452b06a8e5834423328d833ee4bd789042c578015328b4e1523d28368575816` |
| normalized Pages HTML |9157| `1869e70dcbf1d33f27db3e3cd3cfe03d6ec8a2eb24e15c2eef618b8287a56fae` |
| short notes |550| `1fec449b459dba4bd4c57a07e5ed6a4667edf39d523b84ad770f4377dc768e4d` |
| 향후 Pages manifest |2434| `f7517e3dce5048f7fe8c283f48640fb6fed68eb494146ded7441ee5fa0dd64d1` |

검증 로그/receipts/생성물은 `/private/tmp/task113-final-guidance-proposal/actual-*`에 보존한다.

## 잔여 위험

NSIS thumbnail·MSI3010 재부팅 후 미검증·Authenticode·물리 환경/성능 한계는 그대로다.
현재 공개 body6186/03cde7aa...·Pages/feed2371/58ca는 이전 안내다. 새 데이터 적용·generic 통과를
원격 게시로 쓰지 않는다. 두 과거 whole failure와 실제3종 별도 harness/run 수용은 Stage4.8 근거다.

## 다음 단계 영향

이 source/report를 normal PR120 push하고 새 exact head의 required3job/merge tree를 확인한다.
통과하면 **이미 승인된** exact body6208/d932...만 기존 Release407055948에 PATCH하고
11asset/tag/채널/read-back을 검산한다. 불명확한 결과면 재실행 전 원격 body/identity부터 확인한다.

## 승인 요청

같은 스레드 “진행해줘.”로 Stage4.9의6파일·generic/commit/push/required·success 뒤 body-only
공개까지 승인됐다. 이를 다시 묻지 않고 수행한다. PR merge·actual merged SHA의 Pages/f751
배포·Issue113 close/cleanup은 제외됐으며 구체 입력으로 후속 승인받는다.
