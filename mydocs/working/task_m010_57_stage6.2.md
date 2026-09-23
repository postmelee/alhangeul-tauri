# Task #57 Stage 6.2 완료 보고 — 앱 썸네일 진단·조건부 안내 UI

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 6.2
작성일: 2026-09-20

## 단계 목적

독립 PowerShell 도구 없이 Windows 앱에서 동의 기반 진단·형식별 결과·조건부 MSI 안내와
정제 요약 복사를 제공한다. 일반 사용자 VDI에서 발견한 진단 오류와 모달 배치·복사 가시성도
보정했다. 본 보고서는 순차 승인·게시된 후보 결과를 종합하며 기존 커밋을 재작성하지 않는다.

## 산출물

| 파일/경계 | 변경 요약 |
|---|---|
| Studio `core/desktop-thumbnail-diagnostics*.ts` | 명시 bridge, 상태/취소/늦은 응답 관리, allowlist 요약 |
| Studio `ui/thumbnail-diagnostics-*.ts`, `about-dialog.ts`, `style.css` | Windows native 전용 진입점, 결과 위계·조건부 MSI 안내, 중앙 모달·고정 footer 복사 피드백 |
| Studio `tests/thumbnail-diagnostics*` | 실제 upstream CSS를 포함한 DOM·레이아웃·clipboard 성공/실패/재시도 회귀 |
| native `thumbnail_diagnostics/commands.rs`, `ui_service*.rs` | 동의·창 소유권·취소와 같은 native service 연결 |
| native `shell_path.rs`, `install_*.rs`, `process*.rs` 및 회귀 | Shell 경로·설치 식별·진단 실행/증거 오류 보정. 세부 승인·원격 이력은 구현계획 보존 |

## 본문 변경 정도 / 본문 무손실 여부

설치 정책은 NSIS 사용자별·MSI 시스템 범위를 유지한다. 엔진·한컴 버전 분기·UserChoice·
UAC·제3자 등록 보정은 추가하지 않았다. 실제 API 실패와 진단 불완전/미검사를 구분한다.
복사 성공은 Clipboard API 완료 후에만 표시하고 실패 시 같은 정제 요약의 수동 복사를 제공한다.
스크린샷·개인 문서·사용자 경로는 저장소에 추가하지 않았다.

## 검증 결과

```sh
pnpm run test:studio
pnpm run test:automation
pnpm run test:upstream
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

- `d36294a` 게시 전 Studio 27파일/166건, automation 959건, upstream 36건, build,
  boundary 626파일 및 diff 통과. 기존 build chunk/import 경고는 남는다.
- 실제 DOM 회귀: 1280×800, 900×600, 480×640 모두 통과. 준비/부분/전체 성공,
  상세 펼침·취소·닫기·미완료 표시·오프라인 안내, 복사 대기/성공/실패/재시도·중복 방지·
  닫힌 창의 늦은 응답·타이머 정리를 확인했다. 성공 전후 모달/버튼/스크롤 위치를 유지한다.
- 브라우저는 합성 native/clipboard와 실제 UI/CSS다. 실제 클립보드를 덮어쓰지 않았으며
  화면 읽기 도구 속성 확인은 실제 스크린리더 사용성 시험과 구분한다.
- 사용자가 VDI `29a25c4`에서 실제 썸네일·HWP/HWPX 진단 통과·중앙 배치를 확인했다.
  이후 복사 피드백 화면을 승인하고 해당 UI 변경만의 VDI 재설치 검증을 생략했다.
- `d36294ac92b66e52bbe27d76ddf6d72ed8f8e8a8`의
  [full 35482436949](https://github.com/postmelee/alhangeul-tauri/actions/runs/35482436949/attempts/1) 성공.
  설치별 실제 결과와 제품 bytes 범위는 [Stage 6.3](task_m010_57_stage6.3.md)을 따른다.

## 잔여 위험

- 브라우저 DOM은 Windows WebView2·모든 DPI 검증이 아니다. 최신 복사 피드백은 VDI 재설치 생략 범위다.
- VDI 성공은 PC방 NSIS 제한 해결이나 모든 한컴·Windows 조합 보장이 아니다.
- MSI 대안 안내는 같은 빌드 파일의 존재·다운로드·조직 설치 권한을 보장하지 않는다.

## 다음 단계 영향

추가 UI·실험을 확대하지 않고 6.3의 후보/현장 근거 및 최종 보고에 연결한다.
#58의 선택 설치·활성화 설정은 구현하지 않았다.

## 승인 요청

사용자는 UI·full 결과 확인 뒤 최종 보고와 PR 정리를 승인했다. 본 단계 기록을 PR에서
리뷰하며 merge·이슈 close·릴리즈는 별도 승인/절차를 따른다.
