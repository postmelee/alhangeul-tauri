# Task #147 Stage 1 — rhwp v0.9.1 후보 검증

[이슈 #147](https://github.com/postmelee/alhangeul-tauri/issues/147) · [구현계획](../plans/task_m010_147_impl.md) · [PR #146](https://github.com/postmelee/alhangeul-tauri/pull/146)

## 단계 목적

rhwp v0.9.1 고정 후보의 Windows·Linux 설치본을 검증하고, v0.1.4 버전 통합에 사용할 결과를 기록한다.

## 산출물

| 위치 | 변경 요약 |
|---|---|
| `scripts/windows-editor-window.cs`, `scripts/windows-process-lifecycle.ps1` | 설치 수명주기 검사에서 소유 편집기 창을 찾아 30초 안에 정상 종료를 요구한다. |
| 이 보고서 | 원시 실패, 재검증 결과, 운영체제별 설치본 근거를 보존한다. |

## 본문 변경과 동작 보존

편집기 창 선택 보정은 Windows 설치 시험에 적용했다. 앱과 upstream 구현은 검증한 #146의 트리를 유지한다.

## 검증 결과

검증 head `d6350b7b51fea3e58259957e5bae7adece8e9ab3`, upstream fixed `981ce66b4183b13c1a3b5907e04a8969c8c42034`. PR required [44708765183](https://github.com/postmelee/alhangeul-tauri/actions/runs/44708765183)는 성공했다.

[첫 native 검증 44746621403](https://github.com/postmelee/alhangeul-tauri/actions/runs/44746621403)은 전체 실패다. Windows/Linux 패키지와 세 코어 probe, Linux 썸네일 설치 수명주기, MSI·MSI 강제 재설치의 계약, 표준 사용자 NSIS API·수명주기 job은 성공했다. 표준 사용자 NSIS의 실제 문서 bitmap 12개·대조 이미지 4개와 제품 제거 성공을 원본에서 확인했다. MSI 강제 재설치 원시 결과는 재부팅 요구이며 계약만 통과했다. artifact `14639007288`에서 `reboot-required`와 `post-reboot-unverified`를 확인했다.

[관리자 문맥 NSIS job](https://github.com/postmelee/alhangeul-tauri/actions/runs/44746621403/job/136358695392)의 원본 artifact `14640455627` SHA-256 `07ebb8183243804686c76b6aa9675bf2923ded82e893352b25997ac38e6c799e`를 검산했다. 원래 알려진 `0x80040154` 12건 외에 `Alhangeul cycle 1 graceful-exit timeout`이 추가됐다. 닫기 요청 30초 뒤에도 창 handle과 응답 상태가 남아 있었다. 평가의 `invalid-common-evidence`와 집계 실패는 이 원본을 보존한다. 현상만으로 앱 코드 결함·러너 타이밍 중 어느 쪽인지 확정하지 않는다.

새 러너에서 같은 SHA로 [44758438233](https://github.com/postmelee/alhangeul-tauri/actions/runs/44758438233)을 실행했고, 같은 정상 종료 timeout이 재현됐다. 첫 실행의 마지막 관측은 제목 Alhangeul과 응답 True, 두 번째는 빈 제목과 응답 False였다. 두 번째 원본 artifact는 `14645908466`이고 SHA-256은 `675db1180ef02742f9a7cf6a4c5c4a62cb6d081fe04bb223eb47b4eec137232b`다. 집계는 동일 시도의 모든 필수 job을 요구하므로 실패 job만 골라 재실행하지 않았다. Windows Explorer/PDF, Linux GUI는 성공한 정확한 producer가 확보되면 실행한다. 전체 실패 run의 설치 파일·ABI를 공개 수용으로 해석하지 않는다.

공개 v0.1.3의 NSIS/MSI/AppImage와 서명·inventory·체크섬을 canonical URL에서 다시 받았다. API hash·size와 세 Minisign을 검증했다. 추후 생산 업데이트는 이 기준선에 연결한다.

### 2026-11-22 종료 재현 분리

- [Windows 비교 진단 44928820491](https://github.com/postmelee/alhangeul-tauri/actions/runs/44928820491)에서 이전 공개 source의 일반 패키지와 #146 일반 패키지에 같은 NSIS 설치·재설치 및 종료 절차를 적용한다. 30초 정상 종료 기준을 유지하고 앱 소유 창의 시간대별 상태를 기록한다. 진단에서 실패한 producer의 파일을 승인된 수용 파일로 취급하지 않는다.
- [Linux 전용 44928832041](https://github.com/postmelee/alhangeul-tauri/actions/runs/44928832041)은 #146 exact SHA에서 별도 성공 producer를 확보하기 위한 실행이다. 두 기존 실행에서 통과한 native/core 결과와 별도로 GUI의 입력 자격을 만든다. Windows 전체 수용을 대체하지 않는다.


### 정상 종료 계측

첫 비교 run 44928820491의 trace zip 두 개를 발행 digest와 대조했다. 이전 source는 2,051ms·74ms, 후보는 268ms·63ms에 정상 종료했다. 종전 시간 초과는 이 실행에서 재현되지 않았다. 실행 전체는 지원 archive 누락으로 별도 실패했다. 계측에서 동일 PID의 편집기, single-instance, Tao event 창을 확인했으므로 재현 여부와 분리해 목표 HWND 선택을 비교한다.
[보정한 비교 run 44929720833](https://github.com/postmelee/alhangeul-tauri/actions/runs/44929720833)은 exact 패키지와 support archive를 검산하고 기존 선택과 소유 PID·Tauri 클래스가 유일한 편집기 창 선택을 대조한다. 두 방식 모두 정상 종료를 30초 안에 요구한다.

세 경로의 trace archive digest를 확인했다. 기존 선택은 이전 source 4,036ms·85ms, 후보 3,431ms·156ms에 종료했다. HWND 지정 후보는 2,018ms·430ms에 종료했다. 세 경우 모두 두 cycle이 통과했고 `DiagnosticContract=true`였다. 원시 exit 1과 `0x80040154` 12건은 기존 관리자 NSIS 제한으로 보존한다. 두 차례 기존 timeout의 원인은 확정되지 않았다.

별도 후보 SHA `241918e623c699d2e18bdfa1119cbc57178eeac0`에는 편집기 선택 및 계약 검사만 추가했다. #146과 앱, crate, submodule 및 pin은 일치한다. 기존 11개 안정 표본과 정상 종료 30초 제한을 유지한다. Node 계약 12/12 및 diff 검사를 통과했다. [전체 네이티브 검증 44930124104](https://github.com/postmelee/alhangeul-tauri/actions/runs/44930124104)은 전체 성공했다. Windows/Linux 패키지와 native 검사가 통과했다. 관리자 문맥 NSIS 원시 결과는 종료·수명주기 통과와 기존 썸네일 제한을 각각 기록했고, 표준 사용자 NSIS 검사도 통과했다. MSI 강제 재설치의 재부팅 후 결과와 Explorer 화면은 별도 확인한다.


[Linux 전용 패키지 run 44928832041](https://github.com/postmelee/alhangeul-tauri/actions/runs/44928832041)은 exact #146 source에서 x64·ARM64 패키지 및 설치 수명주기를 통과했다. 일반 패키지의 [Linux x64 GUI 검증 44933050953](https://github.com/postmelee/alhangeul-tauri/actions/runs/44933050953)은 설치·썸네일·시스템 인쇄 성공, WebDriver 실패로 종료했다. 원시 artifact `14719310789`의 SHA-256 `15a914b1524f73a8ad3cf8046839fef77c71c73a765a4979408b96b5625fe788`을 검산했다. 첫 HWP 다른 이름으로 저장은 대상 파일을 만들었으나 앱이 WASM aliasing 오류를 표시했다. 같은 세션에서 현재 저장·새 문서·드래그·직접 PDF가 실패했다.

### 설치본 추가 검증

- 정확한 Windows 패키지 artifact `14719284526`에서 [Windows 10 NSIS](https://github.com/postmelee/alhangeul-tauri/actions/runs/44940871042), [Windows 10 MSI](https://github.com/postmelee/alhangeul-tauri/actions/runs/44940874698), [Windows 11 NSIS](https://github.com/postmelee/alhangeul-tauri/actions/runs/44940874380), [Windows 11 MSI](https://github.com/postmelee/alhangeul-tauri/actions/runs/44940873998)와 [Windows PDF](https://github.com/postmelee/alhangeul-tauri/actions/runs/44940874356)를 각각 실행했다.
- [후보 Linux 진단](https://github.com/postmelee/alhangeul-tauri/actions/runs/44941106714)과 [v0.1.3 비교](https://github.com/postmelee/alhangeul-tauri/actions/runs/44941472826)는 동일 스크립트에서 각 시나리오를 새 앱 세션으로 실행하고 브라우저 WASM 예외 스택을 수집한다. 각 패키지를 검증된 producer에 고정했다.
- 최초 Linux 계측은 WebDriver에 직렬화된 `__name` 변수가 브라우저에 없어 문서 시나리오 전에 실패했다. 브라우저에 그 환경에서 실행할 원문 JS를 넘기고 다른 이름으로 저장의 성공 상태를 확인하도록 보정했다. [재검사 44941869158](https://github.com/postmelee/alhangeul-tauri/actions/runs/44941869158)과 [재검사 44941869614](https://github.com/postmelee/alhangeul-tauri/actions/runs/44941869614)는 동일한 보정 커밋을 사용한다. Node에서 동일 WASM과 두 fixture로 보고서 포함 저장·파일명 변경·재열기·SVG 생성을 형식별 세 번 통과했다. GUI 수용은 별도다.
- Windows 10 NSIS/MSI의 초기 artifact `14721434007`, `14721703203`의 digest와 동일 설치본을 확인했다. 화면은 Windows 설치 단계였으며 Explorer 판정은 최종 artifact를 기다린다.
- Windows 10 NSIS `14722101846`, Windows 10 MSI `14722366613`, Windows 11 MSI `14722152014`의 최종 archive와 Explorer 캡처 해시를 검산했다. 세 실행에서 설치·재설치·제거 exit 0과 표준 사용자 API 비트맵 4/4를 확인했다. HWP 시험 문서, HWPX 양식, JPG 썸네일 화면을 검토했다. 빈 HWP는 API 확인에 사용했다. MSI의 정상 재설치 결과와 강제 재설치 3010은 별도 기록이다.
- [Windows PDF 44940874356](https://github.com/postmelee/alhangeul-tauri/actions/runs/44940874356) 성공. 원시 `14721998300`과 분석 `14722655002`의 archive digest 및 PDF 4개 hash를 검산했다. 처음 실행과 앱 재시작 후 직접 저장 모두 HWP 6쪽·HWPX 10쪽, A4·검색 가능한 한글·비어 있지 않은 렌더를 통과했다. 고유 렌더 16쪽을 검토했고, 실행 간 같은 페이지 PNG는 바이트 단위로 일치했다.
- Windows 11 NSIS `14722730511`에서도 같은 검산과 화면 확인을 완료했다. 설치·재설치·제거 exit 0 및 표준 사용자 비트맵 4/4를 확인했다.
- MSI 강제 재설치 `14720112149`는 계약 통과, 원시 exit 3010이다. MSI 로그가 재설치 시 사용 중인 `Alhangeul.exe`와 `AlhangeulThumbnailHandler.dll`을 기록했다. 재부팅 후 검증은 미확인이다.
- [Linux 후보 GUI 44941869158](https://github.com/postmelee/alhangeul-tauri/actions/runs/44941869158)와 [v0.1.3 대조군 44941869614](https://github.com/postmelee/alhangeul-tauri/actions/runs/44941869614)가 각각 통과했다. archive는 `14722446688`, `14722118470`이다. 후보 DEB hash가 최초 실패와 같다. 새 세션별 저장·재열기·새 문서·드래그·직접 PDF와 시스템 인쇄를 확인했고 WASM 오류 수집 결과는 모두 비어 있었다. 최초 실패의 원인은 미확정이다.
- [기존 연속 시나리오 44942778215](https://github.com/postmelee/alhangeul-tauri/actions/runs/44942778215)는 전체 producer `44930124104`에서, [반복 저장 44942975755](https://github.com/postmelee/alhangeul-tauri/actions/runs/44942975755)는 최초와 같은 DEB에서 실행했다. 반복 저장에서는 한 편집기 세션으로 HWP/HWPX Save As·현재 저장·재열기를 형식별 네 번 실행한다.
- [기존 Linux 연속 44942778215](https://github.com/postmelee/alhangeul-tauri/actions/runs/44942778215)는 전체 Windows/Linux 검증과 같은 후보 SHA 및 producer를 사용했다. archive `14722612501`의 digest와 HWP/HWPX 열기, 저장·재열기, 새 문서, 드래그, 직접 PDF 두 형식, 시스템 인쇄 8개를 확인했다.

## 잔여 위험

최초 Linux GUI 오류는 원인이 확정되지 않았고 같은 DEB의 계측 실행 및 동일 소스의 연속 시나리오에서 재현되지 않았다. MSI 강제 재설치의 재부팅 후 결과는 [44943707292](https://github.com/postmelee/alhangeul-tauri/actions/runs/44943707292)에서 별도로 확인 중이다. Authenticode와 업데이터 서명은 각각 확인한다.

## 다음 단계 영향

#146의 upstream 고정 커밋과 검증용 Windows 편집기 선택 보정을 보존한다. 버전 통합 뒤 main의 정확한 소스에서 일반 및 비게시 서명 후보를 만들고 실제 게시 파일을 다시 검사한다.

## 진행 승인

작업지시자가 필수 검사를 통과하면 별도 승인 없이 배포와 후속 정리까지 진행하도록 지시했다.
