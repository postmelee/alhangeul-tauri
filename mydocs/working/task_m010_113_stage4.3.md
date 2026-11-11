# Task #113 Stage 4.3 — v0.1.2 Stable 공개와 원격 검산

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.3 — release runbook Gate 4
상태: GitHub Release 공개·최종 read-back 완료 / Gate 5 데이터 PR 승인 대기
확인일: 2026-10-09 01:50 (Asia/Seoul)

## 단계 목적

Stage4.2에서 고정한 main source의 실제11 파일·생성 본문을 maintainer CLI로 승격하고,
draft와 public 두 시점의 새 다운로드에서 bytes·서명·본문·tag를 각각 검증했다.
같은 스레드의 “진행해줘.”가 제시한 새 annotated tag·정상 push·draft upload·원격 일치 시
Stable/non-prerelease/latest 공개를 승인했다. owner/actor는 postmelee이며 승인 기록 시각은
`2026-10-08T16:41:42.961Z`다. 제안 SHA256은 `e4990bfcf830e808003fac0fe5f4beb0a8859649706f501943a47ab1a136e0d2`다.

## 산출물

| 위치 | 내용 |
|---|---|
| GitHub tag `v0.1.2` | 새 annotated tag, 정상 push·peeled source 검산 |
| [Alhangeul 0.1.2 Release](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.2) | ID `407055948`, Stable/latest, 승인 파일11개·본문 |
| release 기록·인덱스·계획·최종 구현 보고·오늘할일 | 실제 공개 상태와 남은 delivery 범위 연결 |
| 임시 Gate4 승인·preflight·draft/public receipt·새 download 두 폴더 | actual IDs/size/hash·Minisign·body·tag 근거 |
| 임시 Gate5 제안 | 원문/site/README4파일·공식 생성 본문/HTML/short·manifest·검토 diff; 미적용 |

## 본문 변경 정도 / 본문 무손실 여부

제품·CI·scripts·tests·rhwp pin/lock/core/WASM/Studio를 바꾸거나 재빌드하지 않았다.
Stage4.2 updater 한 run37789417321의7파일과 같은 source ordinary37789356504의 manual3파일,
SHA256SUMS1파일을 그대로 게시했다. 기존 tag 이동·force·asset 덮어쓰기·재업로드는 없다.
기존 FF/P/main 후보 실패·수용 이력은 보존하고 현재 공개 결과를 기존 승인 문서 위치에 추가했다.
승인받은 draft 시점 본문6170 bytes를 그대로 공개했으므로 published 시각·상태 문구를 반영한
새 본문6186 bytes의 보정은 다음 승인 입력이다. 현재 원문 JSON/웹/피드는 이번 단계에서 바꾸지 않았다.

## 검증 결과

```bash
pnpm run check:release-notes
python3 /private/tmp/task113-main-candidate/gate4-publish.py preflight
python3 /private/tmp/task113-main-candidate/gate4-publish.py tag
python3 /private/tmp/task113-main-candidate/gate4-publish.py draft
# draft는 tag API404·임시 untagged URL을 사용하므로 기존 ID로 read-back 기록 복구
python3 /private/tmp/task113-main-candidate/gate4-publish.py draft-recover
python3 /private/tmp/task113-main-candidate/gate4-publish.py verify-draft
python3 /private/tmp/task113-main-candidate/gate4-publish.py publish
python3 /private/tmp/task113-main-candidate/gate4-publish.py verify-public
git diff --check
```

- 실행 직전 actor/main/local·remote tag/Release 부재, 원본 producer/staged11 files·checksum10행·
  Minisign3·inventory·body hash를 확인했다. 조회 실패를 부재로 취급하지 않았다.
- annotated tag object `198ebba775a4fa885c7ae3fb52a17eca1e486e79`, local/remote peeled source `6dcb05e96ec2075d09d8a60160e1d82f08c0811b`다.
- draft ID `407055948`의11 uploaded names/size/digest/body 일치 후 새 다운로드를 검산했다.
  draft `/tags/v0.1.2`404와 temporary `untagged-b22c2af5a9dbad51777c` URL을 실제 ID 조회로 처리했다.
  검산 helper의 lookup/URL 가정을 고쳤으며 중복 생성·파일 보완·검증 bypass는 하지 않았다.
- draft fresh read-back `2026-10-08T16:49:23.261Z` accepted 후 같은 Release를 Stable 공개했다.
  실제 UTC 공개시각 `2026-10-08T16:49:38Z` = 2026-10-09 01:49:38 KST다.
- 공개 후 별도 새 폴더의11개 실제 bytes·SHA256SUMS 자체 hash/10행·Minisign3·complete inventory의
  source/version/tag/key/kind/basename/URL/size/hash/signature·본문 UTF-8·tag를 재검증했다.
  모든 asset URL은 고정 `/download/v0.1.2/`이며 non-draft/non-prerelease/latest 확인까지 accepted다.
- 최종 read-back `2026-10-08T16:50:52.403Z`, body SHA256 `4cd331f7d46257fe7dfcf709fa0304ec008261091007e04209c6ea1cef4aecc6`,
  SHA256SUMS 자체 hash `40db73dfe179c9a86851ac1765871a56a7d8857f6dda86ced4712bbcf7f2b791`다. 공개키 fingerprint는
  `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`로 유지했다.
- 인증 없는 공개 GitHub latest API에서도 동일 Release ID·Stable 상태·11 asset ID/digest·본문·공개시각이 일치했다.
- 이전 full/서명/6종 GUI/VM 수용은 Stage4.2의 exact bytes 근거를 재사용했다. 새 CI/native 실행이 없다.
- 다음 원문 제안은 공개 뒤 actual PR13/Issue5 재조회18건, strict schema·release data·manifest 및
  공식 notes3 생성까지 확인했다. repository/site/body/feed에 적용하거나 배포한 결과는 아니다.

### 공개 asset identity와 실제 hash

모든 파일의 고정 URL은 위 Release의 `/releases/download/v0.1.2/<basename>`이다.

| basename | GitHub asset ID | bytes | SHA256 |
|---|---:|---:|---|
| `Alhangeul-0.1.2-1.x86_64.rpm` | 622401243 | 69250012 | `ea7b3e130e0ee8aa908dde1e4b395dcb281a49a932c72f447ce396616d55c278` |
| `alhangeul-updater-release-inventory.json` | 622401206 | 2606 | `eccfa9b8af886a5896c7c872d3e881e2d32754af225ded149f4620160d48304b` |
| `Alhangeul_0.1.2_amd64.AppImage` | 622401158 | 136792568 | `b216c098dbebafc062b463edd225d918071a6710c9bf8c874055298a3224ea80` |
| `Alhangeul_0.1.2_amd64.AppImage.sig` | 622401205 | 420 | `de56c83488d702baf5f5525937deb0b6c41b5ee191d57f36d93817402ae878fb` |
| `Alhangeul_0.1.2_amd64.deb` | 622401244 | 69249210 | `c98d3d3683182cb313b3964ee274aa7f059db84e212f1f77c80d82b1e7ac21f3` |
| `Alhangeul_0.1.2_arm64.deb` | 622407427 | 68845454 | `dd5be5d66334543ddf07bfc88dd732ac7037af40bb12150d7f162d54b45314a2` |
| `Alhangeul_0.1.2_x64-setup.exe` | 622401162 | 58453720 | `591fac591d4d35b50abbdd78d32ea8ccbf1334f6e522e545d5a28076aa2776c3` |
| `Alhangeul_0.1.2_x64-setup.exe.sig` | 622401165 | 420 | `90f035863f3e850b74d879385d7485d7e7deffcef811738f19ae040599425d41` |
| `Alhangeul_0.1.2_x64_en-US.msi` | 622401160 | 66150400 | `12fbf4f551e32e9c08b762ffd8e5ccc05f6a6534a20bb29c409ec4e0763dd951` |
| `Alhangeul_0.1.2_x64_en-US.msi.sig` | 622401163 | 420 | `6ba63cfa888be97d05c697c9de794040ce11913a72de284cf99964baa3c60fe8` |
| `SHA256SUMS` | 622407425 | 976 | `40db73dfe179c9a86851ac1765871a56a7d8857f6dda86ced4712bbcf7f2b791` |

## 잔여 위험

- hosted NSIS thumbnail raw1/12실패·not-accepted와 MSI 대안, forced MSI3010/reboot-required·
  post-reboot-unverified, Windows Authenticode unsigned를 owner가 공개 판단에 포함했다.
  서명3검증·설치/문서 수용을 해당 제한 해결로 쓰지 않는다. Stage4.2의 지원/미검증 범위를 유지한다.
- public Release는012지만 현재 site/production feed는011다. GitHub 본문은 승인 draft 시점 snapshot이라
  공개 상태 문구 보정이 남았다. Pages/manifest·실제011→012·Issue113 close는 아직 실행하지 않았다.

## 다음 단계 영향

기존 위치의 published notes·UTC시각·미검증 upgrade 안내·README·site data/HTML을 정합화하고
exact 생성 본문만 보정하는 Gate5 제안을 검토받는다. 본문 보정 후11 assets/tag/channel/게시 시각을
유지하고 body/identity read-back을 한다. 데이터 PR의 required CI 뒤 merge 및 실제 merged devel SHA의
Pages/manifest 공개를 별도 승인받는다. 실제011→012·최종 close/cleanup은 후속이다.
제안 본문 SHA256 `03cde7aa70f6b7d395cc16bbe7eed6baa7d326dbe5e1ac825f3d5bba7b2d45b6`, manifest
SHA256 `58ca348b234945e8330911ec6f77ba1c3af5ac6b5e05db8a585a29e55a107ad3`다.

## 승인 요청

Gate4 완료 결과와 Gate5의 원문/본문·웹/updater 데이터 변경안을 검토하고 구현·검증·Open data PR
준비를 승인한다. 실제 Pages deploy SHA는 merge 결과를 확정한 뒤 별도 승인받는다. #113은 OPEN 유지다.
