# README 배지 Stage 1 보고서

GitHub Issue: [#90](https://github.com/postmelee/alhangeul-tauri/issues/90)
구현계획서: [task_m010_90_impl.md](../plans/task_m010_90_impl.md)
Stage: 1

## 단계 목적

제목 아래에서 공개 릴리즈·포함 rhwp·지원 플랫폼·라이선스를 빠르게 확인하도록 안내한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| README.md | 기존 제목 아래 배지 4개와 링크, 5행 추가 |

## 본문 변경 정도 / 본문 무손실 여부

배지 블록만 추가했다. 블록을 제거한 결과와 시작 origin/devel README bytes가 동일하다.
기존 안정 버전 텍스트·다운로드·이미지·기여·출처 안내는 보존했다.

## 검증 결과

- git diff --check: OK.
- 네 배지 GET: 모두 HTTP 200, image/svg+xml. SVG title을 실제 확인했다.
  Alhangeul: v0.1.0 / bundled rhwp: v0.8.6 / platform: Windows | Linux / license: MIT.
- 공개 안정 릴리즈 v0.1.0은 draft=false, prerelease=false다.
- lock의 v0.8.6과 rhwp 배지 alt·표시값·릴리즈 tag 링크가 일치한다.
- 일회성 Node assert: `README badges: 4; bundled rhwp: v0.8.6; original body preserved`.

## 잔여 위험

외부 배지 서비스·GitHub 캐시가 표시를 지연할 수 있다. 기존 버전 텍스트를 유지했다.
현재 단계는 배지 삽입이며 기존 updater의 갱신 규칙은 Stage 2에서 보완한다.

## 다음 단계 영향

README 전체 rhwp 배지를 관리 marker로 추가해 pin·표시·링크의 동기화 정합성을 검증한다.

## 승인 범위

요청된 작은 README 보완 범위 내 Stage 1을 완료했다. 계획된 관리 참조 검증을 이어간다.
