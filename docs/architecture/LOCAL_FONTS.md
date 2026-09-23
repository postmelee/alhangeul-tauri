# 로컬 폰트 해석 규칙

Alhangeul은 `third_party/rhwp`를 수정하지 않고 desktop shell과 studio host adapter에서 로컬 폰트 해석을 소유한다.

## 목표

- 실제 OS 설치 폰트가 있으면 Alhangeul 번들 substitute보다 우선한다.
- 지원된 로컬 파일 기반 폰트는 저장소나 배포물에 번들하지 않고 editor와 PDF export에서 같은 규칙으로 해석한다.
- proprietary 폰트 바이너리를 업로드, 로그 출력 또는 번들링하지 않는다.

## 해석 순서

1. system-installed 폰트
2. 지원된 file-backed 폰트
3. Alhangeul 번들 substitute 폰트

`apps/desktop/src-tauri/src/font_catalog.rs`가 native font catalog와 추가 스캔 root를 소유한다. PDF는
system·file-backed font 뒤에 `assets/fonts/pdf/`의 Noto Sans/Serif KR Regular를 마지막 fallback으로
적재한다. `apps/studio-host/src/core/font-loader.ts`는 upstream loader를 그대로 다시 내보내며,
`local-fonts.ts`와 분리된 provider·record adapter만 native catalog를 읽어 webview에 필요한
file-backed 폰트를 `FontFace`로 등록한다.

## 지원 스캔 root

기본 system font directory는 `fontdb.load_system_fonts()`에 맡긴다. 추가 스캔은 Alhangeul이 소유하는 제한된 root만 허용한다.

- Linux: `~/.local/share/fonts`, `~/.fonts`, 필요 시 `/mnt/c/Windows/Fonts`
- Windows per-user: `%LOCALAPPDATA%/Microsoft/Windows/Fonts`

`%ProgramFiles%/Hnc/Office*/HOffice*/Shared/TTF` 같은 Windows Hancom vendor root는 의도적으로 스캔하지 않는다. proprietary Hancom/Human 폰트명을 참조하는 문서는 Alhangeul substitute 폰트로 렌더링하지만 해당 로컬 vendor 폰트 바이너리를 authoring 폰트로 노출하지 않는다.

## 보안과 라이선스 경계

- font bytes는 현재 머신에서만 읽고 editor webview 등록에만 사용한다.
- file-backed font read는 지원 root 내부와 허용 확장자(`ttf`, `otf`, `ttc`, `otc`, `woff`, `woff2`)로 제한한다.
- proprietary font path나 bytes를 telemetry, log 또는 artifact에 남기지 않는다.
- proprietary Hancom/Human family name은 authoring 목록에서 제외하고 새 서식이나 HTML 붙여넣기에서는 Alhangeul-safe substitute family로 정규화한다.
- 저장소에는 오픈 라이선스 substitute 폰트만 유지한다.
- PDF용 OTF는 공식 release의 unmodified KR subset만 사용하고 `assets/fonts/FONTS.md`에 source tag,
  SHA-256, 저작권, OFL 원문 위치를 기록한다.

## Editor / PDF 일관성

- editor: `list_local_fonts`와 `read_local_font` Tauri command로 system-installed/file-backed 폰트를 구분하고 필요할 때 lazy load한다.
- PDF export: `font_catalog::create_pdf_font_database()`로 같은 추가 스캔 root를 공유하고, 페이지 SVG를 임시 저장하기 전에 제한 폰트 family를 안전한 serif/sans fallback으로 바꾼다. system CJK font가 없는 환경에서도 번들 Noto Sans/Serif KR을 generic 기본값으로 사용해 `<text>`를 유지한다.
- generic `monospace`도 최소 환경의 CJK 글리프 누락을 막기 위해 마지막에는 번들 Noto Sans KR로 해석한다. 이는 coverage fallback이며 고정폭 metric이나 monospaced 시각 fidelity를 보장하지 않는다. 문서가 명시한 설치 폰트와 지원된 file-backed 폰트는 이 fallback보다 우선한다.
- PDF text: `svg2pdf`의 `embed_text: true`를 먼저 사용한다. 변환 자체가 실패할 때만 같은 SVG를 `embed_text: false`로 다시 변환하며, 결과를 `outlined-fallback`으로 표시하고 사용자에게 경고한다.

PDF 변환 전에는 원본 SVG의 내용 있는 `<text>` 수와 `usvg` tree의 text·glyph를 비교한다. font 해석
중 text가 사라지거나 `.notdef` glyph가 남으면 target을 쓰지 않고 명시적으로 실패한다. searchable
결과에 text가 있으면 PDF의 `ToUnicode` mapping도 확인하며, mapping이 없을 때만 기존
`outlined-fallback` 경고 경로를 사용한다.

Studio UI는 기존 `NotoSansKR-Regular.woff2`를 system UI font chain의 마지막 fallback으로 사용한다.
이는 최소 Linux의 메뉴·리본·모달 글자 깨짐을 막는 제품 chrome 보정이며 upstream 문서 글꼴,
CanvasKit loader, authoring 목록에는 관여하지 않는다.

검색·선택 가능한 텍스트와 font subset의 실제 결과, 제한 폰트 대체의 시각 정합은 Windows/Linux exact-SHA native 검증 대상이다. 플랫폼 중립 test는 searchable 경로 우선, 명시적 fallback과 경고 계약만 보증하며 실제 PDF 수용을 대신하지 않는다.
