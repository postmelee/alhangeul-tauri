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
