# Task #113 Stage 4.8 — 실제 v0.1.1 → v0.1.2 업데이트 수용

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.8
확인일: 2026-10-09 04:45 (Asia/Seoul)

## 단계 목적

공개된 이전/새 설치 파일과 production updater를 사용해 Windows NSIS·MSI와 Linux x64
AppImage의 실제 0.1.1 → 0.1.2 업데이트를 수용한다. 단계별 generic 보정은
[4.8.1](task_m010_113_stage4.8.1.md)·[4.8.2](task_m010_113_stage4.8.2.md)에 별도로 기록했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| 본 보고서 | 형식별 실제 harness/run/job/archive·수용·실패 이력·한계 |
| `mydocs/plans/task_m010_113_impl.md` | 승인된 Linux-only 실행과 조건부 3종 수용 결과 |
| `mydocs/report/task_m010_113_report.md` | 현재 전달 상태·후속 승인 경계 |
| `mydocs/orders/20261009.md` | 실제 3종 완료와 최종 안내 전달 구분 |
| `docs/releases/v0.1.2.md`·`README.md` | 기술 공개 기록과 실제 업데이트 확인 상태 |

## 본문 변경 정도 / 본문 무손실 여부

기존 실패·단계 snapshot을 보존하고 최신 결과를 추가했다. 제품 source·설치 파일·서명·tag·key·
endpoint·공개 Release 본문/notes·Pages/feed bytes는 변경하지 않았다. 실제 source 보정은 이미
승인·커밋된 4.8.1/4.8.2다. 이번 결과 기록 이후 head와 실제 검증 harness SHA를 구분한다.

## 검증 결과

### 고정 공개 입력

| 입력 | 실제 값 |
|---|---|
| 이전 product source / Release | `96e89e900415ee9e1e942b5c01c833dea3415e86` / 402604603 |
| 새 product source / Release | `6dcb05e96ec2075d09d8a60160e1d82f08c0811b` / 407055948 |
| production manifest | 2371 bytes / `58ca348b234945e8330911ec6f77ba1c3af5ac6b5e05db8a585a29e55a107ad3` |
| key fingerprint | `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8` |
| endpoint | `https://postmelee.github.io/alhangeul-tauri/updater/stable.json` |

각 job의 public input에서 두 Release/tag/source·11개 asset identity 및 선택 파일의
size/hash/url·실제 Minisign verification을 확인했다. 세 manifest copy도 같은 hash다.

### 형식별 수용 출처

| 형식 | harness SHA | run / 실제 job | 결론 |
|---|---|---|---|
| Windows NSIS | `bc082d0006baf7a045855bcb0b055aa3fad11c12` | [37828940744](https://github.com/postmelee/alhangeul-tauri/actions/runs/37828940744) / 113488965823 | 해당 complete job success·accepted.json passed |
| Windows MSI | `bc082d0006baf7a045855bcb0b055aa3fad11c12` | 같은 run / 113488965981 | 해당 complete job success·accepted.json passed |
| Linux AppImage | `8a5a28c7ca2ffcaa673d06d2c0f239793fa4433b` | [37832348063](https://github.com/postmelee/alhangeul-tauri/actions/runs/37832348063) / 113500633933 | Linux-only 전체 run success·accepted.json passed |

모두 attempt1이다. Windows run37828940744는 Linux 실패로 **전체 failure를 유지**한다.
Linux-only run의 다른 플랫폼/build/sign/publish jobs는 skipped이며 성공으로 세지 않는다.
원래 run37824197495의 3종 failure도 보존한다. 재사용한 Windows execution 경로는 15개
관련 파일과 applyWindowsUpgrade 함수/Windows 분기·return의 byte equality로 대조했다.
원래 Linux native restart probe도 불변이다. 별도 consumer 증거를 형식별로 조합한 수용이다.

| archive ID | ZIP bytes | SHA256 |
|---|---:|---|
| NSIS 11573406006 | 15780764 | `6d7f0fc4a04b51158f7ea6768383ff027056bff6309ed88c086cf405114b0dbc` |
| MSI 11573131257 | 15824111 | `294a30eff1d571a9809343a5d0956bded577dfb927efd2d3f93a481116762481` |
| AppImage 11573159872 | 687854 | `7bdc6668babafa65b7f6284fbe82e2c592bcb2f775cf84cf305fde46e31e33db` |

완료 job 로그·archive metadata/bytes를 내려받아 위 digest를 재계산하고 안전 추출했다.
원시 JSON을 별도 읽기 검산했다. 실제 검증 명령/증거 출력은 다음 임시 폴더에 보존한다.

```bash
node /private/tmp/task113-main-candidate/upgrade012-proposal/failure-correction-proposal/verify-evidence.mjs nsis msi
node /private/tmp/task113-main-candidate/upgrade012-proposal/failure-correction-proposal/restart-correction-proposal/verify-linux-evidence.mjs
```

합성 receipt `combined-upgrade-acceptance.json`은 위 두 verifier 결과와 공개 입력/Windows
동등성을 검산한 후 생성했다. SHA256 `5947dd00a496a8f7d2fbed1ec7734e00df5ca2da5bd7778bc4a9a7470bd7cb91`다. 임시 파일/Actions archive는
영구 보관을 보장하지 않으므로 본 보고서에 run/job/archive/digest와 핵심 결과를 기록한다.

### 실제 동작과 GUI 수용

- 세 형식 모두 시작/manual 조회 011→012·저장하지 않은 문서 차단·visible UI 동의·실제 다운로드/
  설치·새 앱 idle/current012·About Alhangeul012·settings equality·최종 accepted.json을 통과했다.
  합성 검증 설정의 theme/font/view를 엄격하게 비교했으며 사용자 개인 문서는 사용하지 않았다.
- Windows2는 native DisplayVersion/ProductVersion/FileVersion012·HWP/HWPX handler/defaults 보존·
  cleanup exit0/잔존 검사·policy restore 모두 success다. NSIS empty response1 뒤 실제 closure를
  관측했으며 null만으로 수용하지 않았다. MSI empty response는0이다.
- Linux는 installed restartRequired 뒤 실제 PID5034 `/tmp/.mount_AlhangbbaoNj/usr/bin/Alhangeul`에서
  PID5207 `/tmp/.mount_AlhangJpNlOf/usr/bin/Alhangeul`로 바뀌었다. 서로 다른 PID/FUSE exe,
  public012 AppImage hash `b216c098dbebafc062b463edd225d918071a6710c9bf8c874055298a3224ea80`
  로 writable 파일 교체, 같은 새 PID/exe의 실제 stop receipt를 확인했다.
- 이번 Linux 성공 실행의 restartTransportClosed는 null이다. exact execute/async POST 오류
  branch가 실제 재현됐다고 쓰지 않는다. 해당 branch의 분류/오관측 거부는 7개 새 회귀와
  이전 실제 실패 로그로 검증했고 이번 run은 정상 클릭 뒤 실제 native 재시작을 수용했다.
- 각 형식에서 HWP6쪽·HWPX10쪽 canvasReady/unchanged=true를 확인했다. fixture SHA는 각각
  `8b786d6824622afae2220b203beeef6e5592157e1896fea055ebc602817113c1`·
  `5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4`다.
  GUI6화면을 직접 보아 제목·본문/표·툴바·쪽수 표시를 확인했다. 빈 화면/로딩 overlay는 없다.

| screenshot | PNG bytes | SHA256 |
|---|---:|---|
| NSIS HWP | 54419 | `bd40e51d22a52e3db62d69482805390197317277ef94db5a8890d7c03fd09a94` |
| NSIS HWPX | 122774 | `b58e1f7e07a87c26dc4120985d617641284f76a94ff4c0b12cd09a41baf68ccd` |
| MSI HWP | 54463 | `491c6daf1562435f17b2db698a31f9a658ce37e3601ffdbf7c180df48b846c90` |
| MSI HWPX | 122642 | `6f81637755857a0215d409358d82cfae3381e938667b93b004f815a55303bce5` |
| AppImage HWP | 63031 | `f0cdf2353d02d7817020f78d3d6a79309a9c2d2d8adca25d166c3629420186da` |
| AppImage HWPX | 153080 | `bc255383bad5eec9b2771120081ccab3956fbce078a1e140a47b885cf92f473a` |

### 일반 자동 검증과 필수 CI

최신 실제 harness H8a의 집중94/전체 automation1360·fail/skip0·GUI types·기본 boundary/version/
metadata/pin/committed-rhwp·notes2·Pages source19/output23·upstream39·Studio283/43files/types/build는
[4.8.2](task_m010_113_stage4.8.2.md)의 실행 출력을 재사용한다. source 변경 없이 반복하지 않았다.
[required37831668570](https://github.com/postmelee/alhangeul-tauri/actions/runs/37831668570)은
Node·Windows·required3job 모두 success다. Node1360·Windows production88(notes124), 실제 merge
checkout `c87148c94be3f693086d341b431349e3b0286cde`의 tree는 H8a와 같은
`bf2c29bee914aaaebf364f672e96ce7e8624b9d5`다. PR 기록 후 새 head 필수 CI는 별도로 확인한다.
Linux actual run 완료시각은 `2026-10-08T19:37:58Z`, 합성 검산시각은 `2026-10-08T19:38:58.703036+00:00`다.

## 잔여 위험

- NSIS 일부 썸네일 미수용·MSI 대안, 강제 MSI3010 재부팅 후 미검증, Authenticode 미서명은 유지한다.
- 모든 Wayland/GPU/font/사용자 문서/배포판/물리 프린터 및 새 pin 성능 비교는 미검증이다.
- 공개 안내/본문/feed에는 아직 실제011→012 미실행 문구가 남아 있다. 3종 수용 자체와
  최종 안내 게시·새 Pages HTTP 검산·PR 통합·Issue 종료를 구분한다.

## 다음 단계 영향

PR120에 실제3 수용 결과를 인계한다. 최종 사용자 안내는 notes JSON을 원문으로 body/HTML/short/
site release notes를 생성한다. 검증 당시 manifest58ca와 후속 notes-only manifest를 구분해야 한다.
고정 regression이 mutable site/release.json을 읽는 입력 충돌을 사전 점검한다. product/key/
installer/signature/source tuple은 그대로 유지하며 새 build/sign/실제 native 재실행은 요구하지 않는다.

## 승인 요청

공개 결과 문구/필요 source 보정은 concrete diff와 생성물을 준비한 후 별도 승인받는다.
PR120 일반 merge·actual merged devel SHA의 Pages 배포·#113 close/부산물 정리는 후속 승인이다.
