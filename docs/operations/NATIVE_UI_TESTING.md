# Native UI 자동화 작성·진단 가이드

Windows/Linux의 대화상자·메시지·버튼 조작을 포함하는 테스트나 Actions를 만들거나
고칠 때 먼저 읽는다. 목표는 모든 OS 변형을 미리 지원하는 것이 아니라, 알려진 가정을
검사하고 새 실패를 작은 재현으로 축소하는 것이다. 제품 지원 범위와 릴리즈 승인 기준은
[개발 안내](../DEVELOPMENT.md)와 [릴리즈 체크리스트](RELEASE_CHECKLIST.md)를 따른다.

## 먼저 확인할 것

- [ ] 기존 helper·판정 함수·[사건 기록](../../mydocs/troubleshootings/task_m010_19_windows_pdf_automation.md)의 지원/미해결 상태를 읽었다.
- [ ] 제품 실패, 자동화 실패, 환경/설치 실패, 증거 누락을 구분할 관측 지점을 정했다.
- [ ] 대상 OS·runner image·아키텍처·언어·WebView/driver 버전과 제품/harness SHA를 기록한다.
- [ ] 열기·새 파일 저장·기존 파일 덮어쓰기·취소·예상 밖 확인창을 구분했다.
- [ ] 알려진 미지원 경로가 있으면 전체 성공을 기대하는 실행 전에 해당 경로부터 다룬다.
- [ ] 변경 영향에 맞는 가장 작은 검증과 이후 전체 검증의 진입 조건을 계획에서 승인받았다.

원격 실행은 관측할 가설, 예상 결과, 실패 시 남길 증거를 적은 뒤 수행한다. 하나를
고칠 때마다 제품을 다시 빌드하거나 전체 suite를 반복하는 것을 기본 절차로 삼지 않는다.

## 검증 계층과 보장 범위

| 계층 | 확인하는 것 | 대신할 수 없는 것 |
|---|---|---|
| 구문·타입·정적 계약 | 구문/타입 오류, 필수 guard·workflow 권한의 누락 | 실제 대상 선택·메시지 전달·클릭 |
| 순수 판단 함수의 동작 테스트 | 입력 구조에 따른 선택·거부·성공 판정 | OS가 그 구조를 실제로 노출하는지 |
| 대상 OS의 작은 통합 검증 | 실제 포커스·입력·선택·확인창·종료 후 상태 | 전체 문서/PDF 품질 |
| 기존 설치본의 end-to-end | 문서 identity·편집·저장·원본 보존·재실행 | 미실행 OS/IME/인쇄 환경, 모든 OS 변형 |

문자열을 찾는 `assert.match(source, ...)`는 정적 계약이다. PowerShell 코드를 실행한
것으로 세지 않는다. 정적 분석기는 별도 도구이며, 현재 Node 계약 suite에 포함된 것으로
설명하지 않는다. [PSScriptAnalyzer](https://learn.microsoft.com/en-us/powershell/utility-modules/psscriptanalyzer/overview?view=ps-modules)
역시 코드 규칙 검사이지 Windows UI 동작의 증명은 아니다.

## 선택·실행·결과 판정을 분리한다

### 선택: 모호하면 클릭하지 않는다

- 앱 process와 대상 dialog/container 범위를 먼저 확정한다. 재조회 때 다른 창으로 바뀌지 않았는지 확인한다.
- ID 하나가 아니라 부모/소유 관계, 컨트롤 class·역할, 사용 가능 상태를 함께 본다.
- 후보 없음·중복·사라진 요소를 명시적으로 처리한다. 첫 번째 후보를 임의로 선택하지 않는다.
- UI tree의 한 숫자 ID나 class는 **관측 환경의 adapter 조건**이다. 모든 OS에서의 영구 계약이 아니다.
- Windows `AutomationId`는 전체 트리에서 유일하지 않으므로 container와 탐색 범위가 필요하다.
  [Microsoft 설명](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/use-the-automationid-property)
- 표시된 ControlType만 보고 지원 메서드를 가정하지 않는다. 실제 pattern/capability를 확인한다.
  지원 pattern은 상태에 따라 바뀔 수 있다. [Control Patterns](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/ui-automation-control-patterns-overview)

### 실행: 안전한 경계 안에서만 조작한다

- 입력 전 focus, 입력 뒤 readback을 확인하되, readback만으로 앱이 변경을 받아들였다고 판정하지 않는다.
- OS 호출 전 process·창/자식 관계·class/ID·enabled를 확인하고 대기 시간을 제한한다.
- 메시지 전송 성공, UIA 호출 성공, 대화상자 닫힘은 각각 중간 관측이다.
- 반환값의 의미는 API별로 확인한다. 전송 성공과 control의 처리 결과를 같은 것으로 취급하지 않는다.
- 동기 호출이 후속 modal에 막히는지, 비동기 호출 후 무엇을 기다려야 하는지 구분한다.
- 좌표·전역 키 입력·무조건 Enter/Yes를 실패 우회용으로 추가하지 않는다.

### 덮어쓰기와 취소

기존 테스트 target의 존재, Save 의도, 제출한 경로, 앱/저장창과 확인창의 소유 관계,
확인창 의미와 대상이 맞는지 검증한 뒤에만 승인한다. Yes/No 형태나 IDYES만으로는
덮어쓰기인지 알 수 없다. 본문 확인이 필요한 경우 승인된 fixture의 예상 값과 메모리에서
비교하고, 원문 대신 `promptMatchesExpectedTarget` 같은 판정값만 진단에 남긴다.

예상 밖 확인창은 증거와 함께 실패한다. 취소를 지원하는 시나리오는 출력/원본이 바뀌지
않았는지, modal이 끝나고 편집기로 돌아왔는지까지 확인한다. 취소를 확인하지 않은 테스트를
취소 수용으로 보고하지 않는다.

### 결과: 사용자 작업의 사후 조건을 검사한다

- 열기: generic 완료 메시지 대신 정확한 문서 identity와 로드된 내용을 확인한다.
- 저장: 예상 경로의 파일, source hash·dirty 상태, 형식과 필요한 출력 내용을 확인한다.
- 덮어쓰기: 확인창 처리뿐 아니라 사전 파일과 사후 결과를 비교한다. 동일 내용의 재저장은
  같은 hash일 수 있으므로 hash가 달라야 한다는 조건만으로 판정하지 않는다.
- PDF: UI의 쪽 수와 생성 PDF의 쪽 수·검증 문구·빈 페이지 검사·필요한 시각 판독을 구분한다.
- open-only, 일부 fixture 성공, helper 성공을 전체 PDF 수용으로 승격하지 않는다.

## 실패 한 건을 재사용 가능한 테스트로 바꾸는 순서

1. **증거 보존**: run URL, 제품/harness SHA, 설치 artifact identity, 환경, 실패 stage와
   결과를 기록한다. 제품과 자동화 코드가 달라졌는지부터 구분한다.
2. **작은 재현**: 비밀·개인 경로·본문을 제거한 입력/관측 데이터를 저장하고 실제 판단 함수에
   재생한다. 테스트 안에 구현을 복제한 가짜 selector를 만들어 통과시키지 않는다.
3. **회귀 범위 확인**: 정상 입력 외에도 중복 ID, wrong document, disabled/ambiguous control,
   예상 밖 modal, 취소, 누락/부분 증거를 다룬다. 해당 없는 항목은 이유를 남긴다.
4. **작은 OS 검증**: 순수 함수로 확인할 수 없는 부분만 대상 Windows/Linux에서 검증한다.
   필요하면 별도 승인을 받아 대화상자 단독 검증을 만든다. 별도 앱의 dialog 성공은
   Alhangeul 설치본 통합 성공과 구분한다.
5. **전체 통합 확인**: 알려진 차단 원인이 해소된 뒤 같은 설치 bytes로 전체 경로를 확인한다.
   변경 없는 재실행은 일시 장애라는 근거가 있을 때만 승인받아 수행한다.

workflow 실행 이력만 보존하지 않는다. Actions artifact는 만료되므로 최소 재현 데이터와
원인·해결·검증 한계를 저장소에 남긴다. 원본에서 무엇을 제거/가공했는지 명시하고, 합성
정상 사례를 실제 Windows 성공 증거로 설명하지 않는다. raw screenshot/PDF/tree를 통째로
커밋하지 않는다. 원본을 볼 수 없는 항목은 미확정으로 남긴다.

## 이 저장소의 현재 진입점과 공백

빠른 Windows PDF 계약·판정 회귀(플랫폼 중립):

```sh
pnpm run test:gui:windows:contracts
pnpm run typecheck:gui
```

이 계약 suite는 `pnpm run test:automation`에도 포함된다. 테스트 수를 보고할 때 정적
계약과 실행 가능한 판정 회귀를 구분한다. 이 명령은 Windows UI나 PDF 렌더러를 실행하지 않는다.

| 대상 | 실제 코드 / 검사 | 현재 한계 |
|---|---|---|
| 문서 identity | [함수](../../tests/gui/support/document-identity.ts), [재현 테스트](../../tests/windows-pdf-regressions.test.mjs) | title 경계 검사이며 실제 클릭·본문 렌더링은 아님 |
| PDF 결과 판정 | [분석기](../../tests/gui/windows-pdf/analyze.mjs), [기존 계약](../../tests/windows-pdf-workflow.test.mjs), [재현 데이터](../../tests/fixtures/windows-pdf-regressions.json) | mock PDF 분석을 쓰는 단위 테스트는 실제 PDF 품질 증거가 아님 |
| Windows dialog 판단 | [순수 정책](../../scripts/windows-pdf-dialog-policy.ps1), [실제 함수 테스트](../../tests/windows-pdf-dialog-policy.test.ps1), [UIA 관측](../../scripts/windows-pdf-dialog-observation.ps1) | 실제 helper가 같은 함수를 사용. 합성 PID/HWND·의미 입력은 native 성공 증거가 아님 |
| Windows 작은 OS 관측 | [probe](../../tests/gui/windows-dialog/probe.ps1), [workflow](../../.github/workflows/alhangeul-windows-dialog.yml), [메시지 adapter](../../scripts/windows-pdf-win32.ps1) | 제어된 WinForms 저장창의 확인창까지 관측하며 Yes는 실행하지 않음. 실제 앱·PDF·overwrite 수용과 별개 |
| Windows 실제 설치본 | [spec](../../tests/gui/specs/windows-pdf.e2e.ts), [workflow](../../.github/workflows/alhangeul-windows-pdf.yml) | open-only/full PDF 모드만 있음. 미지원 overwrite control은 안전하게 중단 |
| Linux native UI | [AT-SPI adapter](../../tests/gui/linux/native-ui/atspi.mjs), [사후 조건](../../tests/gui/linux/native-ui/action-postcondition.mjs), [spec](../../tests/gui/specs/linux-native.e2e.ts) | Windows ID/class 가정을 Linux에 이식하지 않음; 각 테스트의 실행 환경을 확인 |

Windows PowerShell 5.1의 순수 함수 테스트 진입점은 `pnpm run test:gui:windows:policy`다.
로컬 결과 JSON은 `windows-dialog-policy-result.json`에 생성하며 검토 후 커밋하지 않는다.
작은 OS 관측은 승인된 harness branch에서 Desktop dispatcher의 `windows-dialog-probe`로
실행한다. 설치 artifact 입력·제품 build가 필요 없다. policy 실패 시 OS 관측은 건너뛴다.
지원 pattern ID/name, HWND 소유 관계, 공개 fixture prompt의 정규화 결과만 artifact에 보존하며
실제 경로가 든 cleanup state는 업로드하지 않는다. 항상 실행되는 cleanup은 PID/시작 시각과
유일한 임시 디렉터리를 검증한 뒤 자기 자원만 정리한다.

확인창의 의미·대상 adapter가 아직 미구현이므로 legacy IDYES도 자동 승인하지 않는다.
새 overwrite 실행 API는 관측 검토 후 추가하고, 성공 여부를 별도 사후 조건으로 검증해야 한다.
최신 실행 결과는 [사건 기록](../../mydocs/troubleshootings/task_m010_19_windows_pdf_automation.md)에 둔다.
Pester/PSScriptAnalyzer는 설치하지 않는다. Node 소스 계약을 PS 실행으로 세지 않는다.

## 새 helper·Action 변경의 완료 기준

- [ ] 실패 사례와 정상/거부 조건이 재현 데이터·실제 함수 테스트에 연결되거나 공백이 명시됐다.
- [ ] OS adapter 변경은 해당 OS의 최소 통합 결과가 있다. 정적 검사만 통과했다면 미검증으로 남긴다.
- [ ] 검증 명령이 기존 실행 진입점에서 호출되며, 새 workflow는 중복 suite가 아닌지 확인했다.
- [ ] 코드·가이드의 지원 범위·사건 기록의 상태를 같은 변경에서 갱신했다.
- [ ] 기존 설치본/증거 재사용 조건과 cleanup·실패 업로드가 확인됐다.
- [ ] 수동 통과, 자동 통과, 미실행, 승인된 위험 수용을 섞지 않았다.

이 가이드는 릴리즈 gate를 추가하거나 해제하지 않는다. 자동화 실패가 제품 실패를 뜻하지는
않지만, 필수 gate를 임의로 생략할 권한도 아니다. 후보와 연결된 수동 근거의 수용 여부 및
후속 자동화 범위는 [릴리즈 정책](DESKTOP_RELEASE.md)과 작업지시자 승인을 따른다.
