# Task #126 Stage 5.2 — Windows 이전 버전 검사 보정

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md)

## 단계 목적

실제 업데이트 run 43022196810에서 발견한 Windows harness의 이전 버전 기대값 누락을 보정한다. Stage 5 전체 수용은 후속 실제 업데이트 증거가 완료된 뒤 판정한다.

## 산출물

- Windows workflow의 초기 설치 ExpectedVersion을 0.1.1에서 0.1.2로 보정.
- 선택한 공개 입력의 n/next 버전과 초기 설치·최종 검증 기대값을 함께 대조하는 회귀 검사.

## 본문 변경 정도 / 본문 무손실 여부

공개 제품·tag·11개 파일·서명·Pages·manifest는 그대로다. 기존 실패 기록과 이전 버전 fixture는 보존한다. Windows 검증 workflow의 잘못된 기대값만 수정한다.

## 검증 결과

- 최초 harness: `a6abc1b0da3925a20695821f210a0a675252aabf`.
- [최초 run 43022196810](https://github.com/postmelee/alhangeul-tauri/actions/runs/43022196810)의 NSIS job 130527879199은 공개 입력·서명 검증을 통과했다. v0.1.2 설치는 exit 0, 실제 DisplayVersion 및 실행 파일 ProductVersion/FileVersion 모두 0.1.2였다. workflow가 0.1.1을 요구해 `DisplayVersion이 다릅니다.`로 중단했다. 실제 update apply/verify는 실행되지 않았다.
- NSIS cleanup exit 0 및 WebView2 policy 복구 성공. 원시 artifact 13855736878, ZIP SHA256 `943722c8a4c1b6594f743f80ff79d9d81cdb92625d068b3fa1a4c3a277be07ae`를 독립 다운로드해 검산했다.
- `node --test tests/production-upgrade-workflows.test.mjs tests/production-upgrade-v013.test.mjs`: 20/20 통과.
- `git diff --check`: 통과.

## 잔여 위험

Windows 실제 업데이트는 아직 수용되지 않았다. 같은 형식의 NSIS·MSI를 수정한 exact harness로 다시 실행하고 설치 후 버전·설정·문서·정리 증거를 확인해야 한다. Linux 실행은 영향이 없어 계속 진행한다.

## 다음 단계 영향

fast 계약과 Windows-only production-upgrade-check로 검증한다. 성공한 Linux evidence는 원래 harness와 run으로 별도 보존한다. 서로 다른 harness를 하나의 전체 성공 run으로 기록하지 않는다.

## 승인 기록

“등록하고 릴리즈 완료까지 계속 진행해줘.”의 범위에서 검사기 오류를 보정한다. 제품·키·지원 범위 변경 없이 검증을 계속한다.
