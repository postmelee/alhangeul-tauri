# Task #113 최종 구현 보고서 — rhwp v0.8.7과 Alhangeul v0.1.2 인계

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
마일스톤: M010
확인일: 2026-10-09 02:09 (Asia/Seoul)
상태: Stage1~4 구현·GitHub012 공개/본문 보정·Gate5 데이터 로컬 수용 완료 / Pages·실제011→012 전달 계속 진행

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
