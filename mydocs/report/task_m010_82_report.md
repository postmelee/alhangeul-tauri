# Task #82 최종 보고서

GitHub Issue: [#82](https://github.com/postmelee/alhangeul-tauri/issues/82)
마일스톤: M010

## 작업 요약

3단계로 실제 OS 화면을 확보하고 공개 사이트의 다운로드 안내와 이미지 전환을 개선했다.
제목은 두 줄, 버전은 release.json의 최신 버전으로 표시한다. 사용자 검토에 따라 중복 배포
설명은 제거하고 배열 기반 다운로드 행을 유지했다. OS 전환 시 제목 위치를 고정했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| site/ HTML·CSS·JS·assets | 배포 배열, 안내 위계, OS 화면 쌍과 hover/focus/클릭 | 공개 웹사이트 |
| scripts/site-capture/, tests/gui/ | 고정 8개 샘플과 네이티브 촬영 | 촬영 도구 |
| .github/workflows/ | 수동 site-capture 모드 | 촬영 CI |
| tests/pages*, site-capture, actions-workflows | 회귀 검사 | 검증 |
| mydocs/ | 계획·단계 보고·완료 기록 | 내부 작업 문서 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 사용자 사이트 | site/ | site/ | OK | 승인된 기존 사이트 |
| 계획·단계·최종 보고 | mydocs/plans, working, report | 동일 | OK | 수행계획 문서 위치 판단 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 홈에서 사용하는 실제 OS 이미지 | Linux 앱 1개 | Windows/Linux 앱·탐색기 4개 |
| 탐색기 샘플 | 없음 | OS별 8개 |
| 제목 줄 수 | 3 | 2 |
| 최종 관련 자동 검사 | 해당 없음 | 71 tests 통과 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 실제 화면과 원본 보존 | OK — Stage 1 hash 및 촬영 run |
| 공개 상태·exact 다운로드 계약 | OK — Pages fixture 회귀 |
| OS 전환·키보드·레이아웃 | OK — 이벤트 회귀 및 실제 브라우저 ArrowRight/Enter·좌표 확인 |
| 좁은 화면 | OK — 390px iframe 육안 확인, 실제 기기 제외 |
| hover·touch 분기 | OK — 이벤트 단위 회귀, 실제 장치 미검증 |
| 모션 감소 | OK — CSS 코드 검토, 설정을 켠 브라우저 실행 미검증 |
| 제품 경계 | OK — origin/devel 대비 src-tauri/third_party/release.json 불변 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_82_stage1.md): 실제 Windows/Linux 캡처와 원본 hash.
- [Stage 2](../working/task_m010_82_stage2.md): 디자인·hover·배치 사용자 검토 반영.
- [Stage 3](../working/task_m010_82_stage3.md): 71 tests, build/check, TypeScript, shellcheck/actionlint.

## 잔여 위험과 후속 작업

### 잔여 위험

실제 터치/스크린리더/복수 브라우저 및 모션 감소 실행 검증은 하지 않았다. 최종 hover는
도구의 hover API 제약으로 이벤트 회귀까지만 검증했다. 최종 PR CI는 게시 후 확인해야 한다.
이미지 생성/촬영 CI의 성공을 최종 PR CI 성공으로 간주하지 않는다.

### 후속 작업 후보

PR 검토·병합 및 별도 승인된 exact SHA Pages 배포. #69 범위는 이 보고에서 완료하지 않는다.
배포 target 자체를 늘릴 때에는 배열 외 기존 release 스키마도 함께 확장해야 한다.

## 작업지시자 승인 요청

Stage 3 진행 지시에 따라 최종 보고와 PR을 게시한다. 검토 후 병합·운영 배포 승인을 요청한다.
