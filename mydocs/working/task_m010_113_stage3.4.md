# Task #113 Stage 3.4 — 보정 source 실제 파일·서명·draft metadata 수용

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 승인된 Stage 3 안의 새 product metadata 수용 3.4
상태: crypto·draft metadata·Linux GUI 하위 범위 완료 / Stage 3 전체 진행
확인일: 2026-10-08 (Asia/Seoul)

## 단계 목적

보정한 exact product `f79dbeadf56c0cdb6bdf576103f420591cecdc6b`의 실제 6종 파일과 3 서명을
검증한다. 보정 전 FF의 기록을 보존하면서 candidate/notes를 새 provenance로 정렬하고
Linux 설정·삭제/복구·문서·출력·thumbnail의 실제 수용 근거를 연결한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_113.json` | P의 signed NSIS/MSI/AppImage·ordinary RPM/arm64 exact ID/digest/path/hash |
| `docs/releases/v0.1.2.notes.json` (299 LOC) | P source·실제 assets6·3 updater inventory, 확인한 font 보정 문구 |
| `docs/releases/v0.1.2.md` | 보정 전/후를 구분하고 native·signing·Linux GUI·현재 pending gate 기록 |
| 기존 계획·오늘할일 | 현재 승인 source와 수용 계층·남은 6종 GUI/공개 경계 |

실제 archive (모두 same repository, attempt1, expired=false, producer 전체 success·ZIP digest 검증):

| producer·플랫폼 | artifact ID | archive digest |
|---|---:|---|
| ordinary linux-x64 | 11529712604 | `sha256:541fdbddca55b7fd245cdeaa0695a3dae91c98c75e4c22077abe2a94ee623af4` |
| ordinary linux-arm64 | 11529602385 | `sha256:cafa9eb9a4caa0502b6c09bc611d760cb6c666fb6c2be9f8ff7635eab0f74f7b` |
| signed windows-x64 | 11531307714 | `sha256:f96058d6171007bf800ebcd41f1b76a8a5434df53c5074f4848b8057d58c02ea` |
| signed linux-x64 | 11530328407 | `sha256:8657d598b44d03ee8c87e2e255801cb7693ad8cb4f321c2feb6f20f488ac075f` |
| signed release | 11531935891 | `sha256:d6b3c93994b153df37fbd80e7bb50039b5428325526fcbc4050516f5710e8b62` |

실제 installer 파일:

| 이름 | bytes | SHA-256 |
|---|---:|---|
| `Alhangeul_0.1.2_x64-setup.exe` | 58453088 | `36633c7cab4883457eb584e88645c272287d53a3dfb013ae5ea640130f7fe48c` |
| `Alhangeul_0.1.2_x64_en-US.msi` | 66150400 | `8e1b0e87475c7de8a373d4323634f2d12a997aa101e1aa31db4b822d17d52602` |
| `Alhangeul_0.1.2_amd64.AppImage` | 136792568 | `a24d4f1d4245fd14f7c63d5c8db4db83cb4d7eddd6fdb8211942caa0f9ace866` |
| `Alhangeul_0.1.2_amd64.deb` | 69248564 | `b213217d22653adfc856de4dcab70b746341610d818ab310224622509c301fa4` |
| `Alhangeul-0.1.2-1.x86_64.rpm` | 69249334 | `73397d3dbc619e43e58c86b60d42194fcfb4c570adbd8cfd52be0e383774148d` |
| `Alhangeul_0.1.2_arm64.deb` | 68845474 | `1da1665db6aa0b1aa6ce292b76c2c630076023b1a5ff7519142a8d26e80936d3` |

## 본문 변경 정도 / 본문 무손실 여부

기존 schema를 유지하고 status=draft/publishedAt=null이다. 새로운 metadata는 기존 P의
real inventory·payload·signature에서 계산했고 FF source만 치환하거나 FF bytes를 승계하지 않았다.
새 Linux GUI에서 통과한 CanvasKit 빈 페이지 보정을 appChanges에 반영하고 보정 전 실패 문구를
현재 limitations에서 제외했다. 과거 FF의 failure 및 stage3.1/3.2 기록은 보존했다.
현재 production 0.1.1·site/manifest는 그대로다. product/native/WASM·lock bytes는 P와 동일하다.

## 검증 결과

- ordinary [37728636737](https://github.com/postmelee/alhangeul-tauri/actions/runs/37728636737):
  P workflow/checkout, all/full/run_tests=true/publish=false, 선택 job14 전체 success.
  native Windows258·Linux x64/arm64 각247, fail/ignored0. 세 core 및 package/설치 계약 완료.
- signing [37732807293](https://github.com/postmelee/alhangeul-tauri/actions/runs/37732807293):
  P workflow/checkout·version012/tagv012·publish=false, 두 producer·합산 inventory success.
  production 공개키 Minisign3을 독립 검증하고 합산 target inventory와 정확히 대조했다.
  fingerprint `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`.
- 최초 signing37728692039는 release_notes 누락으로 checkout 전 실패했다. source·version·tag·
  publish=false를 유지하고 nonempty 준비 문구를 공급한 새 run으로 원인을 보정했다.
  기존 실패 run을 성공으로 치환하거나 같은 입력을 반복하지 않았다.
- 정상 required-reviewer Environment review는 S2 deployment6928025186/6928025192, source P다.
  current_user_can_approve=true·prevent_self_review=false 경로이며 보호 정책 변경/우회가 없었다.
- Linux ZIP의 exact case-sensitive path/size/hash와 기존 AppDir 중간물 제외 계약을 확인했다.
  Linux 실제 소비자는 strict extracted inventory를 통과했다. 원본 inventory를 수정하지 않았다.
- Linux full [37732474374](https://github.com/postmelee/alhangeul-tauri/actions/runs/37732474374)
  success, artifact11530678040/digest87f03eeb... 검증. 설치·문서 save/reopen/restart·PDF·
  GTK/CUPS virtual print·Nautilus, nativePrint0/webdriver0. HWP6/HWPX10/newdoc1/GTK6/CUPS6,
  A4 29쪽의 본문·표·쪽 수를 시각 검토했다. 물리 printer 검증으로 확대하지 않는다.
- local-fonts [37732477818](https://github.com/postmelee/alhangeul-tauri/actions/runs/37732477818)
  success, artifact11530059114/digestf90b5da9... 검증. Canvas2D/CanvasKit의 34 observations:
  off/on·재감지·삭제/복구·새 창·process restart 통과. 삭제 시 페이지와 fallback 표시,
  복구 시 Abel 표시·CanvasKit localTypeface0→1/fallback1→0, render error없음을 확인했다.
  raw observations acceptance=unverified는 그대로 보존하고 scenario 수용과 공개 승인을 구분한다.

```bash
pnpm run check:release-notes
pnpm run test:release-notes
# validateCandidate(nsis/msi/appimage/rpm/arm64), verifyProductDependencies(P)
node scripts/releases/notes-cli.mjs generate --version 0.1.2 \
  --input /private/tmp/task113-stage3.3-artifacts/v0.1.2.notes.json \
  --output-dir /private/tmp/task113-stage3.4-notes-generated
git diff --check
```

- notes check2 documents, tests124/124·fail/cancelled/skipped0.
- candidate5 kinds 및 public key/WASM/parser/submodule exact dependencies 통과.
- 생성물은 별도 임시 staging이며 draft HTML·site·updater feed는 공개하지 않았다.
- `release-body.md`: 6036 bytes / `70a7b9a759a981e6f2b5ea41690ca7c6e72899cbbdbbccccf8df2a12fd22f69e`.
- `updater-notes.txt`: 358 bytes / `adac1d9c80d8fb5186622a8cae34f36b6e543e062a70aef0c849cc623dbca57f`.
- `website-release-note.html`: 9106 bytes / `9b399d1246d2170814dee7ad710f378f6149af5fa2ffea3e871b3fbd48612458`.

## 잔여 위험

- Windows ordinary NSIS raw1/12 failures·thumbnail not-accepted의 hosted 제한 유지.
  MSI strict raw0/0 failures·thumbnail/lifecycle success. 강제 MSI raw1/1 failure·3010,
  reboot-required·post-reboot-unverified다. 전체 artifact contract success를 기능 전부 성공으로 쓰지 않는다.
- Windows PDF37733046031 진행 중. signed NSIS/MSI/AppImage 실제 문서·글꼴 off/on·반복 입력/scroll,
  RPM/arm64/Fedora exact-file 수용은 이 metadata commit의 harness로 계속한다.
- 사용자 모든 Wayland/GPU·배포판/글꼴/문서·물리 printer, 실제 production011→012는 미검증이다.
- 최종 main source·Release/tag/assets·Pages/feed·production upgrade는 후속 결과 기반 승인 gate다.

## 다음 단계 영향

이 metadata commit의 exact harness SHA를 계산해 product P와 구분한다. 새 candidate 경로로
NSIS/MSI/AppImage·RPM/arm64·Fedora 검증을 실행한다. 이미 capture된 Windows PDF P와
두 producer의 입력을 유지하고, 같은 desktop ref의 pending은 한 건만 유지한다.

## 승인 기록과 진행 경계

작업지시자의 Stage3.3 명시 승인은 최소 보정·새 source 전체 빌드·비게시 signing·실제6종
설치/GUI 재검증이다. 현재 완료된 crypto/metadata/Linux 하위 범위는 그 승인 안에서 보고하며
같은 승인으로 남은 수용을 이어간다. Stage3 전체 완료·Stage4 진입·공개 승인을 뜻하지 않는다.
