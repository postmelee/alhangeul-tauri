# Task #70 최종 보고서 — 첫 공개 전 updater 키 교체·복구·서명 검증

GitHub Issue: [#70](https://github.com/postmelee/alhangeul-tauri/issues/70)
마일스톤: M010

## 작업 요약

- 대상 이슈 #70, 4단계 구현·검증 완료. PR 게시 승인 대기이며 이슈 close·merge는 미실행이다.
- 복구 가능한 새 updater 키로 공개키와 Secret을 전환하고 실제 Windows/Linux 서명을 검증했다.
- 보관 책임자는 사용자다. 암호화 원본·iCloud 백업과 암호 앱 항목을 유지한다.
- 검증 source: `70fa1dd407ec4abcbe3cf496f7ec01aee884377c`.
- 현재 공개 fingerprint: `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`.
- 본 보고는 #69의 선행 키 준비 완료 근거다. 공개 릴리즈나 모든 환경 설치 성공을 뜻하지 않는다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/desktop/src-tauri/tauri.updater.conf.json` | 새 공개키 | updater 신뢰 기준 |
| `scripts/check-release-metadata.mjs` | 새 fingerprint 고정 | release metadata 검사 |
| `tests/release-metadata.test.mjs` | 기대값·이전 정상 형식 키 거부 회귀 | key drift 방지 |
| `docs/operations/DESKTOP_RELEASE.md` | 현재 fingerprint | 운영 정책 |
| `docs/architecture/UPDATER.md` | 현재 fingerprint | 배포 신뢰 계약 |
| #70 plans/working/report 및 날짜별 orders | 승인·검증·인계 기록 | 내부 운영 |

GitHub release 환경의 `TAURI_SIGNING_PRIVATE_KEY`와 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`를
사용자 로컬 입력으로 교체했다. 제품 version·endpoint·native·설치 로직·lock·workflow는 그대로다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| DESKTOP_RELEASE.md | docs/operations | docs/operations | OK | 기존 운영 문서 단일 값 보정 |
| UPDATER.md | docs/architecture | docs/architecture | OK | Stage 1 후 승인한 신뢰 계약 정합화 |
| 내부 보고 | mydocs 역할별 폴더 | plans/working/report/orders | OK | 수행계획서의 내부 기록 경계 |

`docs/releases/v0.1.0.md`는 #69 미커밋 변경과 겹치므로 여기서 수정하지 않았다.
공개 후보가 확정될 때 #69가 키 준비 근거를 연결한다. 새 공식 문서 루트는 만들지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 현재 키 복구 가능성 | 기존 키 복구 미확인 | 새 백업 복구 서명·변조 거부 확인 |
| 선택 Node 회귀 | 68개 | 69개, 모두 통과 |
| 새 키 실제 installer 서명 검증 | 0종 | MSI·NSIS·AppImage 3종 |
| 새로 게시한 Release/tag | 0 | 0 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 보관·복구 | OK — 사용자 백업 복구 확인 및 공개 서명의 독립 검증 |
| 암호 보관 정합성 | OK — 저장 암호 불일치 발견·수정 후 동일 입력으로 로컬 서명 검증·Secret 재등록 |
| 공개키·계약 | OK — version/metadata 검사와 69개 Node 회귀 |
| 빠른 CI | OK — [35681649719 attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/35681649719/attempts/1) |
| full CI | OK — [35683014919 attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/35683014919/attempts/1), 선택 필수 계약 성공 |
| 미게시 서명 CI | OK — [35683016977 attempt 2](https://github.com/postmelee/alhangeul-tauri/actions/runs/35683016977/attempts/2) |
| 다운로드 무결성·서명 | OK — ZIP digest 3개, installer 서명·hash 3종, complete inventory 재계산 일치 |
| 비밀·기존 작업 보존 | OK — 비밀 미추적, #69 diff 불변, 과거 기록 보존 |
| 게시 경계 | OK — publish skipped, Release/tag 없음 관측, Pages 게시 미실행 |

archive ID/digest·크기·installer hash·서명 producer 시각은
[Stage 3 보고](../working/task_m010_70_stage3.md)의 표로 고정한다.
attempt 1의 키 복호화 실패를 삭제하거나 소급 통과시키지 않았다. 수정 후 attempt 2가 별도로 성공했다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_70_stage1.md): 보관 책임·숨김 입력·실행 승인 경계 확정.
- [Stage 2](../working/task_m010_70_stage2.md): 백업 복구 서명·변조 거부와 임시본 정리 확인.
- [Stage 3](../working/task_m010_70_stage3.md): 공개키 전환·암호 보정·CI 및 실제 bytes 독립 검증.
- [Stage 4](../working/task_m010_70_stage4.md): 문서 정합성·범위 보존 및 #69 인계 준비.

## 잔여 위험과 후속 작업

### 잔여 위험

- 백업과 암호 앱의 동일 계정 의존 및 암호 재사용 위험은 남는다. 비밀값은 보고하지 않는다.
- 과거 키를 신뢰하는 시험 설치본은 새 후보 재설치가 필요하다. production N→N+1 성공은 미검증이다.
- full의 NSIS/MSI 재설치 계약 통과를 모든 환경 썸네일 성공·재부팅 후 성공으로 확대하지 않는다.
- ordinary 산출물과 signed 산출물은 같은 source의 별도 build다. 파일이 동일하다고 간주하지 않는다.
- artifact는 만료될 수 있다. 재사용 시 정확한 ID/digest/만료 및 bytes를 다시 확인한다.

### #69 인계 순서

1. #70 PR 리뷰·merge 후 원래 #69 미커밋 변경을 보존하여 devel을 통합한다.
2. #69 Stage 1의 키 준비 차단은 이 보고로 해소한다. 설치 환경·검증표 미확정은 별도로 결정한다.
   관리자 없는 VDI의 NSIS 확인과 MSI·Linux 지원 환경 수용을 혼동하지 않는다.
3. #69 준비 checkpoint PR 및 devel→main release PR을 거쳐 최종 main SHA를 승인받는다.
   여기의 검증 SHA를 최종 공개 SHA로 자동 지정하지 않는다.
4. #69 기존 계획대로 최종 후보의 일반·서명 산출물에서 6종 installer·총 11 asset을 확정하고,
   게시할 바로 그 bytes를 검증한다. 사용자 직접 설치 확인은 최종 산출물 단계에 모은다.
5. 별도 공개 승인 후 같은 파일을 게시·원격 대조하고, 사이트/manifest 전환도 별도 승인한다.

#58은 릴리즈 후, #67 고도화는 후속 범위를 유지한다. 이번 키 문제 때문에 새 CI 체계나
추가 제품 기능을 선행 요구하지 않는다. Stage 3 이후는 문서-only이므로 동일 full을 반복하지 않았다.
새 최종 source의 검증과 기존 artifact 재사용의 차이는 #69에서도 유지한다.

## 작업지시자 승인 요청

- 최종 보고 승인 후 `publish/task70` 갱신 및 devel 대상 Open PR 게시를 진행한다.
- PR 리뷰·merge, #69 재개, 첫 릴리즈 공개는 별도 승인이다. 이 보고로 자동 실행하지 않는다.
