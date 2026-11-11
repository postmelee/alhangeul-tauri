# Task #126 Stage 4 — GitHub Release 공개

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md) · Stage 4

## 단계 목적

설치 수용한 동일 bytes로 새 태그와 Release를 게시하고 draft/public 두 시점에서 독립 다운로드를 검증한다.

## 산출물

- [Alhangeul v0.1.3](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.3): Release ID `441647361`, stable/latest, draft=false, prerelease=false.
- 공개 시각 `2026-11-11T12:19:34Z` · 2026-11-11 21:19:34 KST.
- 새 annotated tag object `8bb3b997cd2279c1e92f440ed7d1f1810c14b7cd`; peeled source `bcb892d49a9003615f3acd980babd71e59e147dd`.
- docs/releases/v0.1.3.md: 현재 GitHub 공개 상태와 후속 Pages/upgrade 경계를 추가하고 Task #122 후보 기록을 보존했다.
- private draft/public 다운로드와 metadata·본문·서명 검증 receipt는 T7에 보존했다.

| 공개 파일 | asset ID | bytes | SHA-256 |
|---|---:|---:|---|
| `Alhangeul-0.1.3-1.x86_64.rpm` | 735404167 | 96377362 | `5ed094d71f9c2d3c5fc8c15f27c9accaac35c5902a3b17518dfb541b98dbb183` |
| `Alhangeul_0.1.3_amd64.AppImage` | 735404159 | 153995768 | `740b622792eb6201691f5993c66f351d6b7cf3b66b5bbdda5771b5d0a2fc997e` |
| `Alhangeul_0.1.3_amd64.AppImage.sig` | 735404158 | 420 | `a2889c2770e6ef2c69ee8e7d138648ce19a84aef9e26b37ab779420e60f5e808` |
| `Alhangeul_0.1.3_amd64.deb` | 735404156 | 96375516 | `d1f39aac68b33db315253151bd241546120f1b72fe1f871f64969268918333dc` |
| `Alhangeul_0.1.3_arm64.deb` | 735404162 | 95447636 | `ad9e52d9c510fbdc3579f83aff8d8c33ea177bbf294acb670c0c7eb7f6fcd927` |
| `Alhangeul_0.1.3_x64-setup.exe` | 735404223 | 78654936 | `932c3316d9ea83cd5c38e3fe528518535751ac60fedd72776c5306085437c490` |
| `Alhangeul_0.1.3_x64-setup.exe.sig` | 735406364 | 420 | `16adfcd9f1b44155fb5e2aa854440cb97fa7fbd30a83983f0ce283b2c741bef6` |
| `Alhangeul_0.1.3_x64_en-US.msi` | 735406436 | 91193344 | `a953c0d09dec29246ae77340e019e7acae759aac24b21fc7a524326ab81b6085` |
| `Alhangeul_0.1.3_x64_en-US.msi.sig` | 735409140 | 420 | `6308ab988c42730028b1523c6f6aa0995464f7c342dd18cef59ce1000f99e290` |
| `SHA256SUMS` | 735409223 | 976 | `c26fba7d51546b28c38602d19f5905c6424a8998798ddf5caae17f3228361f82` |
| `alhangeul-updater-release-inventory.json` | 735409181 | 2606 | `5cb96a1d7e0e701d4b23abaf5910c07cef85f5c19d8e1e064867d4a8f64ee26b` |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드·공개키·endpoint·환경 보호 설정은 변경하지 않았다. 버전 기술 기록에 현재 결과를 먼저 두고 이전 후보 기록을 접힌 이력으로 보존했다. 실제 published metadata 원문은 private 생성했으며 source notes/HTML/Pages는 다음 단계에서 함께 반영한다.

## 검증 결과

- 게시 직전 postmelee 인증 주체, 원격 main=승인 SHA, 로컬/원격 v0.1.3 tag 및 Release 부재, 작업 tree 청결, 11개 파일과 본문 해시를 확인했다.
- 새 annotated tag를 정상 push하고 로컬·원격 peeled SHA를 대조했다. 기존 tag 이동·force 없음.
- Stage 2/3의 동일 11개 bytes로 유지관리자 CLI draft를 생성했다. publish_release=true 재빌드는 실행하지 않았다.
- 비공개 draft는 by-tag API가 404를 반환하고 임시 untagged URL을 사용했다. 인증된 Release 목록과 ID로 이미 생성된 초안을 조회했으며 중복 생성하지 않았다. draft 임시 URL과 공개 v0.1.3 URL 검증을 구분했다.
- draft: 별도 새 폴더에 11개를 다운로드. 파일명·크기·SHA-256·API digest·SHA256SUMS 10행·complete inventory·실제 Minisign 3종·본문 exact bytes 모두 일치.
- 최초 본문 6,125 bytes·`703b8ab6049c813b572149d4861781da98356d5d0fe0daa1f3fa52583b7273aa`를 검증한 뒤 stable/latest로 공개했다.
- 공개 직후 실제 공개 시각과 PR/Issue 10건을 다시 조회했다. 본문의 상태 draft→published, 미게시→실제 UTC 두 행만 보정했다. Release ID/tag/source/공개 시각/11개 asset identity는 유지했다.
- 현재 본문 6,140 bytes·`d8f21efd4c1b6edb0542d764057cb1c7af1282a1892c4a67f3d96f4eb61eb3b0`, 수정 후 API body exact bytes 일치.
- public: 인증 없이 공개 download URL 11개를 다른 새 폴더에 다운로드. 전체 파일·checksum·inventory·실제 Minisign 3종 검증 성공. 공개 URL은 모두 v0.1.3 고정 경로다.
- GitHub git/ref와 annotated tag object를 조회해 source를 독립 대조했다. releases/latest는 ID 441647361/v0.1.3이며 stable 상태다.
- 기존 Pages/feed HTTP bytes는 변경 전과 동일: release.json v0.1.2/hash `fc1cff057906e61c694be3d1c7659163cff60b1d04b9b4dcbeadee9c7c9b17ac`, stable.json v0.1.2/hash `f7517e3dce5048f7fe8c283f48640fb6fed68eb494146ded7441ee5fa0dd64d1`.
- `git diff --check` 성공. 게시된 파일을 교체하거나 재빌드하지 않았다.

## 잔여 위험

웹 다운로드/노트·production updater feed는 아직 v0.1.2다. 실제 0.1.2→0.1.3 앱 내 업데이트는 다음 단계에서 확인한다. 기존 Windows NSIS 썸네일·강제 MSI 재부팅 후 미검증·Authenticode 제한은 공개 본문에 유지한다.

## 다음 단계 영향

actual published metadata·inventory로 notes/HTML/site release data와 정확한 upgrade tuple을 함께 구성한다. devel PR required 검사·정상 merge 뒤 exact Pages SHA를 배포하고 HTTP/화면/실제 같은 형식 3종 업데이트를 검증한다.

## 승인 기록

작업지시자의 “등록하고 릴리즈 완료까지 계속 진행해줘.”와 수행계획서에 따라 위 exact 파일의 CLI 공개를 수행했다. Stage 5의 Pages/피드와 실제 업데이트 검증까지 계속한다.
