# Task #132 — Windows 썸네일 수정 최종 보고

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)
마일스톤: M010

## 작업 요약

- 대상 이슈: #132, Windows 썸네일 지원 환경·실제 기능 검증 정합화.
- 단계: 6개 본 단계. Stage 3은 무료 runner·실제 client 실험과 최소 수정에 따라 3.1~3.6으로 세분화했다.
- 결과: 사용자별 NSIS 정책을 유지하면서 DLL 잠금 정리, clean Windows VC 런타임 누락, 설치 직후 worker 시작 예산 소진을 수정했다.
- Windows 10/11의 NSIS/MSI 새 설치·공개본 동일 버전 업그레이드 여덟 경로에서 최종 서명 파일의 표준 사용자 Explorer·API bitmap·설치 생명주기를 확인했다. 설치 파일6종 문서 작업도 통과했다.
- #138/#139/#140 병합과 최종 파일 검증 후, 명시 승인에 따라 같은 v0.1.3을 재릴리즈했다. 제품4e99e883·tag4860b8ef, Release11개/본문과 #141/#142의 Pages/feed 전환을 완료했다. 공개 API/URL22개 파일·Pages26개·feed3target·웹8조합 검증을 통과했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/desktop/src-tauri/windows/{nsis-hooks,thumbnail-cleanup}.nsh` | 소유 handler의 일시 잠금만 최대60초 기다리고 제거 재시도, 영구 잠금1603 | NSIS 설치·제거 |
| `scripts/{build-thumbnail-binaries,windows-thumbnail-crt,windows-pe-imports}.mjs` | 정적 CRT와 일반/delay PE import 검사 | Windows handler/worker 패키징 |
| `apps/thumbnail-handler/src/process/mod.rs` | 요청 시작+5초/worker 준비+1.5초 중 이른 deadline | Windows cold 시작 |
| `apps/desktop/src-tauri/src/pdf_temp_cleanup.rs` | 기존 symlink/reparse 동작을 보존하는 cfg 표현 정리 | 지원 OS의 Clippy |
| `scripts/windows-thumbnail-user-*`, `scripts/ci/guest-ui-*`, `hosted-ui-*` | 실제 token/Shell, 고정 bytes, first failure, 10/30/60초, 설치/정리 증거 | opt-in CI·수용 |
| `.github/workflows/` 관련 CI와 `scripts/ci/installer-status.mjs` | 표준 사용자 필수 기능 gate와 제한 진단 분리, 무료 KVM guest | 검증 계약 |
| `scripts/ci/ubuntu-mirror.py`, tests | 서명 검증을 유지하는 hosted 미러 복구, 실제 프로세스·installer·protocol 회귀 | CI 재현성 |
| README, 기존 architecture/operations 문서 | 일반 사용자 NSIS·관리자 MSI와 실제 검증 범위 설명 | 사용자·운영 안내 |
| 계획·단계 보고·오늘할일 | 승인 선택, 실패/성공 이력과 재배포 인계 | 작업 추적 |

upstream rhwp pin과 앱 버전은 이 타스크에서 변경하지 않았다. 전역 UAC/DCOM, Shell 격리와 캐시 정책을 완화하지 않았다. 제품 코드·실행 환경은 Windows/Linux 범위를 유지했다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| README.md | 기존 진입 문서 | 동일 | OK | 설치 형식 지원 조건 보완 |
| WINDOWS_THUMBNAILS.md | docs/architecture | 동일 | OK | 승인된 시간 예산·CRT·등록 경계 |
| CI_VALIDATION.md, DESKTOP_RELEASE.md, RELEASE_CHECKLIST.md | docs/operations | 동일 | OK | strict gate·실제 guest·재사용/배포 경계 |
| docs/releases/v0.1.3.md | 기존 릴리즈 기록 | 동일 | OK | Stage5 승인 위치, 최초 공개와 비게시 후보 구분 |
| 계획·단계 보고·본 보고·오늘할일 | mydocs의 기존 역할별 폴더 | plans/working/report/orders | OK | 새 공식 문서 루트 없음 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| clean Windows VC 부재 | handler LoadLibrary126, NSIS exit2 | 정적 CRT; 실제 새 설치·API·화면 성공 |
| NSIS 처리기 잠금 | 제거 exit0 뒤 DLL 잔존 | 소유 DLL 최대60초 대기/재시도, 영구 잠금1603 |
| Windows 시간 예산 | 생성 포함1,500ms | min(요청 시작+5,000ms, 준비+1,500ms) |
| 같은 Win11 VM의 첫 small-hwp | 공개본 0x8004B200/6,665ms | 후보 첫 요청 bitmap181×256/5,070ms |
| Win11 MSI HWPX 초기 화면 | 이전 후보10/30초 아이콘,60초 내용 | 새 후보10/30/60초 모두 내용 |
| 실제 client 관측 | Windows Server 문맥/화면 제한과 일부 실패 | Windows10/11 × 3경로, 동일 제품 여섯 성공 관측 |

표의 API 경과는 COM/Shell 호출 전체이며 내부 handler의 5초 예산과 동일한 구간이 아니다. 같은 버전 교체는 자동 updater 성공이 아니다.

## 검증 결과

### Stage 6 — 공개 재릴리즈 완료

[Stage 6](../working/task_m010_132_stage6.md)에 공개 실행과 독립 재검산을 기록했다. Release ID441647361·stable/latest·버전0.1.3을 유지하며 검증한11개 bytes와 본문을 교체했다. tag ref는 기존 object를 조건으로4e99e883을 가리키는 새 annotated object로 이동했다. API/URL 각각11개 actual 파일과 각3서명, checksum/inventory/body/tag를 대조했고 exact Pages43566571950의 공개26파일·다운로드6종·feed3target·웹8조합을 확인했다. 원본 복구 자료를 보존했고 복구 실행은 필요하지 않았다.

### Stage 5 — 최종 배포 후보 수용

제품 `4e99e883eec6bdf9d6ce59070c769f175052fc3f`의 signing43551466131과 full43551469171이 성공했다. 최종 signed Windows10/11×4경로(공개 MSI 동일 버전 교체 포함), NSIS/MSI/AppImage와 Linux DEB/RPM/arm64 DEB 문서 작업을 검증했다. 세 production Minisign, 실제 installer·설치 binary·저장 문서·PNG hash와 owned cleanup을 독립 확인했다. 공개 교체11개·복구 원본·Pages 적용/복구 patch도 준비했다. 전체 실행·정확한 파일 hash·수용 한계는 [Stage 5](../working/task_m010_132_stage5.md)에 기록했다.

### Stage 1~4 — 병합 전 ordinary 후보 이력

이전 기능 검증 제품은 `ece8bb5e46a1a81e4d74ad2f1dbf84bde7fd59d4`, 실제 client harness는 `92ed2d2b2d132e5ba25fd17d56503a20654b63cd`다. 후속 보고서 commit은 문서만 추가하며 새 제품 bytes로 오인하지 않는다. 상세 run/artifact/installer/화면 hash는 [Stage 3.6](../working/task_m010_132_stage3.6.md)에 기록했다.

| 수용 기준 | 결과 |
|---|---|
| 수정 전/후 기능 재현 | OK — 같은 Win11 VM에서 공개본 첫 실패, 후보 첫4/4 성공; warm 진단으로 대체하지 않음 |
| clean Windows runtime | OK — 개발 도구/VC 부재, reference handler load0, 실제 설치·API·화면 |
| Windows10/11 실제 Explorer | OK — 여섯 경로의 10/30/60초 HWP/HWPX/JPG 내용 직접 검토 |
| NSIS 생명주기·동일 버전 수동 교체 | OK — fresh·공개본 업그레이드·재설치·제거와 사용자 데이터 sentinel 보존 |
| 관리자 MSI 기능·일반 재설치 | OK — full strict API/lifecycle 및 실제 client 표준 Explorer; MSI 작업만 관리자 |
| 타사 등록·rollback | OK — Windows native/installer 합성 fixture 보존·주입 rollback; 실제 한컴 설치 조합은 제외 |
| 시작 예산/보안 경계 | OK — Windows 신규3회귀, 기존 memory/Job/COM 격리 유지 |
| 전체 지원 플랫폼 회귀 | OK — full43453382283 Windows/Linux x64/arm64 core/native/Clippy/package |
| 증거 출처·정리 | OK — archive/inventory/source/설치 bytes/화면 hash, token/SID/session, owned cleanup 독립 확인 |
| PR 전 문서·최종 fast | OK — product-boundary·상대 링크·증거 식별자·diff 확인. 보고서 commit의 원격 fast는 PR 전 알림에서 run 링크로 별도 보고하며 실제 통과 전 PR을 생성하지 않음 |


PR 전 devel의 #135/#136 변경(644d0ac52bb364e57907fd7cd98c57ceaf86dce2)을 merge로 통합했다. 오늘할일 두 파일은 #132·#135의 기록과 후속 승인 내용을 모두 보존했고 workflow 목록도 합쳤다. apps/packages/crates/third_party는 검증 제품 ece8bb5e와 동일해 제품 재빌드는 하지 않는다. 정책·사이트·CI의 통합 fast는 제품 full/client 관측과 별도이며 최종 head 결과를 PR 전 알림에 연결한다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_132_stage1.md): 같은 공개본의 일반 사용자 성공·관리자 NSIS 제한과 제거 DLL 잔존을 분리.
- [Stage 2](../working/task_m010_132_stage2.md): NSIS 잠금 수정·엄격한 표준 사용자 gate·지원 정책 검증.
- [Stage 3.1](../working/task_m010_132_stage3.1.md): 무료 Server 화면·KVM 자원 관측.
- [Stage 3.2](../working/task_m010_132_stage3.2.md), [3.3](../working/task_m010_132_stage3.3.md): 다른 사용자 desktop timeout을 제품 설치 전 대조로 분리.
- [Stage 3.5](../working/task_m010_132_stage3.5.md): Stage3.4 guest 준비·실패를 이어 clean Windows VC 의존성을 수정하고 첫 실제 Explorer 수용.
- [Stage 3.6](../working/task_m010_132_stage3.6.md): 정확한 cold 시작 측정·예산 수정·새 제품 전체 CI와 두 OS 여섯 경로.
- Stage 4: 본 보고, 기존 계획서의 재배포 인계안과 오늘할일 정리, PR 전 알림.
- [Stage 5](../working/task_m010_132_stage5.md): #138/#139 병합·최종 signed bytes·MSI 동일 버전 교체·Windows8경로·Linux 파일3종과 공개 교체/복구 준비.
- [Stage 6](../working/task_m010_132_stage6.md): 승인된 tag·11파일·본문·Pages/feed 교체, 실제 공개 파일·서명·HTTP·화면 검증 완료.

## 잔여 위험과 후속 작업

### 잔여 위험

- 관리자/UAC 비활성 환경은 MSI를 사용한다. 관리자 NSIS 실패를 수정했다고 주장하지 않는다.
- MSI forced-reinstall 3010 뒤 재부팅 후 수용은 기존 제외 범위다. 최종 MSI guest는 새 설치·일반 omus 재설치와 공개본 동일 버전 교체이며 실제3010은 발생하지 않았다.
- 특정 OS build/공개 fixture/표준 DPI 결과다. 실제 한컴·고DPI·모든 PC, 사용자 golden 승인, Windows10 지원 정책을 대신하지 않는다.
- 무료 runner에서 한 번 OS 부팅 정체가 발생했다. 원본 실패·취소·정리는 보존했고 같은 입력의 새 VM 성공과 구분한다. 장기 무중단 운영을 보장하지 않는다.
- 최종 updater 서명 installer의 공개 tag/asset/feed 교체와 공개 URL read-back을 완료했다. 이는 새 파일의 실제 v0.1.2→v0.1.3 앱 내 업데이트를 실행했다는 뜻은 아니며, 같은0.1.3은 수동 설치한다.
- 기존 font-performance의 shellcheck SC2016 경고는 이 변경 밖이며 actionlint 검사는 shellcheck 제외로 수행했다.

### 동일 v0.1.3 재배포 인계

[구현계획서의 구체안](../plans/task_m010_132_impl.md#stage-4-인계용-동일-v013-재배포안-미실행)에 기존 원본11개 보존, 병합 source 고정, 비게시 서명 후보, exact 최종 파일 재검증, 수동 교체 안내, tag/asset/inventory/checksum/Pages와 복구 순서를 정리했다.

기존 updater는 version이 더 커야 하므로 같은 v0.1.3 사용자에게 자동 갱신을 약속하지 않는다. NSIS/MSI 공개본 교체는 최종 서명 bytes에서 두 OS 모두 재확인했다. MSI 식별자·실제 등록 교체와 일반 exit0을 확인했으며 강제3010 재부팅 이후 수용을 대신하지 않는다.

일반 게시 workflow를 재실행하지 않고 명시 승인된 maintainer CLI 경로로 기존 Release ID·동일 URL을 유지하며 교체했다. 공개 새 bytes/서명을 검증한 뒤 Pages/feed를 전환했고 원본11개·본문·tag·Pages 복구 자료는 보존했다. 현재 식별자와 파일 목록은 Stage6와 기존 릴리즈 기록에 있다.

### 후속 작업 후보

- 요청된 같은 버전 재배포와 공개 검증은 완료했다. 이번 파일의 별도 실제 구버전 앱 내 업데이트 관측은 추가 범위가 필요한 경우 진행한다.
- 실제 한컴·고DPI·현장 PC 조합 및 MSI3010 재부팅 수용은 필요 시 별도 범위로 진행.
- guest 부팅 실패의 추가 운영 진단·기준 이미지 승인·지속 시각 gate는 후속 개선 대상으로 남긴다. 미등록 이슈를 등록됐다고 기록하지 않는다.

## 작업지시자 승인 요청

사용자가 #140 병합·준비한 공개 교체·실패 시 원본 복구·공개 검증까지 승인했고 해당 재릴리즈와 검증을 완료했다. 완료 보고 PR의 필수 검사·병합, #132 종료와 안전한 작업 정리를 같은 승인 범위에서 마무리한다. 추가 공개 승인을 요청하지 않는다.
