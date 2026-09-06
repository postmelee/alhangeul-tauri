# Task #57 Stage 4 보고서 — Windows 썸네일 문서·회귀 수용과 #58 인계

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 4
검증일: 2026-09-07 (KST)
작업 브랜치: `local/task57`, 분리 worktree: `.claude/worktrees/task57`
상태: 승인된 문서·회귀·인계 완료 — #57 잔여 수용 범위 판단 대기

## 단계 목적

Stage 3 보고 커밋 `503fb17` 뒤 작업지시자가 “진행해줘”로 승인한 문서 정합화·플랫폼 중립
회귀·#58 인계를 수행한다. 이미 검증한 진단 도구의 상태를 바로잡되 NSIS 제품 실패와
현장 미검증을 보존한다. 이번 완료는 이 한정된 범위의 수용이며 #57 전체 해결이 아니다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md` | 진단 묶음 CI 검증 완료와 실제 사용자 PC 미검증 구분 |
| `docs/architecture/WINDOWS_THUMBNAILS.md` | exact SHA·run의 진단 결과, 실패/현장 한계·동일 run 사용 |
| `docs/operations/DESKTOP_RELEASE.md` | 진단 gate와 제품 gate 분리, 실패 run 사용 제한·archive 불변성 |
| `docs/operations/RELEASE_CHECKLIST.md` | 연결/COM/API·scope·묶음 해시·설치 lifecycle·재부팅 확인 항목 |
| `docs/releases/v0.1.0.md` | #57 run·archive 식별자와 결과 추가, 과거 #9 결정과 비공개 상태 보존 |
| 수행·구현계획서, `mydocs/orders/20260907.md`, 본 보고서 | 승인·검증 결과·현장 미실행 matrix·#58 설계 제약 |

## 본문 변경 정도 / 본문 무손실 여부

승인된 공식 문서 5곳의 위치를 유지하고 새 공식 문서 루트를 만들지 않았다. 역사적 VDI 성공과
#9 공개 준비 판단·11개 공개 asset 계약은 보존했다. “Windows 실검증 전”인 현재 안내만
검증된 후보의 CI 수용/현장 미검증으로 바로잡았다. 이전 단계 보고서는 수정하지 않았다.
제품 소스·설치·등록·검증기·workflow·pin·lock·site 공개 데이터와 다른 작업은 변경하지 않았다.

### Windows 근거 재사용

- native 검증 source: `f1cdd0711f747b443c723a750f868faa5c0349f1`.
- 근거: [run 34056210236](https://github.com/postmelee/alhangeul-tauri/actions/runs/34056210236),
  attempt 1, Windows x64 artifact, `run_tests=true`, `publish_release=false`.
- 세 job의 진단 검증은 성공, NSIS 제품 실패와 MSI 강제 교체의 재부팅 필요로 전체 run은 failure.
  MSI 일반 설치/재설치/제거와 실제 문서 Shell/강제 추출은 성공했다.
- 현재 작업본과 native SHA의 diff는 README·docs·mydocs 문서뿐이다. 실행 코드·workflow와
  installer bytes를 바꾸지 않았으므로 재빌드하지 않았다. 이 보고 commit은 native 검증 SHA가 아니다.
- 같은 run의 검증된 bundle/support archive·실제 DLL/worker·installer hash와 원시 증거는
  [Stage 3 보고서](task_m010_57_stage3.md)에 고정되어 있다. 재다운로드·새 파일 생성 없이 재사용했다.
  archive 내부의 과거 문서도 manifest와 함께 그대로 보존한다.
- 실패 run을 공개 입력으로 쓰거나 표시를 성공으로 바꾸지 않았다. 임시 artifact 보존 기간 후
  새 bytes를 만들면 별도 검증이 필요하며 이번 결과를 그대로 승계할 수 없다.

## 검증 결과

실행 명령:

```sh
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

| 검사 | 결과 |
|---|---|
| product boundary | 통과, 405 files scanned |
| automation | 560 passed, 0 failed, 0 skipped |
| upstream | 36 passed, 0 failed, 0 skipped |
| Studio | 24 test files, 132 tests passed |
| Studio build | 통과, 230 modules transformed; 혼합 static/dynamic import·500 kB 초과 chunk 경고 보존 |
| diff / 변경 범위 | 통과; 승인된 문서만 변경, native source 동일 |
| 문서 링크·상태 | 변경 문서 9개, 상대 링크/앵커 87개 검사 통과; 현행 안내의 이전 미검증 표현 제거 확인 |

실행 출력은 로컬 `/private/tmp/task57-stage4-{boundary,automation,upstream,studio,build}.log`에
보존했다. 문서 상대 링크·새 앵커와 검증 상태도 읽기 전용으로 대조했다. 플랫폼 중립 명령만
현 호스트에서 실행했으며 PowerShell/C#·Rust/Tauri·실제 support 패키징은 실행하지 않았다.
추가 원격 조회·push·Actions dispatch·Windows 현장 시험·재부팅도 하지 않았다.

## 잔여 위험

NSIS 사용자별 등록과 Shell 문맥의 호환성 가설은 남아 있지만 단일 원인이 확정되지 않았다.
한컴 버전별 분기·UAC 해제·자동 HKLM 등록을 해결책으로 도입하지 않는다.
NSIS 전체 사용자 설치는 **추가 검증·별도 설계 승인 필요**이며 채택/불필요 확정이 아니다.

### 현장 수용 matrix — 모두 미실행

| 대상 | 필요한 비교와 증거 | 진입 조건 |
|---|---|---|
| Windows 10/11 일반 로그인 | Explorer 대표 보기의 실제 이미지와 같은 문서의 API/강제 추출·JPG 대조 | 전용 시험 환경·범위 승인, 일반 사용자 세션 |
| 실제 한컴 2022/2024·VDI | 설치 순서·권한·등록 scope·OS 조건을 기록해 성공/실패 비교; 버전만으로 인과 단정 금지 | 합법적으로 설치된 한컴 환경·사용자 동의; 기존 VDI 성공 근거 보존 |
| NSIS→MSI 수동 전환 | 같은 run의 설치본·지원 묶음으로 NSIS 관측→정상 제거→MSI 설치→일반 Explorer 재확인 | 저장·앱 종료·공개 비민감 fixture, 대상/명령 승인; 교차 updater·중복 설치 금지 |
| MSI 3010 이후 | 사용자 재부팅 후 새 process·DLL hash·실제 Shell·OS 지연 표식 확인 | 전용 환경과 재부팅 권한 승인; 재부팅 전 bitmap/제거 0을 완료로 대체 금지 |

진단은 문서 처리기를 실행하며 썸네일 캐시가 남을 수 있다. 명시적 동의·비민감 공개 fixture를
사용하고 보안 정책 우회·전역 캐시 삭제·원본/개인정보 업로드를 하지 않는다. 현장 결과 전에는
CI API 성공을 Explorer 시각 수용이나 모든 한컴·일반 사용자 환경 성공으로 표현하지 않는다.

## 다음 단계 영향

### #58 인계 — 구현·이슈 수정 아님

| 설계 경계 | 인계 조건 |
|---|---|
| 설치/등록/실제 동작 | 구성요소 설치됨·등록 활성·실제 API 결과를 분리. 미포함은 DLL/worker가 실제 없고, 비활성은 파일 유지·등록 해제 |
| scope와 권한 | NSIS HKCU 사용자별, MSI HKLM 시스템 전체. 다른 사용자 영향과 관리자 동의를 명시하며 앱 전체 상시 승격 금지 |
| 등록 소유권 | Alhangeul 소유 상태만 조건부 해제·복원. UserChoice 강제 변경·나중의 제3자 값 덮어쓰기 금지 |
| 취소/거부/부분 실패 | 오류를 보존하고 실제 상태 재조회. 등록 명령·토글 성공만으로 썸네일 정상 표시 금지 |
| update/repair 선택 보존 | 포함 여부와 활성화 선호를 각각 보존. 숨은 재추가·자동 활성화 금지 |
| 제거·잠금 | 포함→미포함은 등록 해제 뒤 파일 제거. 3010·지연 삭제·재부팅 대기와 실제 완료를 구분 |
| 수용 기준 | #57 probe·분류·fixture 계약 재사용. “포함+활성에서 실제 Shell 생성”은 NSIS 제한 때문에 아직 미충족 가능; 기준 완화 금지 |

상태 schema·기본값·권한 helper는 #58 자체 계획에서 승인받는다. 현재 인계는 자동 다운로드·
Preview Handler·MSI↔NSIS 교차 updater·한컴 처리기 탈취를 승인하지 않는다.

## 승인 요청

- Stage 4의 문서·회귀·인계 결과를 검토하고 잔여 현장 수용과 NSIS 지원 판단을 #57에
  유지할지, 별도 후속 범위로 분리할지 결정해 달라. 미검증을 해결 완료로 바꾸지 않는다.
- 이번 단계로 #57 전체 완료·이슈 close·최종 보고·PR을 자동 진행하지 않는다.
  새 이슈 등록, 현장 실행, 제품 수정 및 #58 착수는 해당 범위의 별도 승인을 따른다.
