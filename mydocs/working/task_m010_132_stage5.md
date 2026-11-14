# Task #132 Stage 5 — 최종 서명 파일 검증과 v0.1.3 재릴리즈 준비

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)
구현계획서: [task_m010_132_impl.md](../plans/task_m010_132_impl.md)
Stage: 5

## 단계 목적

사용자의 “병합과 비게시 서명·검증까지 진행” 승인에 따라 수정 제품을 병합하고, 실제 교체할 파일의 검증과 원본 복구 자료를 준비한다. 태그·공개 파일·Pages 교체는 요청된 사전 보고 경계에서 대기한다.

[PR #138](https://github.com/postmelee/alhangeul-tauri/pull/138)을 devel에 병합한 `a79ce6c160844be248f45c1d8092bc4b6c175d26`, [PR #139](https://github.com/postmelee/alhangeul-tauri/pull/139)를 main에 병합한 `4e99e883eec6bdf9d6ce59070c769f175052fc3f`를 확인했다. 두 병합 결과와 #138 head의 tree는 `36d75ba53059a376763cd90862490e334792a64d`로 같다. Stage 5는 제품 소스·버전·production key를 변경하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/ci/guest-ui-signed-input.mjs` | 성공한 생산 run, archive ID/digest, exact file/inventory와 production Minisign 검증 |
| `scripts/ci/guest-ui-{msi-input,signed-product}.py` | MSI 식별자와 추출 handler/worker의 실제 설치 bytes·PE import 연결 |
| `scripts/ci/guest-ui-msi-upgrade.ps1` 및 기존 guest helpers | 공개 MSI→동일 버전 후보, 실제 등록 교체·데이터 sentinel·첫 API·Explorer·제거 |
| `.github/workflows/{ci,alhangeul-windows-guest-probe}.yml` | 명시 candidate 입력과 MSI upgrade opt-in |
| `tests/{ci-windows-guest.test.py,windows-guest-msi.test.ps1}` | identity/3010 거부와 Windows registry 격리 회귀 |
| `mydocs/working/task_m010_132.json` | source/run/artifact/digest/file hash를 고정한 최종 후보 5항목 |
| 기존 계획·최종 보고·오늘할일·`docs/releases/v0.1.3.md` | 승인된 위치에 현재 비게시 결과와 이전 공개 이력 구분 |
| 비공개 산출물 | 원본 11개·서명·태그·본문·Pages 보존, 교체 11개 staging·checksum, 적용/복구 patch와 사전 조건 |

serial 증거 수 상한은 MSI 관리자 기록 추가에 맞춰 20→24다. 개별 5MiB·허용 파일명·중복·hash·전체 완료 검사는 유지한다. 제품 버전은 0.1.3이며 빌드 source는 아래 SHA로 고정한다.

## 본문 변경 정도 / 본문 무손실 여부

Stage 1~4의 실패·진단·ordinary 후보 이력과 최초 공개 기록은 보존했다. 현재 결과는 Stage 5로 분리했다. 승인된 문서 위치 외 새 공식 문서 루트와 로컬 머신 경로·private 증거·routing symlink를 커밋하지 않는다. 공개 notes JSON·site 데이터는 아직 이전 공개본이다.

## 검증 결과

검증 명령은 이전 하네스의 `pnpm run test:automation`, `python3 -B tests/ci-windows-guest.test.py`와 각 run의 workflow 단계에 기록했다. 최종 문서 변경에서는 다음 정적 검사를 실행했다.

```bash
node scripts/check-product-boundary.mjs
git diff --check
git diff --exit-code 4e99e883eec6bdf9d6ce59070c769f175052fc3f -- apps packages crates third_party
```

결과: boundary924개 파일, candidate5/5, 변경 문서 상대 링크33개, diff·제품 불변 검사 통과. 후속 PR required는 현재 보고서 head의 fast와 별도로 merge candidate에서 확인한다.

### 생산·서명·전체 회귀

- 제품 source: `4e99e883eec6bdf9d6ce59070c769f175052fc3f`.
- [비게시 signing 43551466131](https://github.com/postmelee/alhangeul-tauri/actions/runs/43551466131): success, `publish_release=false`, publish job skipped. NSIS/MSI/AppImage 세 Minisign 독립 검산과 complete inventory 일치.
- production key fingerprint: `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`.
- [전체 CI 43551469171](https://github.com/postmelee/alhangeul-tauri/actions/runs/43551469171): full/scope=full, 동일 버전 upgrade=true, 모든 선택 gate success. Windows/Linux x64/arm64 core·native·Clippy·package와 표준 사용자 NSIS fresh/upgrade를 확인했다.
- Windows core 11 fixture, Linux 각 target 88 record/evaluation에서 기준 위반 없음. NSIS 소유 DLL cleanup의 일시 잠금 성공/영구 잠금1603 네 회귀 통과.
- **진단과 제품 수용 구분:** elevated NSIS raw exit1/12 failures는 제한 진단 계약만 통과했다. MSI forced-reinstall raw exit1/1 failure, 실제3010은 reboot-required/post-reboot-unverified다. strict MSI normal raw exit0/0 failures와 일반 표준 사용자 NSIS는 제품 수용 통과다.
- [하네스 fast 43552083626](https://github.com/postmelee/alhangeul-tauri/actions/runs/43552083626): 로컬 automation 1,421개와 Windows PowerShell 122 sources/25 isolated tests 확인. 이후 8 guest run의 선행 fast도 성공. 최종 보고 head의 fast/PR required 결과는 후속 PR에 연결한다.
- 변경 workflow actionlint는 기존 font-performance SC2016 범위 때문에 shellcheck 제외로 실행했다. product-boundary·diff 검사와 제품 소스 불변 비교를 통과했다.

### 교체 파일 고정 목록

아래 11개는 아직 공개하지 않았다. signed 파일 6개와 complete inventory는 signing run, DEB/RPM/arm64 DEB는 full CI의 exact archive에서 얻었다. SHA256SUMS의 10행을 실제 파일로 검산했다.

| 파일 | bytes | SHA256 |
|---|---:|---|
| Alhangeul-0.1.3-1.x86_64.rpm | 96353705 | `cc6ab762bf923b16784dbc04fa91c6da38d031301904c0a8b8e9bb6e6dd2dd52` |
| Alhangeul_0.1.3_amd64.AppImage | 153930232 | `56054103d8e18f0fa472bee96fe0bb6b0d1ee709af28f62f8faa0be89cbdcd54` |
| Alhangeul_0.1.3_amd64.AppImage.sig | 420 | `0cb7496f9f93decfaa647ff3fae0f6eba09f6ec7139993a95aff86622f7b8ed3` |
| Alhangeul_0.1.3_amd64.deb | 96360794 | `e8f001e78023438a8d7f0928566bed0beb4d49ab0f209551f45f1b6b520b7c23` |
| Alhangeul_0.1.3_arm64.deb | 95426326 | `b7cb4c8b4f3657e2a45bd756e41e678104ca2db1b4f446e03e05e0669145bd47` |
| Alhangeul_0.1.3_x64-setup.exe | 78770000 | `d5b21111a9df1d68587e1bec341565a2e42cc02e1658f094eeba84e69bd7372a` |
| Alhangeul_0.1.3_x64-setup.exe.sig | 420 | `bd872f79c46e2b6252094c08d0c7d60e3b17bb6c38c5fa21fe6dd7e5671d0a0e` |
| Alhangeul_0.1.3_x64_en-US.msi | 91357184 | `e3d1a5eff7c239f04292ad152ca5e0c9972cf086086809b7d8d6e7b5f38a2373` |
| Alhangeul_0.1.3_x64_en-US.msi.sig | 420 | `69d2544a48c7726bc34ea9317c62b10b2ca6866ba0d9917121d50ffa0958d5de` |
| SHA256SUMS | 976 | `3995a6e84ff8ac08f4a97254bf7dafa0c0b8fdbe62747cd26fceda2128882074` |
| alhangeul-updater-release-inventory.json | 2606 | `1d6eb0fbe8d8e01f2cfe805ebca9bf294d55df0353fef8a3954f5f0e5511a901` |

서명 Windows archive 14096864912/digest `27c1df18b75b756df916e2e1bf9bb1b759caae384e64fbeed84fb11abd929552`, 서명 Linux 14097027120/`f7ec04e7e578b76c79e31d0ea00915a0fe968a3797fa1f313c41837e9c0d54ad`, complete inventory 14097840876/`c0a969d50c22186ec43876b9e79457032d8722a0583eebdd44c16bcfc114d313`를 내려받아 ZIP hash를 확인했다.

ordinary Linux x64 archive 14098257555/`8c956772d8fa9b098c4c66c8ac5f105f35cf5f4a83fcf92d3d41c81f10dffd02`, arm64 14097628577/`d4037a41f80274496bf6968dbf8b29dbda85f9b500da0037026201c7fdab5e56`도 ZIP과 exact case-sensitive 경로의 inventory를 대조했다. x64의 AppDir 중간 파일은 기존 verifier 계약에 따라 제외하며 새로운 설치 파일로 취급하지 않는다.

### 최종 signed Windows client 8경로

harness `0310f1715d6f7ea0b725da2a7d41ed25b2621a28`, signed producer 43551466131, 위 NSIS/MSI의 실제 bytes를 사용했다.

| Windows | 경로 | run | artifact | ZIP SHA256 |
|---|---|---|---|---|
| 11 | msi-upgrade | [43554837598](https://github.com/postmelee/alhangeul-tauri/actions/runs/43554837598) | 14098737061 | `282c93462d9f91366c68a2879c86be3920352a8b751f0dd2e674df2b01269d35` |
| 11 | nsis | [43555630065](https://github.com/postmelee/alhangeul-tauri/actions/runs/43555630065) | 14098188457 | `3d344c3d2be5cd5ede26984a09ed4c3cef0b919f17c2de8dabc90dfc9cbff781` |
| 11 | msi | [43555632937](https://github.com/postmelee/alhangeul-tauri/actions/runs/43555632937) | 14097959210 | `70492887b19fae0e891a6cc077444166f2de71a4845f0a18991853eb438b950a` |
| 11 | nsis-upgrade | [43555635389](https://github.com/postmelee/alhangeul-tauri/actions/runs/43555635389) | 14098379640 | `599a2e1cb5354d9e6095c046bd6f7314b011ed489bb89f4c1ef7e311f7a51c3c` |
| 10 | nsis | [43555637932](https://github.com/postmelee/alhangeul-tauri/actions/runs/43555637932) | 14098702493 | `8aac89eeb9732f68ba9ef5fa2c4dd3b356636ce9c7bff30f611be2f0d873f21b` |
| 10 | msi | [43555639938](https://github.com/postmelee/alhangeul-tauri/actions/runs/43555639938) | 14098393792 | `4aa2ef17bd649850f87f2871c64439a2d0dd8c1a40d3a9e0ab48101a23c41db7` |
| 10 | nsis-upgrade | [43555642270](https://github.com/postmelee/alhangeul-tauri/actions/runs/43555642270) | 14098408718 | `8a75f2d8896673594b4751084c925944639661e32c2bef5103de2b43ff74e839` |
| 10 | msi-upgrade | [43555644701](https://github.com/postmelee/alhangeul-tauri/actions/runs/43555644701) | 14098207898 | `75a2a31e4332e000b7f78efa9169d6c54e5e5118a8bd1a29a3d4952099940b64` |

여덟 run 모두 표준 사용자 token8192·관리자 아님·해당 사용자 Explorer/session을 확인했다. 새 설치 clean 상태에서 VC runtime 부재126과 reference handler load0, offline 실제 설치, 설치된 handler/worker hash를 대조했다. install/reinstall/uninstall 모두0이며 upgrade baseline도0이다. 3010이 발생한 경로를 성공으로 승격하지 않았다.

재설치 후 API 32/32, upgrade 첫 API 16/16, 10/30/60초 Explorer PNG 24개에서 내용 썸네일을 확인했다. 공개본과 새 후보의 같은 VM 비교에서 Win11 NSIS/MSI upgrade baseline의 small-hwp는 0x8004B200였고 새 후보 첫 요청은 각각4/4 성공했다. Win10 baseline은 성공했다. 빈 preview fixture는 API bitmap과 fixture 원문을 함께 판정했으며 빈 종이를 실패로 오인하지 않았다.

MSI ProductCode는 `{61B2FF7F-42E5-4636-8279-248104E6D699}`→`{3D1EB27A-77A6-4772-AD4B-7D77B5BF8F1B}`, UpgradeCode는 `{5B708917-6E23-58E3-B391-8F6EA66312A2}`로 같다. PackageCode는 `{57CA1ED1-91C1-430E-A181-8E0FB46BC626}`→`{EEC9961F-3403-488B-99C6-3972819DAB12}`, 버전은 양쪽0.1.3이다. 두 OS에서 새 제품 등록 정확히1개·이전 ProductCode 제거를 확인했다. Local/Roaming sentinel 보존은 테스트 파일 보존의 근거이며 모든 실제 설정을 수용했다는 뜻은 아니다.

설치 handler SHA256 `d2fb689dbae38c287898cf84210530f0f441bae1f0c70b944b637a170ef08899`, worker `d5203e07058cee3eec7388c91ed396d7afbadbca10f9855c05f3e6ed421df9bc`와 외부 VC import 부재를 확인했다. owned VM/TPM/supervisor 종료·disk/credential 제거도 통과했다. Shell 전체 경과와 handler 내부5초 예산은 동일 구간이 아니며 엄격한 전체 API5초를 주장하지 않는다.

### 최종 설치 파일 6종 문서·Linux GUI

| 대상 | 실행 | 검증 결과 |
|---|---|---|
| signed NSIS/MSI/AppImage | [43554839922](https://github.com/postmelee/alhangeul-tauri/actions/runs/43554839922) | HWP/HWPX 편집·저장·재시작·재열기, actual 문서·화면 hash, Windows 제거·policy 복구 success |
| x64 DEB | [43558882617](https://github.com/postmelee/alhangeul-tauri/actions/runs/43558882617) | full GUI 8 evidence, 파일61개 기록 검산; 저장·직접 PDF·GTK/CUPS·새 문서·native drag-in·Nautilus/Thunar success |
| x64 RPM | [43558885114](https://github.com/postmelee/alhangeul-tauri/actions/runs/43558885114) | Fedora44 QEMU/KVM Xfce/X11 실제 설치, HWP/HWPX roundtrip, VM 종료 success |
| arm64 DEB | [43558941868](https://github.com/postmelee/alhangeul-tauri/actions/runs/43558941868) | Ubuntu24.04 aarch64 실제 설치, HWP/HWPX roundtrip, app session 종료 success |

signed 문서 GUI harness는0310f171, manual Linux harness는 `5b2311caddb029b71a20498efd88e1910dcfe2dd`다. 제품 source는 모두4e99e883이다. 모든 생산/수용 run이 끝난 후 success와 archive digest, 실제 저장 문서/PNG의 크기·hash를 독립 확인했다.

수용 ZIP ID/SHA256:
- NSIS 14097359584/`ea13f128d3e918dc25647bd93f34ba9e9100a3355aedb2bbe2c34b4289fc70fc`.
- MSI 14097579578/`7f46d099e47a033210a2d464df84d12c6b6d053029b0fdcdb10abf59797dbbf7`.
- AppImage 14097888698/`8c011bf6e3d539ea1ae6766f95bb4d05ec2b4648c55a07a6c6d550131dcba403`.
- DEB 14100181387/`da4cc10ea6f68184df57f09ee3b58f864a354f30bb6c9d6eaae68be546994fcf`.
- RPM 14099842353/`0f1734ac74656e2def382b15a26a1b47a92ac0105a90efd7c689b9f0fd3a6888`.
- arm64 14099239550/`5a78c80096615acb1aaa3b11014b149a54511af1e0f11859bc16e0bd5447c447`.

각 release roundtrip의 original reopened PNG에서 한국어·표와 HWP 편집 marker를 확인했다. DEB는 native-save, Nautilus first, Thunar changed 원본을 확인했고, PDF는 직접/GTK/CUPS의2·4쪽, HWPX1·10쪽, 새 문서1쪽을 대표 검토했다. PDF 전체 페이지의 자동 구조·비어 있지 않음 검사는 통과했으나 모든 페이지의 시각적 동일성이나 서로 다른 print backend의 pixel 일치를 주장하지 않는다. font-performance의 acceptance=unverified는 관측 완료와 구분한다.

### 공개 변경 준비와 원본 보존

현재 Release ID441647361, 기존 source `bcb892d49a9003615f3acd980babd71e59e147dd`, tag object `8bb3b997cd2279c1e92f440ed7d1f1810c14b7cd`와 원본11개의 bytes·3서명·checksum·body·Pages 데이터를 보존했다. 공개 mutation은 하지 않았다.

교체안은 유지보수 Pages로 updater manifest를 잠시 비게시 → lease 조건으로 v0.1.3 tag만4e99e883으로 이동 → 동일 Release의 위11개와 본문 교체 → 공개 actual bytes/서명 read-back → 승인된 새 Pages/feed 순서다. 기존 원본 복구 patch와 hash 사전조건을 포함한다. 격리된 두 Pages 사본의 build·source/output 검사(22/25,22/26) 및 네 적용/복구 patch의 apply-check를 통과했다. 저장소의 공개 notes/site 파일에 적용하지 않았다.

제안 본문 hash는 `1d03bc67d54a4c2ea298ec1753ee4140a0850e4ae77bffc0d66ee68d71d73185`다. 최초 publishedAt은 유지하고 본문에2026-11-14 재배포와 같은 버전 수동 설치를 명시했다. 실제 실행일이 바뀌면 날짜·hash를 다시 제시한다.

## 잔여 위험

- NSIS는 사용자별 설치다. 관리자/UAC 비활성 Explorer는 MSI를 사용한다.
- forced MSI3010 재부팅 이후 수용, Authenticode/Smart App Control(#133), 실제 한컴 공존·고DPI·모든 현장PC는 미검증이다.
- 동일 v0.1.3 사용자에게 자동 업데이트 알림이 뜨지 않는다. 같은 버전 수동 설치 안내가 필요하다.
- 동일 URL의 파일·Pages는 원자적으로 바뀌지 않는다. 유지보수 중 캐시된 manifest/진행 중 다운로드는 잠시 실패할 수 있으며 서명 검증을 우회하지 않는다.
- 원본 bytes/내용/tag를 복구할 수 있지만 교체로 삭제된 GitHub asset ID·다운로드 횟수는 복구할 수 없다.

## 다음 단계 영향

검증 하네스·보고 후속 PR을 devel 대상으로 게시하고 필수 검사를 확인한다. 제품 후보는4e99e883으로 유지하며 보고서/harness head를 재빌드 source로 바꾸지 않는다. #132와 필요한 작업 자료는 공개 교체 승인/완료까지 유지한다.

## 승인 요청

이미 승인된 병합·비게시 서명·검증·PR 준비를 완료했다. **태그 이동·위11개 파일과 본문·Pages/feed 교체 및 실패 시 원본 복구**는 구체안을 전달한 후 명시 승인으로 진행한다. 후속 PR 검토·병합도 함께 요청한다.
