# Task #82 구현계획 — Stage 1 실제 캡처

수행계획: [task_m010_82.md](task_m010_82.md), 이슈 #82, M010.
사용자의 이슈 등록·촬영 계획과 구현 진행 승인을 적용한다.

## Stage 1 구현

- 8개 파일 경로/sha와 pinned rhwp commit을 samples.json으로 기록하고 별도 폴더로 복사한다.
  Linux 앱 기존 이미지 자체는 변경하지 않는다.
- Windows 2025: #69 서명 MSI verifier와 설치/cleanup, WebView2 policy setup/restore 재사용.
  tauri-driver 2.0.6으로 biz_plan.hwp 원본을 native Open한다. 처음 문서가 6쪽이고 확대율 1임을
  확인하고 본문은 편집하지 않는다. P/Invoke로 실제 앱 창을 약 1282×924로 배치하고 OS 제목줄
  포함 화면을 캡처한다. Explorer 8개 보기 캡처는 별도 best-effort이며 성공 단정은 육안 검토 후다.
- Ubuntu 22.04 x64: #69 ordinary archive 검증 후 SHA가 고정된 DEB를 apt 설치한다.
  새 cache에서 Nautilus가 직접 8개 thumbnail을 생성하도록 하며 helper를 직접 호출해 cache를
  채우지 않는다. 실제 창과 각 파일의 성공 cache 유무를 보존하고 8개 미달이면 실패로 기록한다.
- reusable workflow와 desktop dispatcher site-capture mode. 권한 contents/actions read만 사용.
  Actions 수행은 Windows/Linux, 로컬은 Node 계약·actionlint/shellcheck/typecheck만 수행.
- 실제 앱을 새로 빌드하지 않고 공개 후보 bytes·샘플 bytes를 검증한다. 캡처 이미지에 문서나
  OS UI 합성을 하지 않는다. 원본 증거를 먼저 보고 사이트용 채택은 이후 단계에서 결정한다.

## 검증·보고

node --test tests/site-capture.test.mjs tests/actions-workflows.test.mjs
pnpm run typecheck:gui
shellcheck scripts/site-capture/linux-gallery.sh
actionlint .github/workflows/alhangeul-site-capture.yml .github/workflows/alhangeul-desktop.yml
git diff --check

캡처 완료 전에는 Stage 1 완료 보고를 쓰지 않는다. exact harness SHA·run을 기록하고 Actions
완료를 기다리지 않는다. 이미지 검토·실패 샘플 교체 판단은 결과 후 진행한다.
Stage 2 사이트 구현은 별도 단계 승인 후 수행하며 제품/updater/배포 변경은 포함하지 않는다.

## Stage 1 실행 준비 결과

캡처 workflow 및 samples/prepare/window/gallery/spec 구현 완료. node 계약 30건 통과,
GUI typecheck, actionlint, shellcheck, diff check 통과. PowerShell 구문은 Windows job의
첫 검증 단계에서도 검사한다. 로컬 체크 중 삭제한 Linux GUI step 참조가 actionlint에서
검출되어 Windows 전용 outcome으로 정리한 뒤 재검사했다.

Windows는 실제 화면 해상도보다 창을 크게 강제하지 않는다. 작은 runner 해상도에서는 가능한
크기로 촬영하고 실제 크기 JSON을 기록한다. 완성 이미지는 결과 확인 후 채택 여부를 결정한다.
Linux는 8개 cache 결과와 화면 둘 다 확인하며 cache 생성만으로 시각적 정상 표시를 단정하지 않는다.

## 최초 촬영 실행

harness SHA `031fb39096e3191133b93b5f9a8de2e55fa76174`, publish/task82,
Alhangeul Desktop Artifact Build mode=site-capture / publish_release=false로 실행했다.
[run 36670325455](https://github.com/postmelee/alhangeul-tauri/actions/runs/36670325455).
Windows 앱·Explorer 시도와 Linux Nautilus 8개 gallery가 독립 job으로 실행된다.
사용자 요청대로 Actions 완료를 기다리지 않는다. Windows 네이티브 구문·실제 UI·Linux cache
생성은 아직 실행 결과 미확인이다. 이번 커밋은 실행 기록만 보충하며 위 run의 harness SHA를
바꾸지 않는다. 다음 입력에서 artifact를 내려받아 화면을 직접 검토한다.

## 최초 결과와 Windows 내장 캡처 재시도

run 36670325455는 양쪽 job이 성공했으나 이미지 수용은 분리한다. Linux Nautilus는 8개
실제 첫 페이지와 창 테두리를 육안 확인했다. Windows 앱은 바깥 배경·알림이 남았고,
Explorer는 문서 thumbnail 대신 앱 아이콘이었다. Windows 이미지는 채택하지 않는다.

사용자의 Actions 내장 캡처 요청에 따라 Stage 1 안에서 촬영 방식을 보완한다.
SnippingTool.exe 존재 확인 후 창 캡처 단축키와 창 선택을 자동 조작하고 clipboard PNG를
저장한다. 도구 미설치·UI 버전 차이·실행 실패 시 Windows Alt+PrintScreen으로 활성 창을
촬영한다. 방식과 실패 이유를 JSON에 분리 기록하며 화면 좌표 복사로 조용히 대체하지 않는다.
STA clipboard, 활성 창 확인, 예상 창 크기 검사를 적용하되 이미지 내용은 후속 육안 확인한다.
앱 알림 대기 시간을 늘린다. 화면 해상도와 Explorer thumbnail 문제는 별도 미해결이다.
Linux 성공 evidence를 재사용하며 artifact_platform=windows-x64로 Windows만 재실행한다.
새 제품 빌드·사이트 구현·배포는 수행하지 않는다.

재시도 준비: Node 계약 30건, GUI TypeScript, actionlint, diff check 통과. PowerShell 구문과
Snipping Tool 실제 실행 가능 여부는 Windows job에서 확인한다. 성공 여부는 아직 미확인이다.

## Explorer 표시 설정 진단 및 재촬영

내장 캡처 run 36673287013 (harness e1e474e737ec0fb22482c5fd1dbf68787ccbbf27)은 성공했다.
Snipping Tool은 기대한 창 이미지를 주지 못했고 Alt+PrintScreen으로 986×713 두 장을 얻었다.
테두리·알림은 개선됐으나 Explorer는 앱 아이콘만 보인다. 이번 실행에는 IconsOnly 값이 없어
원인을 확정하지 않는다. 과거 #57의 IconsOnly=1 관측과 현재 촬영 준비 누락이 조사 근거다.

사용자의 진행 승인에 따라 기존 disposable CI display guard를 재사용해 원래 IconsOnly를
보존하고 0으로 설정, 새 폴더 창 촬영 후 finally에서 원복·검증한다. 차단 정책은 변경하지 않는다.
설정 변경 전/중/후의 정책·등록·파일 hash·프로세스 token 정보를 기존 allowlist 진단으로
기록한다. Explorer에 설정 변경을 통지하고 큰 아이콘 보기로 8개 표시를 시도한다.
캐시 직접 생성이나 renderer 강제 호출은 하지 않는다. 창 캡처 실패는 best-effort로 남기되
설정 복원 실패는 GUI 검증 실패로 전파한다. 제품 bytes와 Linux 성공 촬영은 재사용한다.

검증: Node 계약 30건, GUI TypeScript, actionlint, diff check 통과. 신규 PowerShell도
Windows job 시작 시 구문 검사한다. Windows 전용 재촬영을 실행하고 결과는 후속 확인한다.

## Explorer 재시작과 Shell API 분리 진단

run 36674162294는 성공했지만 8개 모두 아이콘이었다. IconsOnly는 1→0→1로 변경·복원됐고,
조회한 DisableThumbnails 정책은 없었다. HKLM 처리기 등록과 DLL/worker가 존재했다.
registry 변경만으로 UI 반영을 확정할 수 없으므로 사용자의 후속 진행 승인으로 비교를 추가한다.

동일 VM에서 설정 변경 후 재시작 전/후 PNG를 모두 보존한다. Explorer 재시작은 disposable
hosted CI의 현재 session 및 Windows explorer.exe 경로를 확인한 PID로 제한한다. 복원 후에도
다시 시작해 실행 중 설정을 원복한다. HWP/HWPX 각 1개와 pinned samples/s1.jpg 대조군에 기존
timeout 있는 진단 도구를 적용한다. 먼저 cache-only를 관측하고 별도 복사본에 shell/force-extract
요청을 실행해 HRESULT·bitmap 여부를 보존한다. 생성 요청은 두 이미지 촬영 후에만 수행해
촬영 화면에 진단 생성 cache가 섞이지 않게 한다. API 성공은 Explorer UI 성공으로 간주하지 않는다.
제품 수정/새 빌드 없이 Windows 전용 실행이며 단계는 계속 Stage 1이다.

준비 검증: 기존 Node 계약 30건, GUI TypeScript, actionlint, diff check 통과. PowerShell
구문 검사는 Windows job에서 수행한다. 재시작 후 registry snapshot도 기록해 되돌림 여부를
확인한다. 비교 진단의 실제 성공·실패와 사진 채택 여부는 Actions 결과 후 판단한다.

비교 결과: [run 36675197659](https://github.com/postmelee/alhangeul-tauri/actions/runs/36675197659),
harness 79907d18, Windows job success. IconsOnly=0 상태에서 재시작 전에는 8개 아이콘,
Explorer PID 4616→2628 재시작 후에는 8개 실제 첫 페이지 썸네일을 육안 확인했다.
재시작 후에도 IconsOnly=0이었고 촬영 뒤 1로 복원 및 Explorer 재시작을 확인했다.
이 VM에서는 설정 변경 통지만으로 기존 Explorer 표시가 갱신되지 않았으며 재시작으로 해결됐다.
제품 bytes 변경이나 생성 API 호출 없이 재시작 후 PNG가 먼저 촬영됐다.

이후 HWP/HWPX 각 1개 cache-only·shell·force-extract는 모두 0x00000000과 181×256 bitmap을
반환했다. 별도 JPG 대조군은 cache-only 0x80030002, shell/force-extract 성공(164×152)이었다.
JPG는 탐색기 gallery에 넣지 않았으므로 cache-only 실패를 제품 썸네일 실패로 분류하지 않는다.
Windows/Linux 8개 gallery 촬영은 확보했다. Windows 창은 986×713이며 기존 Linux 앱 창과의
구도 차이는 남는다. 사이트 채택 및 Stage 2 진행은 아직 완료 처리하지 않는다.

## Windows 구도 정렬

사용자의 구도 조정 승인에 따라 disposable VM 화면을 1920×1080으로 요청하고 실제 적용
크기를 기록한다. 적용 불가 시 작은 창으로 성공 처리하지 않고 실패 근거를 남긴다. 해상도는
촬영 후 always 단계에서 복원한다. Windows 앱의 보이는 창 테두리는 Linux와 같은 1282×924,
Explorer는 기존 Linux gallery와 같은 1180×780을 목표로 DWM의 비가시 resize margin을
보정한다. 원본 문서·100% 배율은 유지한다. Explorer는 large에서 Ctrl+wheel로 썸네일 크기를
높여 8개 문서를 여러 행으로 배치한다. 사이드바는 우선 유지하며 결과에 따라 조정한다.
원본 Linux 이미지 변경, screenshot 합성, 제품 변경은 없다. 실제 구도는 실행 후 육안 확인한다.

준비 검증: Node 계약 30건, GUI TypeScript, actionlint, diff check 통과. Windows에서
PowerShell 구문·표시 모드 지원·실제 캡처 크기·구도를 확인한다. Actions 완료는 기다리지 않는다.

run 36676600660 (bc122d38) 성공: VM 1024×768→1920×1080 적용 및 원복 확인. 앱 PNG는
1282×924, 탐색기는 1180×780으로 목표와 일치한다. 문서 원본 hash와 100% 배율을 유지했다.
앱 구도는 사용할 수 있으나 Explorer는 8개가 한 줄에 몰려 채택을 보류한다. Ctrl+wheel 대신
공식 IShellFolderViewDual3.IconSize를 192로 지정하고 readback을 검사하도록 보완한다.
이 변경은 동일 Stage 1 구도 조정 범위이며 Windows만 재촬영한다.

## Stage 2 구현 계획

이번 턴의 진행 승인으로 사이트 구현에 진입한다. 기존 script.js에 배포 대상 배열을 두어
홈 다운로드 행·접근성 이름·직접 다운로드 제공 문장을 같은 데이터에서 생성한다. 버전은
release.json을 사용하며 유효한 exact URL만 활성화하는 계약을 유지한다. 미공개/통신 실패
안내는 유지하되 공개 상태에서 오래된 '공개 전' 문구를 교체한다. JS 미실행 시 안내 링크를 둔다.

home-showcase.js/css는 이미지 전환과 겹침만 소유한다. 왼쪽 OS 라디오와 다운로드/이미지를
동기화하고 두 native 이미지의 hover 노출 영역·focus·명시적 버튼/tap을 지원한다. 위치가
바뀌는 hover 대상 때문에 앞뒤가 반복 전환되지 않게 고정된 가장자리 영역만 hover에 쓴다.
280ms transform과 그림자 전환, 작은 화면에서도 이미지 접근, reduced-motion을 적용한다.
기존 site/ 파일과 승인된 mydocs/ 위치만 사용한다. Stage 2 확인은 Pages 상태 fixture 회귀,
실제 브라우저 기본 동작 및 화면 검토이며 정식 Stage 3/PR·배포는 별도 단계다.

## Stage 2 디자인 보완

사용자의 제목·다운로드 위계 수정 지시에 따라 제목을 두 줄로 묶고 화면 폭에 따라 글자 크기를
조정한다. 다운로드 옆에는 release.json 기반 '최신 버전 v{version}'을 표시한다. 배포 형식 문장은
다운로드 행과 중복되어 제거하며, 행을 생성하는 배열은 유지한다. 기존 site/와 이 계획서,
Stage 2 보고서만 갱신하며 별도 Stage 3 진입이나 운영 배포는 하지 않는다.

## Stage 2 이미지 간격 보완

사용자의 겹침 간격 조정 요청에 따라 앱/탐색기 폭을 영역의 82%/86%로 줄여 오른쪽 썸네일
열이 드러나게 한다. 충분한 높이에서는 세로 영역도 넓히며 작은 화면은 85%/88%, 낮은
데스크톱은 기존 영역 비율을 유지해 버튼과 설명 잘림을 방지한다. 원본 이미지와 전환 로직은 유지한다.

## Stage 2 hover 감지 보완

사용자가 보고한 hover 영역 불일치를 확인했다. 고정 비율 좌표 판정이 변경된 이미지 배치와
일치하지 않는다. 브라우저 pointermove의 실제 target에서 data-shot을 찾아 해당 stack 안의
이미지일 때만 전환한다. 빈 여백·touch 이동은 무시하고 클릭/focus 전환은 유지한다.

## Stage 2 설명 문구 재배치

사용자가 승인한 제안대로 히어로 설명을 두 줄로 묶고 이미지 아래 설명을 제거한다. 설치 안내는
목록 바로 아래 14px 간격의 업데이트 링크로 바꾸며 목록의 불필요한 최소 높이를 제거한다.
기존 site/ 및 Stage 2 보고서 범위에서 수정하고 Pages 검증을 수행한다.

## Stage 2 OS 전환 시 시작 위치 고정

사용자 요청에 따라 왼쪽 콘텐츠를 높이에 따른 중앙 정렬 대신 상단 기준으로 배치한다.
화면 높이에 따른 여백은 유지하되 OS별 행 수에는 영향을 받지 않게 하고, 추가 행과 안내
링크만 아래로 확장한다. 모바일은 기존 문서 흐름을 유지한다.

사용자의 후속 위치 조정에 따라 상단 여백을 clamp(64px, 15vh, 180px)로 늘린다.
OS 행 수와 독립적인 배치는 유지하며 모바일 여백은 기존 0을 유지한다.
