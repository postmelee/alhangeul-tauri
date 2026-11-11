# Task #126 Stage 2 — 최종 일반·서명 후보 생성

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md) · Stage 2

## 단계 목적

최종 main의 일반 패키지와 production 서명 후보를 생성하고, 실제 게시 파일을 다음 설치 검증 단계에 인계한다.

## 산출물

- 일반 producer [42996821567](https://github.com/postmelee/alhangeul-tauri/actions/runs/42996821567), 서명 producer [42996892999](https://github.com/postmelee/alhangeul-tauri/actions/runs/42996892999), 모두 attempt 1·SUCCESS.
- 공통 소스: `bcb892d49a9003615f3acd980babd71e59e147dd`. 버전/tag: 0.1.3/v0.1.3.
- 기존 키 fingerprint: `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`.
- private 증거는 T7에 보존: 원본 ZIP·run/artifact/job metadata, ordinary-verification.json, archive-inventory-verification.json, complete inventory, publish-files.json, candidate.json.
- 다음 표의 파일은 아직 미게시다. 설치 파일 6종·서명 3종·inventory·SHA256SUMS의 총 11개다.

| archive | ID | SHA-256 |
|---|---:|---|
| alhangeul-desktop-linux-arm64 | 13847156754 | `45e04e475be41501cb097c83ff20d4781d49840fcf56db8404e657c5c17e78a8` |
| alhangeul-desktop-linux-x64 | 13847083193 | `0f0870a377d0e3375f665342e3f5ffc96e4e45ceb2c18ad63b6d81d647d01027` |
| alhangeul-desktop-windows-x64 | 13846979530 | `b525b6cafadc370bb51b3f31ed334c20b6466c348a99d22980597945ab237d15` |
| alhangeul-updater-release-inventory | 13850652177 | `2efcf253ce7f0689a65c3b45f73512744c36283fa00127b7e5bec8cf8c0c6cd8` |
| alhangeul-updater-linux-x64 | 13850110883 | `52fe89672bae10ea3cd18666c094c81f23de1846b2a47a8b99fcc13bfa59f839` |
| alhangeul-updater-windows-x64 | 13850073360 | `5b3d405cd8a438cb9ffd361d4b5292fa417ff44349c12e5624c1cb50f09537be` |

| file | bytes | SHA-256 |
|---|---:|---|
| `Alhangeul-0.1.3-1.x86_64.rpm` | 96377362 | `5ed094d71f9c2d3c5fc8c15f27c9accaac35c5902a3b17518dfb541b98dbb183` |
| `Alhangeul_0.1.3_amd64.AppImage` | 153995768 | `740b622792eb6201691f5993c66f351d6b7cf3b66b5bbdda5771b5d0a2fc997e` |
| `Alhangeul_0.1.3_amd64.AppImage.sig` | 420 | `a2889c2770e6ef2c69ee8e7d138648ce19a84aef9e26b37ab779420e60f5e808` |
| `Alhangeul_0.1.3_amd64.deb` | 96375516 | `d1f39aac68b33db315253151bd241546120f1b72fe1f871f64969268918333dc` |
| `Alhangeul_0.1.3_arm64.deb` | 95447636 | `ad9e52d9c510fbdc3579f83aff8d8c33ea177bbf294acb670c0c7eb7f6fcd927` |
| `Alhangeul_0.1.3_x64-setup.exe` | 78654936 | `932c3316d9ea83cd5c38e3fe528518535751ac60fedd72776c5306085437c490` |
| `Alhangeul_0.1.3_x64-setup.exe.sig` | 420 | `16adfcd9f1b44155fb5e2aa854440cb97fa7fbd30a83983f0ce283b2c741bef6` |
| `Alhangeul_0.1.3_x64_en-US.msi` | 91193344 | `a953c0d09dec29246ae77340e019e7acae759aac24b21fc7a524326ab81b6085` |
| `Alhangeul_0.1.3_x64_en-US.msi.sig` | 420 | `6308ab988c42730028b1523c6f6aa0995464f7c342dd18cef59ce1000f99e290` |
| `alhangeul-updater-release-inventory.json` | 2606 | `5cb96a1d7e0e701d4b23abaf5910c07cef85f5c19d8e1e064867d4a8f64ee26b` |
| `SHA256SUMS` | 976 | `c26fba7d51546b28c38602d19f5905c6424a8998798ddf5caae17f3228361f82` |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드·기존 공개 데이터·키·환경 보호 설정은 변경하지 않았다. 본 보고서를 추가한다. 다음 단계용 candidate·notes 초안은 private 준비물이며 아직 제품 저장소나 공개 채널에 반영하지 않았다.

## 검증 결과

- 일반 실행: artifact/all/full/run_tests=true/publish_release=false. fast, Rust core 3종, native/package 3종, Windows installer 3종 및 최종 집계 성공.
- 서명 실행: updater, exact main, release_version=0.1.3, release_tag=v0.1.3, publish_release=false. 기존 release 환경에서 postmelee가 정상 reviewer 승인을 수행했다. 보호 우회·키 변경 없음.
- Build updater windows-x64, Build updater linux-x64, Verify complete updater release inventory 성공. Publish verified updater release는 skipped.
- 모든 선택 ZIP의 실제 SHA-256과 Actions artifact digest 일치. Windows 4·Linux x64 27·arm64 22개 inventory 파일의 원본 ZIP 경로·크기·SHA-256 일치.
- T7의 대소문자 비구분 파일시스템에서 Linux 중간 추출 경로 Alhangeul/alhangeul이 합쳐져 directory 기반 검사가 불일치했다. 원본 ZIP의 대소문자 구분 entry 전체를 직접 검증하여 53개 파일이 모두 일치함을 확인했다. Linux package lifecycle 계약 검사 및 source SHA 대조도 성공했다. 원본 패키지나 inventory를 고쳐 통과시키지 않았다.
- Windows 일반 bundle은 기존 verifyDesktopArtifacts 검사 성공. 진단 3종은 원시 summary/process/step/workflow, 실제 inventory, fixture manifest로 buildInstallerInput을 다시 구성하여 입력 bytes와 모든 binding hash가 일치했다.
- 일반 MSI: raw exit 0·failure 0, strict-product thumbnail/lifecycle 성공. NSIS: raw exit 1·failure 12, hosted diagnostic 계약 성공이나 thumbnail not-accepted. 강제 MSI: raw exit 1·failure 1, 3010 reboot-required·post-reboot-unverified. 이 두 제한을 제품 기능 통과로 기록하지 않는다.
- Windows 서명 ZIP 전송 지연은 해당 다운로드만 중지하고 부분 파일을 보존한 뒤 21개 HTTP Range로 회복했다. 각 Content-Range·크기와 합친 169,599,267 bytes의 공식 digest를 검증했다. 빌드 재실행이나 다른 파일 대체 없음.
- 실제 NSIS·MSI·AppImage bytes의 Minisign 3종 검증 성공. 재생성한 complete inventory와 CI 원본의 모든 field가 동일하다. sourceSha는 workflow provenance와 연결했으며 서명 자체가 commit을 증명한다고 간주하지 않는다.
- 수동 DEB x64·RPM x64·DEB arm64는 위 일반 producer의 같은 source에서 선택했다. 게시용 Windows/AppImage는 일반 파일 대신 서명 producer의 검증 파일이다.
- notes schema 및 파일 11개 목록·SHA256SUMS 10행 생성 성공. `git diff --check` 성공.

## 잔여 위험

실제 게시 파일 6종의 설치·문서 수용은 다음 단계다. 기존 NSIS 썸네일 및 강제 MSI 재부팅 후 미검증 제한을 유지한다. Authenticode 서명은 없으며 Minisign과 구분한다. GitHub Release·Pages·피드·실제 0.1.2→0.1.3 업데이트는 아직 실행하지 않았다.

## 다음 단계 영향

검증한 bytes와 archive ID/digest를 고정 candidate로 게시하고 실제 Windows NSIS/MSI, AppImage, Linux x64 DEB/RPM, arm64 DEB를 수용한다. 게시 시 재빌드하지 않는다.

## 승인 기록

작업지시자의 “등록하고 릴리즈 완료까지 계속 진행해줘.”에 따라 Stage 2 결과를 기록하고 Stage 3으로 계속 진행한다.
