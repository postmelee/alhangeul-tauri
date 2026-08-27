# Task #24 Stage 4 보고서 — Windows x64 v0.8.4 GUI 수용 확정

GitHub Issue: [#24](https://github.com/postmelee/alhangeul-tauri/issues/24)
구현계획서: [`task_m010_24_impl.md`](../plans/task_m010_24_impl.md)
Stage: 4

## 단계 목적

Stage 3 exact SHA `88baa5666ec55bf043844bae01ec4d422278851c`의 Windows x64
bundle을 실제 Windows VDI에서 실행해 rhwp v0.8.4 전체 Studio 갱신 뒤 HWP/HWPX
열기·저장, drag-in, 중앙 정렬, searchable PDF, system print와 한글 UI에 회귀가
없는지 판정한다. Installer별 증거는 VDI 권한 경계와 Stage 3 자동 package smoke를
구분해 기록한다.

## 산출물

| 파일·증거 | 변경·결과 요약 |
|---|---|
| `mydocs/plans/task_m010_24_impl.md` | 관리자 권한이 없는 Windows VDI에서는 Stage 3 MSI 자동 smoke와 NSIS 전체 GUI 수용을 결합하되 MSI 수동 GUI로 확대하지 않는 승인 기준을 기록했다. |
| Windows x64 NSIS 수동 수용 | 작업지시자가 2026-08-13 Windows x64 VDI에서 Stage 4 전체 GUI 시나리오의 성공을 확인했다. |
| [Desktop Artifact Build #31688732973](https://github.com/postmelee/alhangeul-tauri/actions/runs/31688732973) | 같은 exact SHA의 MSI·NSIS package smoke와 Windows x64 build 성공을 MSI 설치 경로의 자동 증거로 계승했다. |
| `mydocs/orders/20260813.md` | Stage 4 완료와 Stage 5 승인 대기 상태로 갱신했다. |

### Installer별 수용 증거

| Installer | 환경·증거 | 판정 |
|---|---|---|
| NSIS `Alhangeul_0.1.0_x64-setup.exe` | 관리자 권한이 없는 Windows x64 VDI에서 clean install, 앱 실행, 전체 대표 문서 GUI 시나리오와 uninstall을 작업지시자가 직접 확인 | OK |
| MSI `Alhangeul_0.1.0_x64_en-US.msi` | VDI에는 관리자 권한이 없어 수동 설치 미실행. Stage 3 fresh `windows-2025` runner에서 clean install, 제한 실행, HWP/HWPX handler·shortcut·기존 기본 연결 보존과 uninstall cleanup 자동 smoke 통과 | OK — package-level 자동 수용, 수동 GUI 미실행 한계 명시 |

MSI와 NSIS의 Stage 3 inventory SHA-256은 각각
`4861eae6a0bb08b072888dcf652e6eea3121735f167016cf61e5b19dfa1ee652`와
`a24f3e1331a25226bc1d543709a13133743fab662a3dfd747c0a15d84959667e`이며,
이번 GUI 수용은 이 exact candidate의 NSIS를 대상으로 했다.

## 본문 변경 정도 / 본문 무손실 여부

- 제품 코드, bundled Studio, workflow와 artifact에는 변경이 없다.
- 구현계획서는 작업지시자가 승인한 installer 증거 분리 기준 한 항목만 추가했다.
- NSIS 수동 결과를 MSI 수동 GUI 결과로 확대하지 않고 자동 package 증거와 명시적으로
  분리했다.

## 검증 결과

수행 항목:

```text
Stage 3 Windows artifact와 exact SHA 고정
NSIS clean install -> 앱 실행 -> 전체 GUI smoke -> uninstall
대표 HWP/HWPX 파일 선택·drag-in·저장·다른 이름 저장·재열기
최초 문서 중앙 정렬, toolbar 초기 상태와 한글 dialog 표시
직접 PDF 쪽 수와 한글 검색·선택·복사
별도 Alhangeul preview 없는 system print 진입
Microsoft Print to PDF 저장·취소·반복과 editor·상태 lifecycle 복원
Stage 3 MSI clean install·제한 실행·association·uninstall 자동 smoke 대조
```

결과:

- OK — NSIS clean install, 실행과 uninstall을 Windows x64 VDI에서 완료했다.
- OK — HWP/HWPX를 파일 선택과 drag-in으로 열었고 최초 중앙 정렬, toolbar 초기 상태,
  한글 dialog 표시가 정상이다.
- OK — 현재 형식 저장과 HWP/HWPX 다른 이름 저장 뒤 재열기에서 문서 상태 회귀가 없다.
- OK — 직접 PDF의 쪽 수가 문서와 일치하고 한글 검색·선택·복사가 가능하다.
- OK — system print는 별도 Alhangeul preview 없이 Windows 인쇄 대화상자로 진입하고,
  Print to PDF 저장·취소·반복 뒤 editor와 상태 lifecycle이 복원된다.
- OK — MSI는 같은 exact SHA의 Stage 3 자동 package smoke에서 설치·제한 실행·등록·제거
  계약을 통과했다.
- MISS — VDI 관리자 권한 부재로 MSI 수동 설치와 MSI 경유 GUI는 실행하지 않았다.
- OK — `git diff --check` 통과.

## 잔여 위험

- MSI 수동 GUI는 확인하지 않았다. 동일한 제품 실행 파일의 GUI 기능은 NSIS에서
  수용했고 MSI 고유 설치 동작은 Stage 3 자동 smoke로 보완했지만, 관리자 권한이 있는
  실제 Windows 사용자 환경의 MSI 체감 수용을 대신하지는 않는다.
- Windows x64 VDI 한 환경의 대표 수용이며 Windows 10/11 조합, enterprise policy,
  physical printer와 모든 WebView2 runtime을 대표하지 않는다.
- Windows GUI E2E 자동화 장치는 아직 없어 이번 수용은 작업지시자 수동 결과에 의존한다.

## 다음 단계 영향

- Stage 4 판정은 제한사항을 명시한 Go이며 실행 가능 SHA
  `88baa5666ec55bf043844bae01ec4d422278851c`를 Stage 5 Linux x64 수용 입력으로
  계승한다.
- Stage 5는 Linux x64 AppImage·DEB·RPM 중 실제 사용 bundle과 환경을 기록하고,
  HWP/HWPX 저장·PDF·system print·toolbar·한글 UI를 같은 대표 경계로 검증한다.
- Windows GUI E2E 자동화는 Task #24 완료 뒤 별도 이슈로 등록·구현하며, 이번 Stage에서
  workflow나 test dependency를 추가하지 않는다.

## 승인 요청

- Stage 4 산출물과 제한사항 포함 Go 판정을 승인하면 Stage 5 Linux native·GUI 수용과
  공식 증적 확정으로 진행한다.
