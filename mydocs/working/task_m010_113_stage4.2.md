# Task #113 Stage 4.2 — 최종 main 후보·새 6종 파일 수용

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.2 — 구현 인계 후 release runbook Gate 2~3
상태: 승인 범위 수용 완료 / Gate 4 공개 승인 대기
확인일: 2026-10-09 01:23 (Asia/Seoul)

## 단계 목적

PR117 devel merge·PR118 main merge 뒤 실제 main `6dcb05e96ec2075d09d8a60160e1d82f08c0811b`를 고정하고,
이 SHA에서 새 ordinary·production-key signed 후보와 게시할 6종 파일을 다시 검증했다.
작업지시자의 “진행해줘”가 제시한 exact main/ref·all/full/tests=true·publish=false와 새6종
설치/GUI 수용을 승인했다. 공개 tag/Release·Pages/feed·실제011→012·Issue close는 후속 gate다.

## 산출물

| 위치 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_113.json` | actual main producer/run/ID/digest/installer SHA 5종 입력 |
| `docs/releases/v0.1.2.notes.json` | strict draft·main source·actual6 files/3sig·13 merged PR/5Issue |
| 기존 release 기록/인덱스·구현/최종 보고·오늘할일 | main 수용과 미게시 delivery 상태 연결 |
| 임시 staged11 files·생성 notes·검산 receipt | 실제 원본 bytes, checksum10행·본문 hash, 서명/GUI/시각 근거 |

## 본문 변경 정도 / 본문 무손실 여부

제품·CI·scripts·tests·pin/lock/core/WASM/Studio 구현 변경은 없다. H `dfa855a3cefe34465cd9033b83a7b49179123d66`는
candidate/notes·추적 data-only harness다. main tree는 승인 devel8a91bf52와 같고 product P
`f79dbeadf56c0cdb6bdf576103f420591cecdc6b`의 product paths/dependencies도 같다.
P의 Windows PDF·Linux font34 수용은 이 diff 근거로 재사용했다. 새 bytes의 설치·무결성은 재사용하지 않았다.
기존 FF/P 실패·부분 수용·known limitation과 당시 snapshot을 보존하고 현재 main 기록을 덧붙였다.
문서 위치는 기존 승인된 docs/releases·mydocs/plans/working/report/orders다. site/공개 전환은 없다.

## 검증 결과

```bash
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run check:release-notes
pnpm run test:release-notes
# source=workflow=build_ref=checkout=main 6dcb05e9
# ordinary all/full/run_tests=true + updater012/v012/nonempty notes; publish_release=false
# actual archive digest·case-sensitive ZIP inventory·file size/hash·Minisign3·6종 설치/문서/시각 검산
git diff --exit-code 6dcb05e96ec2075d09d8a60160e1d82f08c0811b -- apps crates third_party package.json pnpm-lock.yaml .github scripts tests
git diff --check
```

| 실행 | source / harness | 실제 수용 |
|---|---|---|
| [ordinary37789356504](https://github.com/postmelee/alhangeul-tauri/actions/runs/37789356504) | main / main | attempt1·필수14 success, Windows258/Linux각247 Rust tests·failed/ignored0 |
| [signed37789417321](https://github.com/postmelee/alhangeul-tauri/actions/runs/37789417321) | main / main | 두 build·complete inventory success·publish skipped·actual Minisign3 독립 검산 |
| [DEB x6437796099048](https://github.com/postmelee/alhangeul-tauri/actions/runs/37796099048) | main / main | actual hash 설치·문서8시나리오·PDF/GTK/CUPS29A4쪽·Nautilus/Thunar structured+visual |
| [signed3 GUI37802164321](https://github.com/postmelee/alhangeul-tauri/actions/runs/37802164321) | main / H | NSIS/MSI/AppImage whole success·각2문서·save/edit/restart/reopen·actual hash/3sig |
| [RPM/ARM37802538555](https://github.com/postmelee/alhangeul-tauri/actions/runs/37802538555) | main / H | whole success·각2문서/4 owned restarts·phase complete/0·actual hash |
| [Fedora VM37804655669](https://github.com/postmelee/alhangeul-tauri/actions/runs/37804655669) | main / H | Fedora44 KVM/Xfce/X11/nonroot actual RPM·2문서/4 restarts·VM/GUI complete/0 |

- Windows signed NSIS/MSI install·cleanup exit0, WebView2 policy restored=true. AppImage는 writable
  original FUSE portable 실행이며 install/cleanup skipped를 성공한 uninstall로 해석하지 않았다.
- signed3종 각각 configuration4/editing16·총20관측, 각5반복의 입력/재열기80·6쪽90-frame scroll20을
  완료했다. raw performance acceptance=unverified를 보존하고 성능 향상율/010 A-B를 주장하지 않는다.
- saved HWP/HWPX 총10 files의 실제 size/hash와 bundled-core 독립 text parse에서 edit marker 유지,
  10 reopened 화면도 확인했다. VM의 별도2문서·4 UID/PID/startTime 종료 fence도 실제 완료했다.
- main DEB의 native PDF/가상 인쇄29쪽을 원본 hash와 대조·재렌더링해 표·본문·page count·경계를 확인했다.
  실제 manager first/cached/changed와 HWP/HWPX thumbnail 화면을 확인했다. 물리 프린터 수용이 아니다.
- production 공개키 fingerprint는 `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`다.
  기존 release Environment normal required-reviewer로 승인했고 보호·키·endpoint를 바꾸지 않았다.
  Minisign은 bytes 서명이며 sourceSha는 provenance다. Authenticode와 구분한다.
- notes2 documents·124 tests passed/failed0/skipped0, candidate5 계약, product/CI 구현 diff 없음과 diff check 통과다.
  확인시각 형식·검산 DTO 가정을 수정해 strict 데이터 검사에 맞췄다. 로컬 API 연결 오류는 관측 오류이며
  원격 실패/재실행으로 바꾸지 않았다. 모든 최종 run은 attempt1·success다.

### 실제 최종 파일

| 대상 | basename | bytes | SHA-256 |
|---|---|---:|---|
| windows-x86_64-nsis | `Alhangeul_0.1.2_x64-setup.exe` | 58453720 | `591fac591d4d35b50abbdd78d32ea8ccbf1334f6e522e545d5a28076aa2776c3` |
| windows-x86_64-msi | `Alhangeul_0.1.2_x64_en-US.msi` | 66150400 | `12fbf4f551e32e9c08b762ffd8e5ccc05f6a6534a20bb29c409ec4e0763dd951` |
| linux-x86_64-appimage | `Alhangeul_0.1.2_amd64.AppImage` | 136792568 | `b216c098dbebafc062b463edd225d918071a6710c9bf8c874055298a3224ea80` |
| linux-x86_64-deb | `Alhangeul_0.1.2_amd64.deb` | 69249210 | `c98d3d3683182cb313b3964ee274aa7f059db84e212f1f77c80d82b1e7ac21f3` |
| linux-x86_64-rpm | `Alhangeul-0.1.2-1.x86_64.rpm` | 69250012 | `ea7b3e130e0ee8aa908dde1e4b395dcb281a49a932c72f447ce396616d55c278` |
| linux-aarch64-deb | `Alhangeul_0.1.2_arm64.deb` | 68845454 | `dd5be5d66334543ddf07bfc88dd732ac7037af40bb12150d7f162d54b45314a2` |

### producer archive

| 이름 | run | artifact ID | archive digest |
|---|---:|---:|---|
| alhangeul-desktop-linux-x64 | 37789356504 | 11558430515 | `sha256:bd52bfe980626117b6323ab66994b3e746c5556abe166f0b62e9a033e6b9b268` |
| alhangeul-desktop-linux-arm64 | 37789356504 | 11557022500 | `sha256:2fecab898718c913bbf0fc90f9221e7c6a4d036d37ab997fc532c35cc66c4f86` |
| alhangeul-updater-windows-x64 | 37789417321 | 11559594414 | `sha256:1b0668ad93d08a0588659e231c2ca13bce0688ac503b98759267a8d993adc673` |
| alhangeul-updater-linux-x64 | 37789417321 | 11559941226 | `sha256:e17c59b6e64cb03ab71bfda18cfc4ecf0f7d10ca5501ac17110979c303b2ee35` |
| alhangeul-updater-release-inventory | 37789417321 | 11560103440 | `sha256:f61e1505e158681c3b99a7c4f5cce6ae8311320d2af995f8f6964f1da189eb67` |

### 수용 archive

| 구분 | artifact ID | digest |
|---|---:|---|
| DEB x64 | 11559501170 | `sha256:513e7b3023b3b9773d21d21e4d47a2376f90f30b53aa0a5ad89870e872332492` |
| msi | 11562041903 | `sha256:ac0a7eb9b76f21b3549002923b5167230a14bbc21b1ae2fe54db18cb29f812a3` |
| nsis | 11561901347 | `sha256:bee1763245362bdf2aba99fb09097eb9417195de77da483be17adfd0efcc1367` |
| appimage | 11561652554 | `sha256:17f031d2b3f79687c82632d87acd44261770a03a1a3f49784c392d0e565cd908` |
| rpm | 11562396095 | `sha256:709dde4c925afe691d991bd98229df6d4551496f40d05cd9f24b33380382b039` |
| arm64 | 11561987674 | `sha256:d1a104a33737e7deb754b662767f895fd037b7f0db0a4351477600016fc3fa2d` |
| Fedora VM | 11562407182 | `sha256:44b3e90ea106cadd37b52ccda3aa1e1f4a37fe7cf7ae7c7fcb38883b5b386f0c` |

### 공개 승인 입력

- Source main `6dcb05e96ec2075d09d8a60160e1d82f08c0811b`, version/tag012/v012, Stable·non-prerelease, CLI actor postmelee.
- updater 한 성공 run의 installer3·sig3·complete inventory1와 same main ordinary의 manual3,
  input10 + SHA256SUMS = asset11. checksum10행 hash `40db73dfe179c9a86851ac1765871a56a7d8857f6dda86ced4712bbcf7f2b791`.
- 생성 `release-body.md` 6170 bytes / `4cd331f7d46257fe7dfcf709fa0304ec008261091007e04209c6ea1cef4aecc6`.
  website HTML9106/9b399d12...·short358/adac1d9c...는 로컬 staging이며 공개 tree에 넣지 않았다.
- tag012·Release012 부재 조회 성공, 현재 public011·latest upstream087·#113 OPEN 확인.
  dispatch/게시 직전 ref·중복을 다시 확인한다. 이전 tag/asset을 이동·덮어쓰지 않는다.

## 잔여 위험

- main ordinary NSIS raw exit1/12실패·hosted diagnostic passed·thumbnail not-accepted, lifecycle passed.
  일반 MSI raw0/0·strict-product passed. forced MSI raw1/1·3010/reboot-required·post-reboot-unverified 유지다.
  signed NSIS 문서/설치 GUI 성공은 hosted Shell thumbnail 제한 해결을 뜻하지 않는다. MSI 대안과 지원 범위의
  최종 공개 판단은 owner에게 제시한다. Windows Authenticode unsigned와 updater Minisign을 혼동하지 않는다.
- 물리 printer/IME·모든 Wayland/GPU/사용자 문서/글꼴·미래 다른 Stable writer full positive는 미검증이다.
- 실제 Release/tag/assets·Pages/feed·011→012 production upgrade는 아직 미실행이다.

## 다음 단계 영향

검증한11 bytes/본문 그대로 Gate4 maintainer CLI의 새 tag(main6d)·draft upload·11파일/notes read-back·
stable 공개/read-back을 승인받는다. 게시 중 source/파일 drift·기존 tag/Release·원격 불일치는 중단 후 판단한다.
Release read-back 뒤 별도 Pages/manifest·production upgrade 게이트를 진행한다. #113은 계속 OPEN이다.

## 승인 요청

Gate2~3 수용 결과와 공개 파일/본문 hash를 검토하고 Gate4 CLI/tag/draft/Stable 공개를 승인한다.
`publish_release=true` 재빌드를 사용하지 않고 이번 exact bytes를 그대로 승격한다.
