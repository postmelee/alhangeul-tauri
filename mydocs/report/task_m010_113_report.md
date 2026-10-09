# Task #113 최종 구현 보고서 — rhwp v0.8.7과 Alhangeul v0.1.2 인계

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
마일스톤: M010
확인일: 2026-10-09 23:49:56 (Asia/Seoul)
상태: v0.1.2 Release·본문·웹·피드 공개와 실제011→012 지원3종 수용 완료 / 최종 기록 PR 인계·Issue 종료 후속

아래 Stage1~4 요약은 당시 구현 인계 snapshot이다. 현재 공개/전달 상태는 후속 Gate별 기록으로 구분한다.

## 작업 요약

- 대상 이슈: #113, 단계 수: 4. 최신 Stable rhwp087을 반영하고 Alhangeul012를 검증·배포하는 작업이다.
- 자동 후보 생성의 i18n/font API·pin fixture/관리 참조·게시 전 commit gate를 보정했다.
  선행 PR114·자동 후보115·통합116을 일반 이력으로 devel에 반영했다. upstream 내용·bot credit 유지다.
- 이번 task PR은 이미087인 devel에 제품012·title/locale·font cache/API 보정과 실제 6종 수용 기록을 추가한다.
  CanvasKit 글꼴 삭제·재감지 후 빈 페이지는 document reload 대신 resource refresh로 보정했다.
- 검증 product는 `f79dbeadf56c0cdb6bdf576103f420591cecdc6b`다. full ordinary37728636737와 동일
  source의 nonpublishing production-key signing37732807293·실제6 files·3sig·Windows/Linux GUI를 수용했다.
- 구현·보고 완료를 실제 배포 완료로 표시하지 않는다. #113은 OPEN, 공개는0.1.1이다.
  최종 main source·files/signing·Release/tag·Pages/feed·실제011→012 검증은 결과 기반 후속 gate다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| upstream pin/locks/WASM·관리 참조 (선행116) |087/1a76570e... 동일 release provenance | Rust core·bundled Studio |
| `apps/studio-host/product-shell-entry.ts`·`src/ui/product-shell.ts`·Vite 설정/회귀 | locale 초기화·제품 창/접근성 제목 유지 | Alhangeul shell |
| `apps/studio-host/local-font-entry-hooks.ts`·회귀/mock | refreshFontResources, cache·문서/decision guards 유지 | Canvas2D/CanvasKit 글꼴 갱신 |
| root/desktop package·Cargo.toml/lock·tauri.conf | 앱012 정합화 | Windows/Linux installer version |
| `scripts/ci`·`tests/gui`·`tests/ci-*`·Linux acceptance workflow | exact candidate·spec 범위·owned exit·Fedora registry/loader | 검사 harness, 제품 bytes와 구분 |
| `docs/architecture/LOCAL_FONTS.md`, `UPSTREAM.md` | API 경계와 native PDF 소비 경로 | 기존 architecture 문서 |
| `docs/releases/v0.1.2{.md,.notes.json}`, README | 실제6 assets·3 signatures·draft·제한·인계 | 릴리즈 원문/운영 기록 |
| `mydocs/plans`, `working`, `report`, `orders` | 승인·4단계·하위 수용·최종 보고·오늘할일 | 작업 추적 |

source product P 이후의 harness·metadata·보고 commit은 apps/crates/third_party/package/lock bytes와
같다. upstream source 직접 수정이나 지원 OS 확대는 없다. native 검증은 Windows/Linux에서 수행했다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| pin current marker·architecture | README/docs/DEVELOPMENT/docs/architecture | 같은 기존 파일 | OK | 수행/구현계획 문서 위치표·선행116 |
| 버전 안내·원문·인덱스 | docs/releases | v0.1.2.md/notes.json·README | OK | 기존 규격과 승인된 위치 |
| 계획·단계·최종 보고 | mydocs/plans/working/report | task_m010_113 이름 | OK | 중앙 stage/final 템플릿 |
| candidate identity | mydocs/working | task_m010_113.json | OK | 기존 strict candidate schema |
| 오늘할일 | mydocs/orders |20261007.md/20261008.md | OK | M010·상태/범위 구분 |

site updates/release.json은 공개 read-back 이후 위치로 승인됐지만 아직 생성·전환하지 않았다.
mydocs/manual에 제품 문서를 추가하지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 지속 upstream pin |086/f1f9c6ae... |087/1a76570e..., core·WASM6·Studio 정합 |
| 앱 source version |011 |012, 실제 공개는011 유지 |
| CanvasKit 글꼴 삭제 재감지 |FF candidate의 page placeholder/빈 화면 실패 | P에서 fallback 표시·복구 후 Abel/typeface 확인 |
| 설치 파일·서명 근거 |012 없음 | 실제6 files+3 production-key signatures |
| PDF/가상 인쇄 시각 수용 |새 pin 미확인 |Linux29쪽·Windows32쪽 A4 |
| 새로운 성능 측정 |미확인 |signed3종 각 입력80·6쪽scroll20회, 향상율/A-B 주장 없음 |

이전 performance 숫자나 FF source의 bytes 수용을 P의 수용으로 승계하지 않았다.

## 검증 결과

| 구현 수용 기준 | 결과 |
|---|---|
| 자동 Stable 감지·후보·중복 방지·현재 pin | OK — dispatch로087 후보생성/기존PR 판정, 오늘 schedule37743793578 current087 success |
| Rust core·WASM·Studio 같은 release | OK — gitlink1a76570e...·pin·6 generated artifact·native lock·관리 참조 |
| 제품 제목/locale·글꼴 API·회귀 | OK — focused5·Studio283·upstream39·build/typecheck/boundary |
| Windows/Linux full native/package | OK — ordinary37728636737 selected14 success, Windows258/Linux각247 fail/ignored0 |
| 비게시 signing·실제6 bytes | OK — same P37732807293, archive/inventory/size/hash 및 Minisign3 독립 대조 |
| six exact-file/native GUI | OK — signed3종37736564625, DEB37732474374, RPM37742491734/VM37741321797, ARM37743003461 |
| 출력·font·thumbnail | OK — 범위별 실제 PDF/가상print·Canvas2D/CanvasKit·Nautilus/Thunar·MSI strict, 알려진 NSIS/3010 제한 별도 |
| draft notes·원문·generated 규격 | OK — JSON 기존 schema, source P·assets6·3sig·draft/publishedAt=null, notes2 check |
| Stage4 기록·위치·후속 경계 | OK — 4단계 보고·최종 보고·오늘할일·실제 source/harness·실행/미실행 구분 |

실제 파일별 전체 SHA-256, archive ID/digest·run/head/attempt·structured/visual 근거는
[Stage3 전체 보고](../working/task_m010_113_stage3.md)에 고정했다. 최종 수용 run은 모두 attempt1/success다.
일반 MSI/NSIS/AppImage로 signed 파일을 대체하지 않았고 실패 run 파일을 공개 입력으로 쓰지 않는다.

### 단계별 검증 결과

- [Stage1](../working/task_m010_113_stage1.md): 자동 i18n marker failure·pin/fixture/postcommit gate 보정,
  후보115·통합116·required37594489485 success·일반 mergebad55757, same target no-op/중복 없음.
- [Stage2](../working/task_m010_113_stage2.md): 제품012/title/locale·font API·문구·로컬/fast37712633686,
  strict notes JSON의 실제 file/hash/signature 완성 이연 승인.
- [Stage3](../working/task_m010_113_stage3.md): P full/signing·actual6/3·10최종 success run·scenario/visual 수용.
  최초 signing 입력누락·Fedora image404·잘못된 x64 spec·VM restart·GTK SVG loader 실패를 각각 보존/보정.
- [Stage4](../working/task_m010_113_stage4.md): 원문·생성물·위치·보고·인계·Open PR 정합화.

native/core/package는 P의 exact 성공 run, 최신 harness fast는 K=f4cc0017/37742487390다.
K automation1331/upstream39/Studio43 files, Windows notes124·Windows59·PowerShell 계약 success다.
PR required는 실제 PR merge candidate SHA의 결과를 PR checks/본문에 추가한다. 새 native 빌드로 쓰지 않는다.

### Stage4 확인 명령

```bash
pnpm run check:release-notes
node scripts/releases/notes-cli.mjs generate --version 0.1.2 --output-dir <new temporary directory>
# 생성3종 bytes/hash·원문/참조/문서 링크, verifyProductDependencies(P), product paths diff
git diff --check
git status --short
```

생성물은 임시 staging에만 있다. PR 생성 후 실제 PR 참조를 원문/기록에 추가하되 assets/source/status를
변경하지 않는다. 파일·본문의 새 hash는 인계에 기록하고 final public notes로 승격하지 않는다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 자동 감지 schedule37743793578은 main7acff6bc의 workflow가 devel을 읽어 current087을 확인했다.
  수정 postcommit publisher는 devel에 있으며 main 승격 때 적용된다. 다른 미래 Stable target의
  새로운 writer full positive run은 미실행이다. mocks/현재 no-op만으로 이를 통과라고 쓰지 않는다.
- Windows NSIS hosted raw1/12 failures·thumbnail not-accepted, 강제 MSI raw1/1·3010·
  reboot-required/post-reboot-unverified 유지. Authenticode와 updater Minisign은 별개다.
- 모든 Wayland/GPU/글꼴/문서/배포판·physical printer/IME·concurrent edit/TTL·010 A/B 성능 미검증이다.
- native PDF는 기존 registry svg2pdf0.13 direct path이며 upstream vendor patch 자동 적용 주장 없음.
- P의 현재수용·K/문서용 PR head와 아직미확정 final main source/bytes를 구분해야 한다.
- Actions evidence는 임시 보존물이다. 실제 공개 artifact/tag/manifest 또는 실제011→012 증거가 아니다.

### 후속 작업 후보

- 같은 #113에서 task PR 일반 merge 승인·devel→main Release PR 검토/승격.
- exact main SHA에 맞는 일반/비게시 signed producer 입력 승인·실제6 files 재고정/설치 수용.
- 11 asset·10 checksum행·서명/본문 hash 고정 후 CLI 공개·tag/draft/public read-back 승인.
- 공개 read-back 뒤 site/Pages exact devel source·stable feed 전환 승인, 동일 형식011→012 실제 업그레이드.
- 공개/업데이트 검증 결과 안내·최종 기록·issue close/부산물 정리. task PR merge만으로 #113을 닫지 않는다.

## 작업지시자 승인 요청

2026-10-08 같은 스레드의 “진행해줘”는 Stage4 최종 구현 보고·devel Open PR 게시 승인이다.
이를 추가로 묻지 않고 게시한다. 이후 구체적 PR 리뷰·일반 merge와 후속 릴리즈 gate를 승인받는다.
완료 범위는 구현·검증·인계 보고이며 #113의 실제 배포 작업은 계속 추적한다.

### 실제 PR 게시 근거

[PR117](https://github.com/postmelee/alhangeul-tauri/pull/117)은 승인한 publish/task113→devel Open PR이다.
최초heade0511200, non-draft·closingIssuesReferences=[]를 확인했다. 원문에 actual PR117을 추가하고
12 PR 실제 title/URL·기존11 merged·current117OPEN 및5 Issue 상태를 확인했다. issue113은 OPEN이다.
후속 기록 commit은 기존 productP의 actual assets·signatures/status를 바꾸지 않는다. PR 필수 CI는
actual final head/merge candidate에서 확인하고 PR checks·본문을 인계 근거로 사용한다.

### Stage4 원문·생성물 최종 정합

actual PR117 반영 후 notes check2·tests124/124·local links·metadata/sourceP/actual6/3 동일을 확인했다.
body는6170 bytes·SHA256 d7a344fcdf4605de050df58dae82dd98671c208ddbdef53e66383925e6b81066이다.
HTML9106·9b399d1246d2170814dee7ad710f378f6149af5fa2ffea3e871b3fbd48612458,
short358·adac1d9c80d8fb5186622a8cae34f36b6e543e062a70aef0c849cc623dbca57f는 동일하다.
생성물은 /private/tmp/task113-stage4-notes-final이며 public site/feed/body는 아직 전환하지 않았다.

## 후속 전달 Gate2~3 완료 — 2026-10-09

PR117·PR118을 승인된 일반 merge로 devel/main에 통합했다. 실제 main6dcb05e9의
ordinary37789356504·signed37789417321 및 새 actual6 files·3 signatures·DEB/signed3/RPM/ARM/
Fedora KVM 수용을 완료했다. [현재 Stage4.2 보고](../working/task_m010_113_stage4.2.md)에
정확한 source/harness·새 archive/file hashes·시각/문서/기능 결과·known limitation·exact11 및
본문/checksum을 연결했다. 위의 Stage1~4 구현 P 수용과 실패 이력은 당시 기록으로 보존한다.
현재 tag/Release012·Pages/feed·실제011→012는 미실행이며 Gate4 공개 승인을 기다린다. #113 OPEN이다.

## 후속 전달 Gate4 공개 완료 — 2026-10-09 01:50 KST

[v0.1.2 Stable](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.2)을 명시 승인된 exact bytes로 공개했다. Release407055948·
annotated tag198ebba7→main6dcb05e9·11파일/본문·Minisign3을 draft/public 새 다운로드 두 시점에서
검산했고 latest/non-prerelease를 확인했다. [Stage4.3 보고](../working/task_m010_113_stage4.3.md)에
actual 공개시각 `2026-10-08T16:49:38Z`과 asset ID/hash·한계·다음 제안을 연결했다.
site/feed011·공개 상태 문구 보정·실제011→012·최종 close/cleanup은 후속 승인 범위다. #113 OPEN이다.

## Gate5 데이터 PR 준비 수용 — 2026-10-09 02:09 KST

[Stage4.4 보고](../working/task_m010_113_stage4.4.md)에 승인 source4파일+별도 기대1행, 문서 위치,
body-only 공개·11identity유지·generated3/manifest hash와 notes124/contract151·Pages19/23을 연결했다.
제품·CI·pin·native bytes 변경 없이 published 원문·웹6다운로드·updater3 inventory·README를 정합화했다.
GitHub body6186/03cde7aa... read-back 통과, 기존 공개시각/asset/tag/채널 유지다.
이 데이터 PR은 구현 작업PR117 및 releasePR118 뒤의 delivery 데이터 인계다. devel PR required
결과를 확인한 뒤 일반 merge와 exact merged devel Pages SHA의 배포를 별도 승인받는다.
remote Pages/feed011·actual011→012·최종 close/cleanup은 후속이며 #113을 완료로 닫지 않는다.

### PR119 최초 CI와 Stage4.4.1 — 2026-10-09 02:21 KST

첫 required37814746426은 Node1329/1331·Windows57/59의 같은2 fixed010→011 입력 충돌로 전체
failure였다. 명시 승인한 unit1파일의 recorded011 입력 보정과 actual59/automation1331 수용을
[Stage4.4.1](../working/task_m010_113_stage4.4.1.md)에 기록했다. 새 head required를 확인한 뒤
merge 승인받으며 old failure·site/feed011·actual011→012 미실행을 유지한다. #113 OPEN이다.

## PR119 merge와 Pages 입력 수용 — 2026-10-09 02:37 KST

새 required37815889210 attempt1의 Node/Windows/required 전체3job success를 확인한 뒤
명시 승인된 일반 merge로 PR119를 actual devel `1f33d03918b50a5b9140978a9eb28d1b5e65ebe6`에 통합했다.
[Stage4.5](../working/task_m010_113_stage4.5.md)에 actual merge/2parents/tree·CI counts·IssueOPEN·
Pages23 frozen bytes 및 기존 환경/피드011 상태와 다음 승인 입력을 연결했다. Sites/피드012 공개는
아직 미실행이며 actual011→012·최종 close/cleanup이 남는다. #113 전체 완료로 쓰지 않는다.

## Pages·production012 공개와 Stage4.6 — 2026-10-09 03:03 KST

명시 승인된 exactdevel1f33의 기존 Pages37819153172가 attempt1/whole success다.
[Stage4.6](../working/task_m010_113_stage4.6.md)에 workflow/source/checkout/deploy SHA·artifact11568521999/
ZIPdigest9e1b6c23...·tar/HTTP23·production manifest012/2371/hash58ca348b...와 actual3signature를 기록했다.
6download·desktop/mobile/KST/known limits를 확인했고 환경/보호·Release11/body·main6d/key/endpoint를
유지했다. updates 목록의 local v012 static link 누락은 미수용으로 남는다. source14/실제011→012
제안은 임시75/151/GUI typecheck만 통과했으며 저장소 미적용·remote 미실행이다. 전체Gate6/Task113
완료가 아니며, source 승인·검증·필수CI/actual3upgrade·최종공개문구/PRmerge·close/cleanup이 남는다.

## Production harness012·웹 목록 구현 수용 — 2026-10-09 03:17 KST

[Stage4.7](../working/task_m010_113_stage4.7.md)에 approved14+추가3행·actual source17 hashes,
기존010→011 JSON/59 회귀 불변·새011→012 fixed public identity·기존key/endpoint·dirty/동의/
설치/재실행/문서 gate 유지와 generic1347/production75/upstream39/Studio283·types/Pages19/23을 기록했다.
최초 automation1fail의 oldworkflow011 기대와 new16 CI 연결 누락은 explicit3행 승인 뒤 수정했다.
이 Open PR은 구현117·release118·공개data119 이후 delivery harness/기록 후속이다. 실제 remote3와
PR required·PRmerge/공개문구·새Pages·close/cleanup이 남아 전체Task113 완료로 쓰지 않는다.


## Production upgrade 실패와 harness 보정 수용 — 2026-10-09 03:57 KST

PR120의 이전 required37823417314는 전체3job 성공했지만 actual37824197495/attempt1은 NSIS·MSI·AppImage 전체 failure다. 계획의 Stage4.8 진단에 actual3 archive identity·부분 관측·실패/미완료 경계를 보존했다. 명시 승인한6파일 보정과 실제 집중87/전체1353·types/기본검사/upstream39/Studio283 수용은 [Stage4.8.1](../working/task_m010_113_stage4.8.1.md)에 기록했다. 새 exact H의 required와 actual3/all 1회 재검증은 승인됐고 후속 수행한다. old failure·strict settings equality/문서/설치/cleanup gate·public product6d/11assets/key/feed는 유지한다. 전체 실제 upgrade 수용·PR merge/공개문구·새Pages·close/cleanup은 아직 완료가 아니다.


## Windows2 실제 수용과 Linux 재시작 관측 보정 — 2026-10-09 04:23 KST

새 required37828387632 전체success 뒤 actual37828940744는 Windows NSIS/MSI complete2job/accepted.json·public bytes/서명·설치/version/handler/defaults·strict settings·HWP6/HWPX10·cleanup/policy restore와 GUI4화면을 수용했다. Linux는 restart 클릭 응답 unknown error로 필수 PID/FUSE 관측 전에 실패해 whole run은 failure다. 계획에 세 archive identity와 부분/전체 경계를 보존했다. 명시 승인된3파일 보정·실제 집중94/전체1360·types/기본검사와 Windows 경로 불변 검산은 [Stage4.8.2](../working/task_m010_113_stage4.8.2.md)에 기록한다. 새 H required·Linux-only1회와 조건부 whole3 기록이 후속이다. public product6d/11assets/key/feed와 원래 두 실패 run을 유지하며 전체 release task 완료로 쓰지 않는다.


## 실제3종 production upgrade 수용 — 2026-10-09 04:45 KST

[Stage4.8](../working/task_m010_113_stage4.8.md)에 Windows NSIS/MSI의 bc082d00/run37828940744 각 complete success job과 Linux AppImage의 H8a5a28c7/run37832348063 Linux-only whole success를 형식별로 구분했다. Linux job113500633933/archive11573159872·687854bytes·SHA2567bdc6668babafa65b7f6284fbe82e2c592bcb2f775cf84cf305fde46e31e33db를 독립 검산했다. 실제 PID5034→5207/new FUSE exe·public012 파일 교체hash/stop·strict settings·About012·HWP6/HWPX10/bytes·accepted.json과 GUI2화면을 수용했다. Windows4화면을 포함해 실제3종/GUI6 수용이 완료됐다. 최신 H required37831668570 Node/Windows/required 전체success다.

원래37824197495와 mixed37828940744 전체failure는 보존한다. Windows 실행 경로 불변에 근거해 각 형식의 별도 소비자 증거를 조합했으며 제품 source6d/11assets/서명/key/feed58ca는 그대로다. 이번 Linux success는 정상 클릭 뒤 실제 재시작 관측이며 exact unknown-error branch의 실제 재현으로 쓰지 않는다. 기존 썸네일/MSI3010/Authenticode/물리 환경 한계는 유지한다. 공개 notes/body의 미실행 문구와 새 Pages·PR120 merge·Issue113 close/cleanup은 별도 후속 승인이다.


## 최종 결과 안내 source/generic 수용 — 2026-10-09 23:07 KST

명시 승인된6파일을 적용하고 [Stage4.9.1](../working/task_m010_113_stage4.9.1.md)에 before/after hash·고정 fixture3938/f42efd...·historical58ca/실제native증거 보존과 실제 automation1360/집중369·types·기본 checks/notes2/Pages19·23·upstream39/Studio283/build 수용을 기록했다. actual-generated body6208/d932d5f3...·HTML9166/normalized9157·short550·향후manifest2434/f7517e3d...는 승인 검토본과 같은 bytes다. 새 manifest는 notes만 변경하며 installer/key/pubdate/3URL/3signature·한계는 불변이다. source/report를 기존 PR120 normal push해 새 required success 뒤 이미 승인된 body-only 공개를 이어간다. 현재 public body03c/feed58ca·PR120OPEN·#113OPEN이며 merge·새Pages·종료는 후속 승인이다.


## 최종 GitHub 결과 안내 공개 수용 — 2026-10-09 23:15 KST

[Stage4.9](../working/task_m010_113_stage4.9.md)에 sourceff1cea2b required37941878782/attempt1의 Node/Windows/required3job 전체success·실제 merge7402feec/tree5a3c1192와 승인된 body-only 실제 공개를 기록했다. 2026-10-09 23:12:41 KST 독립 GET으로 Release407055948 body6208/SHA256d932d5f3a4e26cb07d38fe467dee4f86b6676cda4feb340fda64ec7040005e92를 확인했다. 11asset id/hash·tag198e→main6d·Stable/latest·publishedAt16:49:38Z·현재 feed2371/58ca 불변이다. 새 build/sign/asset upload/Pages dispatch는 하지 않았다. 기존한계·과거 whole failure·native 실제3종/고정58ca evidence를 유지한다. body와 branch final웹/feed data를 구분하며 PR120 merge·actual merged devel SHA Pages/f751 공개·HTTP/화면·#113 close/cleanup은 후속 승인이다.


## PR120 일반 merge·최종 Pages 입력 수용 — 2026-10-09 23:31 KST

같은 스레드의 “진행해줘.”로 exact head64576f4f/base1f33·required37942845348 전체success의 PR120 일반 merge만 승인받았다. 2026-10-09 23:23:46 KST actual merged devel `2a78e11375c8fe6fcb6c6259247b8825e83b1f49`/treea5621f52d8fa9d7a7576fd648718e4266b59d9c3를 독립 API/parents/refs로 검산했다. [Stage4.10](../working/task_m010_113_stage4.10.md)에 실제 merge·source/generic 재사용과 S의 Pages23/계약151·현재0.1.2/feed58ca→향후notes-only f751/3URL/signature equality·환경/정책 불변을 기록했다. main6d/tag198e·Release407055948/body6208·11assets·현재feed58ca·Issue113OPEN을 유지했고 Pages/cleanup은 실행하지 않았다.

## 최종 Pages·피드 공개와 HTTP·화면 수용 — 2026-10-09 23:49 KST

[Stage4.11](../working/task_m010_113_stage4.11.md)에 다음 실제 배포 결과와 archive/HTTP23·브라우저 화면의 고정 식별자를 기록했다.

같은 스레드의 “진행해줘.”로 exact merged devel `2a78e11375c8fe6fcb6c6259247b8825e83b1f49`의 기존 Pages workflow1회와 archive/HTTP23/1280·390 화면 수용을 승인받았다. 승인 관측은 2026-10-09 23:35:41 KST다. [Pages37945341425](https://github.com/postmelee/alhangeul-tauri/actions/runs/37945341425) attempt1/전체success·workflow/checkout/deploy SHA equality와 artifact11622854980·ZIP961001bytes/SHA2567edea8b8b1603dc5a916bfa26b4678fbb0a00a20b8c94ecfbefe1dd2c7cdf33f·tar23/frozen bytes 일치를 확인했다. 공개 HTTP23/23은 첫 fetch에서 모두 일치했고 manifest0.1.2/2434bytes/SHA256f7517e3dce5048f7fe8c283f48640fb6fed68eb494146ded7441ee5fa0dd64d1를 검산했다. 이전2371/58ca와 notes만 다르며 version/pub_date/3URL/3signature는 같다.

2026-10-09 23:49:56 KST까지 실제 공개 home/updates/v012/feedback의 desktop1280/mobile390 화면·가로 overflow 없음·최신badge1·local012 클릭·고정6다운로드·KST·actual011→012 결과 문구/기존한계를 수용했다. GitHub body6208/d932·Release407055948/11assets·main6d/tag198e/key/endpoint·환경/보호/권한은 유지한다. 새 product build/sign/native upgrade는 실행하지 않았다. 실제 Windows2 bc082d00/37828940744 각 success job과 Linux8a5a28c7/37832348063 whole success는 historical manifest58ca의 별도 consumer evidence로 보존한다. 두 과거 whole failure는 그대로다. Issue113OPEN·branch/worktree 유지이며 최종 기록 PR 인계와 종료/cleanup은 후속 승인이다.

### 최종 수용 기준

| 수용 기준 | 결과·근거 |
|---|---|
| upstream Stable087/core·Studio 동일 release | OK — tag087/resolved1a76570e·Stage1 및 선행PR114/115/116 |
| Windows/Linux012 제품·6종 설치 파일·updater3서명 | OK — main6d·Stage4.2 ordinary/signed/실제6종 GUI·archive/공개11 identity |
| GitHub Stable/latest·tag·최종 사용자 본문 | OK — Release407055948·tag198e→main6d·body6208/d932·Stage4.3/4.9 |
| 실제011→012 NSIS/MSI/AppImage | OK — Windows bc082d00의2 complete job·Linux8a5a28c7 whole success, Stage4.8 |
| 설정/HWP/HWPX·설치/재시작·사용자동의·dirty gate | OK — 형식별 strict settings/문서 hash/accepted.json·GUI6 |
| 최종 안내 통합과 웹/feed 공개 | OK — PR120 actualdevel2a78·Pages37945341425 exact S·HTTP23·manifestf751 |
| 공개 사용자 동선·6다운로드·KST·기존 한계 | OK — desktop1280/mobile390 home/updates/v012/feedback |
| 장기 기록 devel 인계 | 후속 — Stage4.10/4.11·최종 보고 docs-only PR 게시/필수CI/merge |
| Issue 종료·부산물 정리 | 후속 — #113 OPEN·명시 승인 후 처리; primary local/task69 보존 |

### 현재 공개와 실제 검증 출처

producer main6d·annotatedtag198e·Release407055948와 consumer Windows bc082d00/37828940744·
Linux8a5a28c7/37832348063, actualdevel/Pages2a78/37945341425를 서로 구분한다. 실제 native 당시
manifest58ca와 현재 notes-only manifestf751은 설치 URL/signature가 같다. historical mixed run을
전체 success로 바꾸지 않는다. 반복 native/서명/배포가 필요하다는 미완료 주장은 남기지 않는다.

### 최종 기록 인계 승인 요청

승인 위치의 결과 기록6파일과 이전 Stage4.10 기록을 devel 대상 docs-only Open PR로 인계하고
새 head 필수 CI를 검증한다. 제품 source·원문 JSON/site·workflow·고정 fixture·공개 asset/tag/
key/endpoint와 Pages23 bytes는 유지한다. merge·Issue113 close/cleanup은 별도 승인이다.
