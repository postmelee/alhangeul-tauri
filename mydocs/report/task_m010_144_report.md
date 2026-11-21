# 최종 보고서 — rhwp v0.9.1 후보 동기화 호환성

GitHub Issue: [#144](https://github.com/postmelee/alhangeul-tauri/issues/144)
구현계획서: [task_m010_144_impl.md](../plans/task_m010_144_impl.md)

## 결과

Windows/Linux Alhangeul의 호환성 브랜치에 v0.9.1 Studio 초기화 훅의 취소 처리와 제품 호스트 글꼴 조판·프로그램 정리 API를 추가했다. 현재 사용하는 v0.9.0 pin과 기존 후보 자동화의 변경 경로 제한은 그대로 뒀다.

## 변경 사항

- 서명과 취소 검사 위치를 고유하게 식별한다. 취소 또는 빠른 교체 뒤 오래된 문서 글꼴 준비가 활성화나 뷰 갱신을 하지 않도록 문서 세대와 신호를 같이 확인한다.
- 조판은 선택적으로 활성화하고 조판용 재사용 바이트만 해제한다. 카탈로그·일반 읽기·사용자 설정은 보존한다.
- HWP/HWPX 실제 WASM 스냅샷에 SVG 동등성 이후 종료, 재종료, 재열기·교체 검증을 추가했다.

## 검증

- v0.9.0 정확한 제품 pin: committed pin, 제품 경계, upstream 39/39, Studio 295/295, TypeScript와 Vite build.
- v0.9.1 exact Studio 소스에 v0.9.0 WASM을 연결한 재현 시험: 관련 44/44.
- 실행하지 못한 검증: v0.9.1 exact WASM의 전체 후보 검증, Windows/Linux native bundle·실행. PR 필수 검사 및 독립 검토로 확인할 범위다.
- 작업 브랜치에서 pin 변경, 후보 게시, merge, 제품 배포·서명은 수행하지 않았다.

## 후속

기존 후보 발행 제한을 유지한다. 검증 완료된 호환성 PR과 별개로, exact v0.9.1 후보를 기존 동기화 경로에서 재검증한다.
