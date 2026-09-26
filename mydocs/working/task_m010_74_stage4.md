# Task #74 Stage 4 완료보고 — 설치본 글꼴 수용과 지원 경계

GitHub Issue: [#74](https://github.com/postmelee/alhangeul-tauri/issues/74)
구현계획서: [task_m010_74_impl.md](../plans/task_m010_74_impl.md)
Stage: 4, 2026-09-26

## 단계 목적

선택 지속과 실제 글꼴 공급을 Windows/Linux 설치본에서 확인하고 발견한 제품 결함을 보정한다.
2026-09-26 작업지시자가 #74 검증 정리·반영과 후속 v0.8.6 수용 진행을 명시했다.
최종 Windows 통합 점검은 작업지시자가 후속 새 설치본에서 수행하는 것으로 경계를 기록한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `local-font-entry-hooks.ts` | 보기 무효화 후 CanvasKit 로컬 Typeface 재공급 |
| native `font_names.rs`, `font_catalog*.rs` | 실제 full name·한글 별칭 보존, 동일 파일 canonical 경로 통합 |
| Studio `local-font-records.ts`, `local-fonts.ts` | 다국어 record 통합, 정확한 face 우선, 선택 파일 bytes 공급 |
| `tests/gui/local-fonts/`, `specs/local-fonts.e2e.ts` | 공개 fixture와 native/Studio 회귀, 두 renderer·새 창·재시작 설치본 관측 |
| `alhangeul-linux-gui.yml`, artifact handoff helper | 성공한 exact CI 설치본 재사용과 집중 GUI scope |
| `LOCAL_FONTS.md`, `UPSTREAM.md`, `acceptance.json` | 소유 경계와 수행한 수용 범위·실패 이력 보존 |

## 본문 변경 정도 / 본문 무손실 여부

upstream v0.8.4 source와 pin을 유지했다. native 허용 root·제한 family·TTC/가변 지원 범위를
확대하지 않았다. 공식 OFL 테스트 파일만 저장하며 사용자 이메일·개인 화면은 커밋하지 않았다.
Abel `iii` 문단 폭 맞춤 차이는 upstream 범위로 남겼다.

## 검증 결과

| 주제 | 실행/근거 | 결과 |
|---|---|---|
| 플랫폼 중립 | product-boundary, upstream, Studio, build, fixture | 664 파일 경계, upstream 36, Studio 233, fixture 3 통과·build 성공 |
| 전체 native/설치 | [full 36104289925](https://github.com/postmelee/alhangeul-tauri/actions/runs/36104289925), product/workflow `a2f48b5` | Windows/Linux 3 target core/product/package·필수 집계 성공 |
| 실제 글꼴 이름 | Windows native 189개, Linux arm64 187개 | NanumSquareB full name·한글 별칭·중복 스캔 회귀 포함 성공 |
| Windows 화면 | 2026-09-26 사용자 보고 | 나눔스퀘어·Abel 설치 후 재감지와 실제 적용 성공 |
| Linux 화면 | [GUI 36222469761](https://github.com/postmelee/alhangeul-tauri/actions/runs/36222469761), harness `8d4d8a1` | 24 화면, 6회 프로세스 재시작, 4개 새 창 시나리오 성공 |
| 실제 공급 | CanvasKit 사용·재감지·복구·새 창 | localTypefaceCount=1, unregisteredFontFallbacks=0; 삭제/미사용은 direct Typeface=0 |
| 내보내기 | GUI HWP/HWPX를 내려받아 WASM으로 재열기 | Abel 이름·공개 본문 보존 |
| harness 보강 | `pnpm run typecheck:gui`, `pnpm run test:gui:contracts`, boundary | 타입 통과, 계약 19개 통과 |
| exact bytes | archive digest와 내부 inventory source/size/hash, Linux GUI handoff | Windows 로컬 verifier 통과·Linux 설치 DEB provenance 일치 |

실패 이력과 수정 근거는 구현계획과 acceptance.json에 보존했다. 과거 실패를 소급 성공으로
바꾸지 않았다. 새 창은 별도 native window handle과 동일 앱 프로세스를 확인했고, 프로세스
재시작은 PID 교체로 구분했다. PNG를 직접 검토했다.

## 잔여 위험

- MSI 일반 설치는 raw passed. NSIS 썸네일 0x80040154(12건)와 강제 재설치 3010(1건)는 raw failed이며 진단 계약만 통과했다.
- Windows 최종 통합 후보의 새 창·재실행은 사용자 후속 점검에 남는다. Linux arm64 GUI·모든 글꼴·출력 경로를 수용한 것은 아니다.
- 사용 안 함은 직접 공급 중단이며 OS CSS 글꼴 조회 차단이 아니다.

## 다음 단계 영향

현재 수정 범위를 devel에 반영한 뒤 별도 이슈에서 v0.8.6을 수용한다. 새 core/Studio/WASM
후보는 다시 full·GUI를 검증하며 이번 제품 bytes의 성공을 자동 이전하지 않는다.

## 승인 기록

2026-09-26 작업지시자의 순차 진행 지시에 따라 최종 보고·PR·devel 반영으로 진행한다.
공개 release/tag·서명·updater 게시는 포함하지 않는다.
