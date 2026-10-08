# Task #113 Stage 3 — Windows/Linux v0.8.7 native와 실제 6종 패키지 수용

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 3
상태: 승인한 구현·검증 범위 완료 / Stage4 승인 대기 / v0.1.2 미게시
확인일: 2026-10-08 (Asia/Seoul)

## 단계 목적

rhwp087과 최소 글꼴 보정의 exact product `f79dbeadf56c0cdb6bdf576103f420591cecdc6b`를 Windows/Linux에서 검증한다.
실제 6 files·3 signatures와 native/GUI 근거를 고정한다. 구현 수용과 최종 main/public delivery를 구분한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| 앱 글꼴 hook·회귀 | document reload 대신 upstream refreshFontResources, 실제 cache/guard 유지 |
| 검증 harness | candidate provenance·signed x64 spec 선택·Fedora44 image·owned process exit·SVG loader |
| `mydocs/working/task_m010_113.json` | product P·성공 ordinary/signed producer·실제 5 candidate kinds |
| `docs/releases/v0.1.2.notes.json` | 같은 P·실제 assets6·Minisign inventory3·draft |
| `docs/releases/v0.1.2.md`·계획·오늘할일 | 실제 수용·실패 이력·남은 인계/공개 gate |
| Stage3.1~3.6 하위 기록 | 성공한 각각의 로컬/metadata 범위·과거 실패 보존 |

실제 파일은 성공한 ordinary37728636737의 DEBx64/RPM/DEBarm64와 성공한 signed37732807293의
NSIS/MSI/AppImage다. 일반 MSI/NSIS/AppImage로 signed 파일을 대체하지 않았다.

| 실제 installer | bytes | SHA-256 |
|---|---:|---|
| `Alhangeul_0.1.2_x64-setup.exe` | 58453088 | `36633c7cab4883457eb584e88645c272287d53a3dfb013ae5ea640130f7fe48c` |
| `Alhangeul_0.1.2_x64_en-US.msi` | 66150400 | `8e1b0e87475c7de8a373d4323634f2d12a997aa101e1aa31db4b822d17d52602` |
| `Alhangeul_0.1.2_amd64.AppImage` | 136792568 | `a24d4f1d4245fd14f7c63d5c8db4db83cb4d7eddd6fdb8211942caa0f9ace866` |
| `Alhangeul_0.1.2_amd64.deb` | 69248564 | `b213217d22653adfc856de4dcab70b746341610d818ab310224622509c301fa4` |
| `Alhangeul-0.1.2-1.x86_64.rpm` | 69249334 | `73397d3dbc619e43e58c86b60d42194fcfb4c570adbd8cfd52be0e383774148d` |
| `Alhangeul_0.1.2_arm64.deb` | 68845474 | `1da1665db6aa0b1aa6ce292b76c2c630076023b1a5ff7519142a8d26e80936d3` |

archive·signature 전체 identity는 [3.4 보고](task_m010_113_stage3.4.md)와 candidate/notes에 있다.
production key fingerprint는 `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`다.
Minisign3을 독립 검증하고 complete inventory와 일치함을 확인했다.

## 본문 변경 정도 / 본문 무손실 여부

작업지시자 승인에 따라 product hook3.3만 보정했다. upstream087/gitlink·WASM·native lock은 같다.
보정 전 FF의 성공/CanvasKit 실패/실제 bytes는 이력으로 보존하며 새 P에 승계하지 않았다.
이후 H/J/K는 검사·metadata·기록 commit이며 apps/crates/third_party/package/lock은 P와 동일하다.
JSON schema·draft/publishedAt=null을 유지한다. public site/manifest·tag/Release는 변경하지 않았다.

## 검증 결과

모든 최종 수용 run은 attempt1·completed/success이며 실제 head SHA를 확인했다.
product P와 harness H=`933b26f5269073ccef9e967fd3e25afbf266e117`, J=`20bcc1fd8f7d951fb64175f3577ed7b4efcccb6b`, K=`f4cc0017750fffeabe945f1f0df717fe640b330e`를 구분한다.

| 범위 | 실제 run | workflow/harness | 수용 |
|---|---:|---|---|
| 일반 all/full/tests=true | [37728636737](https://github.com/postmelee/alhangeul-tauri/actions/runs/37728636737) | P | native3·core3·package/smoke/status14 selected jobs success |
| 비게시 production-key signing | [37732807293](https://github.com/postmelee/alhangeul-tauri/actions/runs/37732807293) | P | Windows/Linux producer·합산 inventory success, public job skipped |
| DEBx64 full GUI | [37732474374](https://github.com/postmelee/alhangeul-tauri/actions/runs/37732474374) | P | 실제 설치·문서·PDF·GTK/CUPS virtual print·Nautilus/Thunar |
| Linux local-fonts | [37732477818](https://github.com/postmelee/alhangeul-tauri/actions/runs/37732477818) | P | 34 observations·Canvas2D/CanvasKit·삭제/복구·새 창/restart |
| Windows PDF | [37733046031](https://github.com/postmelee/alhangeul-tauri/actions/runs/37733046031) | P | fresh/restart HWP6/HWPX10, A4 32쪽·cleanup/policy restore |
| signed NSIS/MSI/AppImage | [37736564625](https://github.com/postmelee/alhangeul-tauri/actions/runs/37736564625) | H | 같은 signed bytes의 native 문서·글꼴 입력/scroll |
| RPM 독립 KVM | [37741321797](https://github.com/postmelee/alhangeul-tauri/actions/runs/37741321797) | J | Fedora44 실제 Xfce/X11·설치·HWP/HWPX·4 restart·complete/exit0 |
| RPM container | [37742491734](https://github.com/postmelee/alhangeul-tauri/actions/runs/37742491734) | K | 실제 SVG loader128×128·비root GUI·4 restart·complete/exit0 |
| ARM64-only | [37743003461](https://github.com/postmelee/alhangeul-tauri/actions/runs/37743003461) | K | actual DEB·문서·4 restart·upload/gate 모두 success |
| 최신 harness fast | [37742487390](https://github.com/postmelee/alhangeul-tauri/actions/runs/37742487390) | K | Node/Studio·Windows PowerShell 모두 success |

실행 입력: ordinary mode=artifact/all/full/run_tests=true/publish=false;
signing mode=updater/version012/tagv012/nonempty notes/publish=false;
각 exact-file mode는 candidate_path=mydocs/working/task_m010_113.json·publish=false다.
K의 RPM-only=linux-x64, ARM-only=linux-arm64다. 제품 rebuild 없이 P의 성공 producer bytes를 사용했다.

- native Rust Windows258·Linuxx64/arm64 각247, failed/ignored0. Mac Rust/Tauri/container 실행 없음.
- hook focused5·Studio283·upstream39, K automation1331/1331 및 Studio43 test files 통과.
  K Windows notes124/124·Windows59/59 및 thumbnail/installer PowerShell 계약 통과다.
- source/dependency pin·public key·actual inventory/ZIP digest와 실제 installer hash를 검증했다.
  Mac case-insensitive 추출 충돌은 원본 ZIP exact path/size/hash로 확인했다. inventory를 수정하지 않았고
  실제 Linux consumer strict extracted inventory는 통과했다.
- Linux A4 29쪽: direct HWP6/HWPX10/newdoc1/GTK6/CUPS6. Windows A4 32쪽과 함께 본문·표·쪽 수를
  시각 검토했다. physical print 또는 모든 문서의 layout 수용으로 확대하지 않는다.
- CanvasKit font 삭제 시 localTypeface0/fallback1·페이지 표시, 복구 시 typeface1/fallback0·Abel 표시,
  render error없음이다. 두 renderer34 observations의 실제 assertions/PNG를 확인했다.
- signed 3종 각 configuration4+editing16=20 observations·complete=true, 16 조합에서5회씩
  재열기/입력80·6쪽 문서 scroll20회·회당90 frame gaps/91 positions다. raw acceptance=unverified를
  변경하지 않았다. 성능 향상·이전010 수치 승계를 주장하지 않는다. generated 문서/PNG hash도 대조했다.
- Windows signed install/cleanup exit0·policy restored=true. AppImage는 portable file 실행/추출이며
  package install/cleanup 단계 skipped다. Linux DEB package lifecycle은 일반 producer에 포함한다.
- Nautilus/Thunar 실제 HWP/HWPX helper first2→cached2→changed4, failed input successPNG0,
  cache metadata·PNG·screenshot을 확인했다. Windows MSI strict thumbnail/lifecycle은 raw0/0 failures다.
- RPM container의 loader는 동일 비root user·GdkPixbuf actual SVG/PNG이며 Glycin sandbox를 끄지 않았다.
  일회성 container apparmor=unconfined, 기존seccomp·readonly code mounts·단일evidence mount 조건이다.
  host policy/daemon/sysctl·privileged/cap-add·credentials 변경/전달은 없다.
- J VM에서 실제 KVM·Xfce·nonroot LightDM X11 session·RPM0.1.2-1·transfer hash·4 owned exits를 확인했다.
  VM imageSHA28680fe5... 검증, complete/exit0 및 종료 정리를 수용했다.

독립 download/digest·actual structured evidence:

| 범위 | evidence artifact ID | archive digest |
|---|---:|---|
| Linux full | 11530678040 | `sha256:87f03eeb3d22ac6f3b9b2fe803bd3ca65c81842c8f449469aa7b52ded687c2b1` |
| Linux fonts | 11530059114 | `sha256:f90b5da960d055a439d7b44c3760c2e83f800f465fc7ada3756eb73b6bc04831` |
| Windows PDF raw | 11532181467 | `sha256:77eda772e800818fb51fead0a99bb423ed8d9ec52ccb41ed1b09789efd21f6bc` |
| Windows PDF analysis | 11532073193 | `sha256:a69a4e112a48941a435c454afa0e704f315d37abf48f481683a2480a60920461` |
| signed MSI GUI | 11531844900 | `sha256:c1f737b83cb371c8ba87a23ede6d56454be6bba226f31b498d0cc558da55ff77` |
| signed NSIS GUI | 11532337524 | `sha256:1a070be9612f312fa14aebcde41fe03c213219127479035b04920f1a027436b9` |
| signed AppImage GUI | 11532780168 | `sha256:03a25216206fa51281c716af5c61cbe42e2d73e610c912e60e490d84436b6054` |
| Fedora VM | 11534350957 | `sha256:fdfe2da931213131d5137ef9e8f993902d6946007f8ed840b5efa8f0b55a713b` |
| Fedora container | 11534457410 | `sha256:28da3d29338ed7fa33ace6b4d76ea48e9d7e5f5c9a4aeda0eb3a8b662e76d40e` |
| ARM64-only | 11535020932 | `sha256:ac08b424b04c89a50e4e3c1c39b544250ac93a7d58e27577d2725f6190fbfcb7` |

failed37737163861/37738091057/37741260462 및 최초 signing37728692039는 성공으로 바꾸지 않았다.
old manifest404·x64 spec scope·VM third session timeout·GTK SVG loader abort를 각각 보정했다.
ARM successful sibling의 failed 전체 run 대신 최종 성공 ARM-only를 사용했다.

```bash
pnpm run check:release-notes
# actual producer/consumer run, inventory/signature/ZIP/file/scenario receipts 검증
# verifyProductDependencies(P), git diff product paths(P..HEAD)
git diff --check
```

JSON 기존 규격·2 documents check, candidate5 kinds·real assets6·3 sigs·draft metadata 정합 통과다.
생성 body6036/70a7b9a7..., HTML9106/9b399d12..., short358/adac1d9c...는 임시 staging에만 있다.

## 잔여 위험

- NSIS hosted thumbnail은 raw1/12 failures·not-accepted, lifecycle은 passed인 기존 제한이다.
  강제 MSI는 raw1/1 failure·3010/reboot-required·post-reboot-unverified다. 일반 full 성공이
  이 제한의 해결을 뜻하지 않는다. installer Authenticode 미서명과 updater Minisign은 별개다.
- 모든 Wayland/GPU/글꼴/문서/배포판·physical printer·물리 IME·concurrent edit/TTL는 미검증이다.
- native PDF는 기존 registry svg2pdf0.13 direct path다. upstream vendor patch 자동 적용 주장 없음.
- exact main source·최종 main 일반/비게시 signing files·Release/tag/assets·Pages/feed·실제011→012는 미실행이다.
- Actions evidence는 임시 보존물이며 final release asset이 아니다. 검증 범위와 actual byte 변경을 구분한다.

## 다음 단계 영향

Stage4에서는 최종 구현 보고·notes/원문 정합·오늘할일과 devel 대상 task PR을 준비한다.
#113은 배포 추적을 위해 OPEN 유지한다. main 승격·새 source/signing·게시11 assets와10 checksum행·
site/feed·실제 updater 전달은 수행계획의 각 결과 기반 gate에서 이어간다.

## 승인 요청

Stage3 수용 보고 검토와 Stage4 최종 보고·devel 대상 PR 게시 진입 승인을 요청한다.
AGENTS.md의 “각 단계 완료 후 승인 없이 다음 단계 진행 금지”를 따른다.
현재 수용이 최종 main/Release/Pages의 미확정 입력 승인을 대신하지 않는다.
