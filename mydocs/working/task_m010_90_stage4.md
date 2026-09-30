# 홈페이지 상호 안내 Stage 4 보고서

GitHub Issue: [#90](https://github.com/postmelee/alhangeul-tauri/issues/90)
구현계획서: [task_m010_90_impl.md](../plans/task_m010_90_impl.md)
Stage: 4

## 단계 목적

추가 요청한 ‘알한글 for macOS’ 홈페이지 링크와 별도 macOS 세션 작업 전달을 완료한다.

## 산출물

| 파일·작업 | 변경 요약 |
|---|---|
| site/index.html·updates/index.html·feedback/index.html | 공통 헤더에 macOS 홈페이지 링크, stylesheet cache v90-4 |
| site/styles.css | 링크 nowrap, 520px 이하 브랜드·nav 두 행, 320px에서도 브랜드 이름 유지 |
| scripts/check-product-boundary.mjs | 승인된 링크 줄만 source/output의 세 HTML 경로에 허용 |
| tests/pages-design.test.mjs·product-boundary.test.mjs | 기존 메뉴/경계 계약과 exact-line 예외의 거부 사례 검증 |
| 새 macOS 프로젝트 세션 | 실제 pin·rhwp 배지 유지관리·반대 링크 구현·검증·PR 요청 전달 |
| 계획·최종 보고·orders | 최종 사용자 안내 범위와 수용 결과 갱신 |

## 본문 변경 정도 / 본문 무손실 여부

세 HTML은 추가 링크와 stylesheet cache key만 달라졌고 두 변경을 제거하면 Stage 3 원문과
bytes가 동일하다. README·rhwp 관리 updater·pin·제품·workflow·release 데이터·다운로드 JS·
showcase 자산은 Stage 3 이후 변경하지 않았다. 사이트 CSS는 헤더 범위만 보완했다.
boundary script 299 LOC, 관련 테스트 296/297 LOC로 파일 권장 상한을 지킨다.

## 검증 결과

```sh
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/product-boundary.test.mjs
pnpm run check:product-boundary
git diff --check
```

- Pages: source 16 + root assets 2 build, source=16/output=19 check 통과.
- Pages·제품 경계 테스트 61/61 통과. 링크 원문·허용 경로 이외 제품 표현·변경 목적지·다른
  소스 경로를 계속 거부한다. boundary check는 730 files scanned로 통과했다.
- 1280px 실제 홈페이지에서 헤더 링크 4개와 macOS 정확한 href를 확인했다.
- 320px 홈·업데이트·문의, 520px/521px 홈의 실제 iframe viewport 렌더링에서
  브랜드·네 링크가 잘리지 않고 두 행/한 행 분기가 정상인 것을 screenshot으로 확인했다.
- Linux 선택 시 AppImage·DEB/RPM·arm64 DEB 안내가 표시되고 기존 exact installer URL을 유지했다.
- 새 macOS 링크를 실제 클릭해 해당 홈페이지의 ‘Mac에서 … 이방인’ hero로 이동했다.
- site/release.json은 원문 동일, output stable.json SHA-256은 기존과 같은
  e3c27ee429063ae12d0f12e7188f5ee2a3e498104963900889501228caba88d1이다.
- 임시 viewport preview HTML을 제거한 뒤 output=19 check를 다시 확인했다.
- 등록명 rhwp-mac의 origin이 postmelee/alhangeul-macos인 것을 확인하고 새 세션 생성·
  요청 전달·active 상태를 확인했다. macOS 저장소 구현은 해당 세션이 담당한다.

## 잔여 위험

모바일 검증은 실제 브라우저 iframe viewport이며 물리 기기 검증으로 확대하지 않는다.
공개 홈페이지는 아직 새 소스를 배포하지 않았다. 별도 macOS 작업의 병합·배포도 각 세션 승인 사항이다.

## 다음 단계 영향

PR #91의 제목·본문을 최종 범위와 exact head로 갱신한다. 병합·main 반영·Pages 배포는 별도 지시를 따른다.

## 승인 요청

추가 요청한 구현·검증·세션 작업 전달을 완료했다. PR 검토·병합과 공개 반영 지시를 기다린다.
