# Stage 2 — 제품 글꼴 수명주기와 PDF 스냅샷

GitHub Issue: [#144](https://github.com/postmelee/alhangeul-tauri/issues/144)
구현계획서: [task_m010_144_impl.md](../plans/task_m010_144_impl.md)

## 단계 목적

upstream이 참조하는 제품 어댑터의 조판 활성화 및 글꼴 프로그램 해제 API를 구현한다.

## 산출물

호스트 조판은 명시적으로 opt-in한 연결에서만 활성화한다. 해제 시 재사용한 layout 바이트만 지우고 메타데이터와 일반 글꼴 요청은 보존한다. 이미 시작한 다른 요청을 취소하지 않고, 늦은 응답은 해제된 캐시를 복구하지 않는다. 제품 WASM으로 실제 HWP/HWPX 스냅샷을 다시 열고 같은 페이지의 SVG, 종료, 재종료와 교체를 확인하는 검증을 늘렸다.

## 검증 결과

현행 v0.9.0 pin의 실제 제품 WASM을 사용해 HWP 6쪽과 HWPX 10쪽 SVG의 동등성, dispose 및 재열기·교체를 검사했다. host transport의 기본 비활성/명시적 활성, layout 해제, 일반 읽기 및 catalog 보존을 검증했다. 후보 v0.9.1의 정확한 Studio 소스에서도 현행 WASM을 사용한 재현 대상 테스트가 통과했다. mock만 수정하거나 해제 오류를 무시하지 않았다.

## 잔여 위험 / 다음 단계 영향

후보의 WASM/Studio 동시 갱신과 네이티브 수용성은 별도 제품 CI에서 검증한다.
