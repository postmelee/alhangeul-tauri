# Task #132 Stage 6 — 동일 v0.1.3 재릴리즈 공개 완료

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)
구현계획서: [task_m010_132_impl.md](../plans/task_m010_132_impl.md)
Stage: 6

## 단계 목적

작업지시자가 #140 병합, 준비한 동일 버전 공개 교체안 실행, 실패 시 원본 복구, 공개 파일·Pages·피드 검증까지 명시 승인했다. 승인 기록은2026-11-14 15:11 KST에 보존했다. 사용자 승인은 일반 runbook의 기존 tag 이동 금지에 대한 이번 v0.1.3 교체의 명시 예외다. 보호 설정·다른 branch 이력은 변경하지 않았다.

최종 제품 source는 `4e99e883eec6bdf9d6ce59070c769f175052fc3f`다. Stage5의 실제 검증 파일을 그대로 게시했으며 새 빌드·서명·production key 교체는 하지 않았다.

## 산출물

| 대상 | 결과 |
|---|---|
| [PR #140](https://github.com/postmelee/alhangeul-tauri/pull/140) | 검증 도구·결과 병합0029d13f893006e51167a678189cd4e0e7609312 |
| [PR #141](https://github.com/postmelee/alhangeul-tauri/pull/141) | 유지보수 피드 병합e570b619199360c8fddc1801cde82375e7395918 |
| [PR #142](https://github.com/postmelee/alhangeul-tauri/pull/142) | 새 공개 파일의 Pages/feed 병합35a6310baa1eb0e32244a9dfe8990222754318cd |
| v0.1.3 tag | 기존8bb3b997cd2279c1e92f440ed7d1f1810c14b7cd를 조건으로 새4860b8efb895e6f60d4afbb4a492687307d49a8d로 이동 |
| [GitHub Release](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.3) | ID441647361 유지, 동일 basename11개·본문 교체, stable/latest |
| 기존 notes JSON·site release JSON·버전 HTML | 승인된3개 데이터 파일 교체, 최초 공개일과11월14일 재배포일·수동 설치 구분 |
| 본 보고·최종 보고·기존 릴리즈 기록·계획·오늘할일 | 실제 완료와 한계를 기존 승인 위치에 기록 |
| 비공개 증거 | 원본11개·서명·tag/body/Pages, 새11개·API/URL 재다운로드·화면·상태 journal·복구안 보존 |

## 본문 변경 정도 / 본문 무손실 여부

최초 공개 source/tag·이전 버전과 Stage1~5의 실패/성공 기록을 보존했다. 기존 릴리즈 문서의 현재 상태를 공개 완료로 갱신하고 이전 공개 식별자는 이력으로 남겼다. 정책·다른 작업 파일·제품 소스를 덮어쓰지 않았다. 새 공식 문서 루트와 머신 경로·브라우저 프로필·private 파일은 커밋하지 않았다.

## 검증 결과

### 전환 순서와 원격 gate

| 단계 | 결과 | 실행 근거 |
|---|---|---|
| #140 필수 검사 | success | [43560703698](https://github.com/postmelee/alhangeul-tauri/actions/runs/43560703698) |
| #141 필수 검사 | success | [43565169119](https://github.com/postmelee/alhangeul-tauri/actions/runs/43565169119) |
| 유지보수 exact Pages | success, 공개25파일 bytes 일치, updater404 | [43565653914](https://github.com/postmelee/alhangeul-tauri/actions/runs/43565653914), source e570b619 |
| tag·파일·본문 교체 | 성공, 공개 API/URL 재검산 | 15:20 KST tag 이동, 15:21 파일·본문 완료, 15:22 공개 재검산 완료 |
| #142 필수 검사 | success | [43566162667](https://github.com/postmelee/alhangeul-tauri/actions/runs/43566162667) |
| 최종 exact Pages | success | [43566571950](https://github.com/postmelee/alhangeul-tauri/actions/runs/43566571950), source35a6310baa1eb0e32244a9dfe8990222754318cd |
| 공개 HTTP·feed·화면 | 통과 | 26파일,6개 package,3개 feed target,8개 page/viewport 조합 |

최초 유지보수 feed 조회는503이었다. 재확인에서404 및 GitHub Pages 오류 문서를 확인한 후에만 tag/파일을 교체했다. 공개 파일 교체나 최종 Pages 검증 실패는 발생하지 않았고 원본 복구는 실행하지 않았다. 전환 중 이미 캐시된 manifest/진행 중 다운로드가 실패할 가능성은 사전 안내한 비원자적 전환 한계다.

### 공개 파일 독립 검산

인증 주체 postmelee, 기존 tag object/peeled source, Release ID·immutable=false·11개 old asset ID/digest·본문과 원본 actual bytes를 먼저 확인했다. 준비한 파일에 대한 production Minisign3개와 complete inventory도 다시 검증했다. tag 이동은 `--force-with-lease=refs/tags/v0.1.3:<기존 object>`로 해당 ref만 변경하고 즉시 원격 object/source를 대조했다.

교체 후 GitHub asset API와 canonical 공개 URL에서 **각11개, 총22개**를 별도로 내려받았다. 실제 크기·SHA256, SHA256SUMS10행, complete inventory, 각 경로의 Minisign3개, Release본문·stable/latest·tag object/source가 모두 일치했다. metadata digest만으로 수용하지 않았다.

| 파일 | 새 asset ID |
|---|---|
| Alhangeul-0.1.3-1.x86_64.rpm | 746530990 |
| alhangeul-updater-release-inventory.json | 746533415 |
| Alhangeul_0.1.3_amd64.AppImage | 746531411 |
| Alhangeul_0.1.3_amd64.AppImage.sig | 746531898 |
| Alhangeul_0.1.3_amd64.deb | 746532017 |
| Alhangeul_0.1.3_arm64.deb | 746532394 |
| Alhangeul_0.1.3_x64-setup.exe | 746532728 |
| Alhangeul_0.1.3_x64-setup.exe.sig | 746532944 |
| Alhangeul_0.1.3_x64_en-US.msi | 746532999 |
| Alhangeul_0.1.3_x64_en-US.msi.sig | 746533237 |
| SHA256SUMS | 746533294 |

각 파일의 전체 크기·SHA256은 [Stage5 고정 목록](task_m010_132_stage5.md#교체-파일-고정-목록)과 동일하다. 새 complete inventory SHA256은 `1d6eb0fbe8d8e01f2cfe805ebca9bf294d55df0353fef8a3954f5f0e5511a901`, SHA256SUMS는 `3995a6e84ff8ac08f4a97254bf7dafa0c0b8fdbe62747cd26fceda2128882074`, 본문은 `1d03bc67d54a4c2ea298ec1753ee4140a0850e4ae77bffc0d66ee68d71d73185`다. 원래 publishedAt=2026-11-11T12:19:34Z는 최초 공개 시각으로 유지했다.

### 공개 Pages·피드·화면

공개 출력26개 전체를 exact 소스의 결정적 build 결과와 bytes 단위로 대조했다. 다음은 주요 공개 파일의 SHA256이다.

| 공개 경로 | SHA256 |
|---|---|
| downloads.json | `7b4528ec1f3abe05ac458e1a601fabf99e18ff327469210d19423d0304165e80` |
| release.json | `a8fd245425790abb85403ac419e1191e3ab580f16b8d3e9c6ef37e13f77ecc32` |
| updater/stable.json | `ae2a728bb5fc9681824c7b1d8ec28f98a7aa57fef03c846bdecbe672c357b76d` |
| updates/v0.1.3.html | `80037cefaefbc481ced71bf8c04a0536bc2e204e68d08a25d3d7faf0ee3b0020` |

[다운로드 목록](https://postmelee.github.io/alhangeul-tauri/downloads.json)의6개 package가 실제 공개 파일의 name/size/hash/URL과 일치했다. [업데이트 피드](https://postmelee.github.io/alhangeul-tauri/updater/stable.json)의 NSIS/MSI/AppImage3개 target을 공개 release JSON·complete inventory와 대조하고, feed의 signature로 공개 URL에서 내려받은 actual installer를 다시 검증했다. 2026-11-14 15:31 KST에 통과했다.

공개 홈·업데이트·문의·v0.1.3 안내를1280px/390px로 방문한8조합에서 가로 overflow 부재, 버전·다운로드 링크·플랫폼 선택·재배포 날짜·수동 안내를 검사했다. 원본 viewport6장을 직접 읽어 한국어·레이아웃·Windows/Linux 다운로드와 안내를 확인했다. 격리 브라우저 종료와 소유 프로필 제거를 확인했고 원본 PNG/hash/DOM 증거는 보존했다. 실제 웹 화면 확인은 Windows/Linux 네이티브 앱 재검증이 아니다.

### 저장소 검사와 검증 재사용

실행한 저장소 명령:

```bash
node scripts/releases/notes-cli.mjs check
node scripts/check-pages.mjs --mode source
git diff --check
git diff --exit-code 4e99e883eec6bdf9d6ce59070c769f175052fc3f -- apps packages crates third_party
```

notes3문서·Pages source22 통과, 제품 경로 불변. #141/#142의 merge candidate Node/Studio·Windows PowerShell·required와 Pages의 build/check/test/deploy가 성공했다. native/full/signed8경로/파일6종 기능 검증은 제품과 bytes가 동일한 Stage5 근거를 재사용했다. 보고서 전용 마지막 PR도 필수 검사 후 병합하며 exact Pages 출력 파일이 달라지지 않으면 추가 배포하지 않는다.

## 잔여 위험

- 같은 v0.1.3은 자동 업데이트 알림 대상이 아니므로 문서를 저장하고 종료한 뒤 같은 설치 형식의 새 파일을 수동 설치한다.
- 사용자별 NSIS 유지, 관리자/UAC 비활성 Explorer는 MSI 사용. NSIS↔MSI 교차 전환을 검증한 것은 아니다.
- forced MSI3010 재부팅 후 수용·Authenticode/Smart App Control(#133)·한컴 공존·고DPI·모든 현장PC는 기존 한계다.
- 공개 feed 정합성과 서명 검증은 새 bytes의 실제 v0.1.2→v0.1.3 앱 내 업데이트 실행을 대신하지 않는다. 최초 공개 업데이트 결과는 이전 파일의 기록이다.
- 원본 복구 자료는 유지하지만 실제 rollback 실행을 시험했다고 주장하지 않는다. 삭제된 old asset ID·download count는 복구 불가다.

## 다음 단계 영향

같은 v0.1.3 공개 교체와 요청된 공개 파일·Pages/feed 검증은 완료했다. 완료 보고 PR을 병합하고 #132·작업 브랜치를 정리한다. 다른 작업의 branch/worktree와 원본 복구·검증 자료는 보존한다. 별도 문제 #133은 계속 열린 상태다.

## 승인 요청

이번 공개 실행·실패 시 복구·검증은 작업지시자의 명시 승인으로 완료했다. 같은 작업을 위해 추가 공개 승인을 요청하지 않는다. 완료 보고와 안전한 작업 정리를 기존 승인 범위에서 마무리한다.
