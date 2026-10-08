# Task #113 Stage 3.2 — 실제 파일 identity·서명·draft notes 수용

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 승인된 Stage 3 안의 candidate/notes 완성 3.2
상태: crypto·JSON·생성 규격 완료 / 실제 설치·GUI 수용 및 CanvasKit 보정 판단 진행
확인일: 2026-10-08 (Asia/Seoul)

## 단계 목적

사용자가 선택한 “기존 규격 유지·JSON 완성 이연”에 따라 실제 6개 설치 파일의 크기·hash와
production 공개키 서명 3종을 검증한 뒤 candidate/notes JSON을 완성한다.
product `ff48d15011e53169bfd97b13a4f7084c3284c289`, rhwp v0.8.7 /
`1a76570e833917d15817415a53c09ad61ab3203f`이며 최종 main source는 이후 gate다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_113.json` | 실제 성공 producer의 NSIS/MSI/AppImage/RPM/arm64 identity 입력 |
| `docs/releases/v0.1.2.notes.json` | draft, 실제 6 assets·3 signature inventory·이전 0.1.1·실제 PR 11개/관련 Issue 5개 |
| `/private/tmp/task113-stage3-notes-generated` | 원문·기존 template에서 생성한 body/HTML/short notes |
| 기존 `v0.1.2.md`·계획·오늘할일 | 검증된 identity·GUI 결과·미완료·보정 승인 대기 기록 |

## 본문 변경 정도 / 본문 무손실 여부

schema·generator·public key·endpoint와 published v0.1.1 원문은 유지한다. 가상 size/hash/서명을
채우지 않았으며 새 HTML은 비게시 staging에 생성했다. source site/release.json과 manifest는
v0.1.1이다. 검사 SHA는 product FF와 구분한다. 현재 CanvasKit 실패도 draft 한계에 반영했다.

## 검증 결과

- ordinary [37719733676](https://github.com/postmelee/alhangeul-tauri/actions/runs/37719733676),
  signed [37719736557](https://github.com/postmelee/alhangeul-tauri/actions/runs/37719736557):
  attempt 1·동일 workflow/product FF·전체 success·publish_release=false.
- repository/head repository, exact run/workflow/source, 유일한 artifact ID/name/digest·양의 크기·
  expired=false 및 다운로드 ZIP 전체 SHA-256을 확인했다.
- ordinary Linux는 원본 ZIP의 배포 inventory 대상 path·size/hash를 직접 확인했다. 호스트의
  대소문자 병합을 분리했고 .AppDir 제외는 기존 verifier 계약이다. Linux full GUI의 엄격한
  추출 후 source/inventory 검증도 success다. 원본 archive/inventory를 수정하지 않았다.
- signed NSIS/MSI/AppImage의 bytes·signature를 공개키로 각각 검증하고 producer의 합산
  inventory와 정확히 일치함을 확인했다. fingerprint는
  `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`다.
- `validateCandidate` 5종 통과; notes check **2 documents**, notes tests **124/124**·fail/skipped 0.
- 기존 generator의 body/HTML/updater notes 3종 생성·hash 기록, `git diff --check` 통과.

| 종류 | run / archive ID | archive SHA-256 digest |
|---|---|---|
| ordinary linux-x64 | 37719733676 / 11526575562 | `sha256:b060357c241329eeddd178fa12d6ca8c9c237d21eed3cbd5cf3c106767149930` |
| ordinary linux-arm64 | 37719733676 / 11525968564 | `sha256:0bbef5f17935b7c0388233671a3cc8cc8af75f84a1cb1510cf45c4b25e12d789` |
| signed windows-x64 | 37719736557 / 11527666530 | `sha256:eadd5425965e014fdb7d2d50f9e5752a9b339aa84432957189ee84a5eb4f05d8` |
| signed linux-x64 | 37719736557 / 11527327151 | `sha256:9e348e2680b8f8fddd9389cdbd7208259998c5de8891a6ac4d725f970140778f` |
| signed inventory | 37719736557 / 11526629659 | `sha256:abb34a66c42ebc86d2f6d09d710c9e4d43ea7e8c6bb7f4127041457f509370ad` |

| 형식 | 파일 | bytes | SHA-256 |
|---|---|---:|---|
| windows-x86_64-nsis | `Alhangeul_0.1.2_x64-setup.exe` | 58450096 | `3948163b3ac7a89abef2dfa3cdff541faa0ea39df50da2440995a127310da90b` |
| windows-x86_64-msi | `Alhangeul_0.1.2_x64_en-US.msi` | 66146304 | `d418b265cee204b2e4c2f52b05490a5234da6a04d676080b9fc787dbef47f4c1` |
| linux-x86_64-appimage | `Alhangeul_0.1.2_amd64.AppImage` | 136788472 | `ec7658d10464dcbb5155cdfee0e29b89f27fdc27ed328b29b2c6374f98a7ecdd` |
| linux-x86_64-deb | `Alhangeul_0.1.2_amd64.deb` | 69250590 | `3fa9d63d8f33bafbf360344ef83fca0bb9056b2990a2fb302f7bb06aed343595` |
| linux-x86_64-rpm | `Alhangeul-0.1.2-1.x86_64.rpm` | 69250972 | `affac4b8698862b6781dff7c4758d9492d22a19d8e198fff2a35d1de45129a69` |
| linux-aarch64-deb | `Alhangeul_0.1.2_arm64.deb` | 68839400 | `71c5dbf4e5e488d6ef99f98e0cba8b2e9846fc3e14187a08f1ccc75a4b8dcd7b` |

생성물:

- `release-body.md`: 6140 bytes / `ec25e655602002e16e58344e92f02c3195040cde24d780fed27224f102d73472`
- `updater-notes.txt`: 358 bytes / `adac1d9c80d8fb5186622a8cae34f36b6e543e062a70aef0c849cc623dbca57f`
- `website-release-note.html`: 9190 bytes / `815daaa44b2721ac41526f0f8fe3f90075a0ab7b3b18b21964a23e59cde740d0`

## 잔여 위험

- Stage 3 전체는 미완료다. Linux full `37723131983`은 success지만 local-fonts
  `37723134560`과 추가 진단 `37725338707`은 failure다. CanvasKit의 글꼴 삭제 재감지 빈 쪽은
  초기화/selection error가 없고 canvas 0개인 상태다. 제품 보정안은 승인 대기다.
- 검사 SHA `1f5c8dc6ac0bd74f3e24b1eb9dbcec5120e9292b`의 fast `37725336047`은 success이며
  native/installer 전체 수용으로 확대하지 않는다.
- Windows NSIS Shell 제한과 강제 MSI 재부팅 후 미검증을 유지한다. Windows PDF와 나머지
  exact-file·RPM/Fedora·arm64 실제 GUI는 각각 결과로 기록한다.
- notes/source/files는 현재 FF 후보의 실제 값이다. 새 product source 및 최종 main의 새 bytes를
  생성하면 새 identity·수용 결과로 정렬한다. FF의 metadata를 새 source로 바꿔 적지 않는다.

## 다음 단계 영향

- 이 candidate JSON이 있는 새 검사 SHA로 exact-file acceptance를 실행한다. 새 제품을 빌드하거나
  공개하는 권한 없이 같은 bytes·critical dependency/pin·설치/GUI·cleanup/upload gate를 확인한다.
- Windows PDF가 in_progress인지와 다른 desktop pending 부재를 확인해 다음 mode를 한 번씩
  수행한다. 같은 ref concurrency의 오래된 pending을 교체하지 않는다.
- 실제 Linux 출력 29쪽(직접 HWP 6/HWPX 10, 새 문서 1, GTK/CUPS 각 6)을 render 이미지로
  검토했다. fixture에서 예상 밖의 빈 쪽·잘린 표가 없었다. 물리 프린터 조합을 수용한 것은 아니다.

## 승인 기록과 진행 경계

실제 identity/notes 완성과 현재 FF의 나머지 수용은 승인된 Stage 3 범위에서 진행한다.
제품 hook 보정·새 source의 full/비게시 signing·새 bytes 수용은 별도 제안으로 확인 중이다.
Stage 4·최종 main·Release/tag/assets·Pages/feed·production upgrade는 현재 미실행이다.
