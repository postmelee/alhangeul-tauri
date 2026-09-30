# 모바일 보조 안내 Stage 5 보고서

GitHub Issue: [#90](https://github.com/postmelee/alhangeul-tauri/issues/90)
구현계획서: [task_m010_90_impl.md](../plans/task_m010_90_impl.md)
Stage: 5

## 단계 목적

사용자가 승인한 모바일 보조 안내 배치를 적용하고 실제 미리보기를 제공한다.

## 산출물

| 파일·작업 | 변경 요약 |
|---|---|
| site/index.html | 모바일 홈 다운로드·설치 안내 아래 macOS 보조 링크 |
| site/updates/index.html·feedback/index.html | 모바일 푸터의 같은 보조 링크 |
| site HTML 3개·styles.css | v90-5 cache, 520px 이하 한 행 헤더, 데스크톱 상호 링크 유지 |
| scripts/check-product-boundary.mjs·기존 테스트 2개 | exact 안내 문장·위치와 변경 URL/지원 표현/다른 경로 거부 |
| 계획·최종 보고·orders | 승인·문서 위치·수용 결과 정리 |
| macOS 기존 세션 | 같은 모바일 안내 방향과 기존 CI 수정 요청 전달 |

## 본문 변경 정도 / 본문 무손실 여부

Stage 4 대비 세 HTML에서 header class·cache key를 되돌리고 모바일 안내 줄과 푸터
줄바꿈을 제거하면 이전 bytes와 동일하다. README·rhwp 관리 updater·pin·제품·workflow·
release.json·다운로드 JS·showcase 자산은 변경하지 않았다.
경계 검사 302 LOC, 기존 두 테스트 301 LOC다. 수행계획서에 기록한 exact 안내 데이터와
기존 거부 사례 보완으로 권장 상한을 1~2행 초과하며 역할·API는 그대로 유지한다.

## 검증 결과

```sh
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/product-boundary.test.mjs
pnpm run check:product-boundary
git diff --check
```

- Pages build source 16/root assets 2, source=16/output=19 check 통과.
- Pages·제품 경계 테스트 64/64, product-boundary 730 files 통과.
- 홈 보조 안내는 install-panel 안에 1개, 하위 페이지는 footer 안에 1개만 존재한다.
  승인 안내 외 제품 지원 표현·변경 목적지·다른 소스 경로는 계속 거부한다.
- 실제 브라우저 iframe 320/390px 홈에서 한 행 헤더·설치 안내 아래 보조 링크가 잘리지 않는다.
  320px 홈·업데이트·문의, 520px 홈 헤더의 세 메뉴와 브랜드가 한 행이다.
  521px 홈은 상호 링크를 포함한 네 메뉴가 한 행이고 모바일 안내는 숨겨진다.
- 1280px 홈 헤더 높이 52px, 네 링크 y=3.5/height=44, 모바일 안내 높이 0이다.
  Windows → Linux 전환 전후 h1 y=176이 유지되고 AppImage·DEB/RPM·arm64 DEB 링크가 정상이다.
- 보조 링크 목적지는 Stage 4에서 실제 클릭 검증한 같은 공개 홈페이지다.
- release.json bytes와 stable.json SHA-256
  e3c27ee429063ae12d0f12e7188f5ee2a3e498104963900889501228caba88d1이 유지된다.
- 모바일 미리보기 screenshot을 /private/tmp/task90-mobile-preview.png에 저장했다.
  임시 iframe HTML 두 개를 제거하고 output=19 check를 재확인했다.
- 기존 macOS 세션에 같은 모바일 배치 방향을 전달했고 즉시 상태 조회에서 active를 확인했다.
  해당 작업·CI 완료는 기다리지 않았다.

## 잔여 위험

모바일은 실제 브라우저 iframe viewport 검증이며 물리 기기 검증은 아니다.
변경은 로컬 미리보기와 devel 대상 PR까지 반영한다. 공개 사이트 배포는 별도 지시 사항이다.

## 다음 단계 영향

PR #91을 최신 결과·exact head로 갱신하고 사용자에게 모바일 미리보기를 보여준다.

## 승인 요청

요청된 배치·검증·미리보기를 완료했다. 병합과 공개 main·Pages 반영은 별도 지시를 따른다.
