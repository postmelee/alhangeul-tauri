# Task #57 Stage 6.3 완료 보고 — 패키지·VDI·최종 통합 수용

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 6.3
작성일: 2026-09-20

## 단계 목적

진단 기능의 실제 설치본 검증과 일반 사용자 VDI 관측을 연결하고, 승인된 최소 범위로
#57을 마무리한다. 전체 사용자 NSIS나 독립 재검산 고도화를 새 완료 조건으로 추가하지 않는다.

## 산출물

| 파일/경계 | 변경 요약 |
|---|---|
| `scripts/windows-thumbnail-app-*.ps1`, 대응 `tests/` | 설치 앱의 native suite·source·원시 probe·정리 결과 대조, 실행/pipe/응답/식별 반례 |
| `alhangeul-windows-smoke.yml`, `alhangeul-artifact-platform.yml` | 격리 설치별 앱 진단 및 Windows/Linux native·package 검사 |
| `docs/architecture/WINDOWS_THUMBNAILS.md` | 앱 진단 사용법·개인정보·복사·조건부 MSI 안내 및 수용 한계 |
| `docs/releases/v0.1.0.md` | 최신 제품 SHA/run·VDI 범위 갱신, 과거 실패·No-Go 보존 |
| 단계/최종 보고·계획·오늘할일 | 재조정 범위와 검증 완료/후속 리뷰 상태 |

## 본문 변경 정도 / 본문 무손실 여부

제품 후보까지 승인된 native/검사 보정을 반영했다. 마지막 보고 커밋은 문서만 바꾸며
제품·workflow·lock·site 공개 상태는 바꾸지 않는다. 문서 위치는 수행계획의 기존 경로다.
지원 묶음에 복사되는 안내 문서의 새 내용은 향후 build부터 적용되며 기존 archive는 불변이다.
과거 원시 실패를 소급 성공으로 고치지 않았고 #67 참고 구현을 수용된 gate로 표시하지 않았다.

## 검증 결과

제품 source: `d36294ac92b66e52bbe27d76ddf6d72ed8f8e8a8`.
[CI 35482436949 / attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/35482436949/attempts/1),
`ci.yml`, `profile=full`, `scope=full`, `thumbnail_context_experiment=false`, 결과 **success**.

| 계층 | 관측 |
|---|---|
| fast | Windows PS·Node/Studio 계약 모두 성공 |
| native/package | Windows x64·Linux x64/arm64 build와 세 플랫폼 core 모두 성공 |
| MSI 일반 (`106006018200`) | raw exit 0/실패 0, thumbnail/lifecycle passed; 앱 HWP/HWPX thumbnail-api-ok, cleanup=true |
| NSIS (`106006018199`) | raw exit 1/실패 12, thumbnail not-accepted; hosted-nsis-diagnostic 계약과 lifecycle 통과 |
| 강제 MSI (`106006018216`) | raw exit 1/실패 1, thumbnail passed; reboot-required/post-reboot-unverified 계약 통과 |
| 최종 gate | 설치 집계 `106006429996`, 전체 결과 `106006479904` 성공 |

별도 native profile/installer reuse/PDF cleanup job은 이번 full에서 선택하지 않은 경로라 skipped다.
full 하위 fast·native 검사 성공과 구분한다. 환경 실험은 의도적으로 실행하지 않았다.
작은 설치 진단 artifact를 내려받아 `installer-evaluation.json`·`installer-evaluation-io.json`
및 MSI `app-diagnostic.json`을 확인했다. 세 평가/IO status는 passed다. 독립 replay를 실행한 것은 아니다.

| artifact | ID | API archive SHA-256 (`sha256:` 생략) |
|---|---|---|
| Windows bundle | 10597265864 | 826329c1914bbbf0553e2b6abcec0240ac3296bdcb1a704aec9ab5cf0d61d964 |
| NSIS 진단 | 10597011766 | 4a8123443bac3f7931d249e4f1d41636e2dcaa7250c6c0657c230b6432dc23ee |
| MSI 진단 | 10596217980 | 565bc8a635a5aca39f1298d222a37486c77ac8d9669548d5ea74315a853460bf |
| 강제 MSI 진단 | 10596782255 | 15709b5f78335298a187d933cdf34508b29190bfb062a387b05604782b7a8834 |

조회 당시 expired=false이며 가용성을 계속 보장하지 않는다. 위 digest는 API 기록이며 이번
분석에서 제품 archive를 내려받거나 압축 bytes hash를 독립 재계산하지 않았다. 실제 재사용은
run/attempt/ID/digest·만료·inventory를 다시 검증해야 한다.

### VDI 및 마지막 UI 변경의 수용

- `3e3934b4ea95cadd4863927ad01d7c11e2d3b951`: 사용자가 실제 썸네일과 앱 진단 성공을 보고했다.
- `29a25c47b8b3b32a01fe06bcdc0bf41c3fc6584d`: full `35475617032` 성공 후 NSIS VDI에서
  중앙 배치 및 진단/썸네일에 문제없다고 확인했다. 사용자 정제 JSON은 HWP/HWPX
  thumbnail-api-ok, evidenceValid/thumbnailPassed/cleanup=true다.
- VDI는 일반 사용자·EnableLUA=1·사용자별 등록이다. 이전 PC방은 EnableLUA=0·승격 상태로
  차이가 있으나 UAC 하나로 모든 실패 원인을 확정하지 않는다.
- `d36294a`: 이후 복사 피드백 UI만 보정. 3개 창 크기 DOM 검증과 사용자 스크린샷 승인을
  받았고 사용자 결정으로 추가 VDI 재설치는 생략했다. 이를 최신 installer 실설치로 표시하지 않는다.
- 사용자 개인 화면·원본 첨부는 저장소/PR에 재게시하지 않는다. 정제 결과와 동의 범위만 기록한다.

### 문서-only 최종 정합화

관련 release/CI/지원 묶음 Node 회귀 113건, release metadata, 상대 링크/앵커 48개와 diff를
확인해 모두 통과했다. 세부 명령/범위는 최종 보고서에 기록했다. 마지막 문서 commit을
새 native 빌드 성공으로 표시하지 않는다.

## 잔여 위험

PC방 유사 NSIS 환경 지원·모든 한컴/Windows 조합·MSI 재부팅 후 상태는 여전히 미검증/미해결이다.
공개 릴리즈에는 실제 게시 bytes의 설치·서명·승인·게시 후 대조가 별도로 필요하다.
CI 성공은 릴리즈 Go가 아니며 #67 독립 재검산은 첫 릴리즈 필수 조건이 아니다.

## 다음 단계 영향

소스 변경이나 full 재실행을 늘리지 않고 최종 보고서와 `devel` 대상 PR로 인계한다.
이슈 close·merge·배포·#58/#67 구현은 이번 단계에서 실행하지 않는다.

## 승인 요청

사용자가 full 결과를 확인한 뒤 최종 보고·PR 정리를 승인했다. 보고서·PR 리뷰와 merge 승인을 요청한다.
