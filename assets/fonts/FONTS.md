# 번들 폰트

Alhangeul은 Studio UI·문서 표시와 PDF fallback에 사용할 수 있는 재배포 가능 폰트만 번들에 포함한다.
저작권 제한이 있는 한컴, Microsoft, OS 기본 폰트 파일은 포함하지 않는다.

## PDF fallback OTF

PDF용 OTF는 원본 release의 KR subset Regular 파일을 변환하거나 개명하지 않고 포함한다. Rust
PDF font database에만 적재하며 편집기의 authoring font 목록에는 노출하지 않는다.

| 파일 | 버전·출처 | SHA-256 | 저작권·라이선스 |
| --- | --- | --- | --- |
| `pdf/NotoSansKR-Regular.otf` | [notofonts/noto-cjk `Sans2.004`](https://github.com/notofonts/noto-cjk/blob/Sans2.004/Sans/SubsetOTF/KR/NotoSansKR-Regular.otf) | `69975a0ac8472717870aefeab0a4d52739308d90856b9955313b2ad5e0148d68` | Copyright 2014–2021 Adobe. Noto is a trademark of Google Inc. `licenses/NotoSansKR-OFL-1.1.txt` |
| `pdf/NotoSerifKR-Regular.otf` | [notofonts/noto-cjk `Serif2.003`](https://github.com/notofonts/noto-cjk/blob/Serif2.003/Serif/SubsetOTF/KR/NotoSerifKR-Regular.otf) | `5ea012e15cb7eacc1f680aee1703f3b164791b1443ea3e52b65080cca5d179cf` | Copyright 2017–2024 Adobe. Noto is a trademark of Google Inc. `licenses/NotoSerifKR-OFL-1.1.txt` |

두 파일은 SIL OFL 1.1 원본이며 폰트 자체를 단독 판매하지 않는다. OTF는 desktop executable의 PDF
fallback으로 포함되고, 배포 bundle의 `licenses/fonts/`에는 이 manifest와 대응 license 원문이 함께
들어간다. 다른 형식으로 변환하거나 수정한 파생 폰트는 이 목록에 추가하지 않는다.

## Windows thumbnail fallback TTF

Windows thumbnail worker는 `rhwp`가 생성한 첫 페이지 SVG에 설치된 원본 글꼴이 없을 때 한글
glyph를 보존하도록 pinned `third_party/rhwp`의 다음 TTF를 변환·개명 없이 executable에 포함한다.

| 파일 | 버전·출처 | SHA-256 | 저작권·라이선스 |
| --- | --- | --- | --- |
| `ttfs/opensource/NotoSansKR-Regular.ttf` | `rhwp` v0.8.2, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c` | `6e06a7fe5d696ca719894a23f36bb2b1be8c816a5937cd4ad0f23ca67780dd74` | Copyright 2014–2021 Adobe, Reserved Font Name `Source`. `licenses/NotoSansKR-OFL-1.1.txt` |
| `ttfs/opensource/NotoSansKR-ExtraLight.ttf` | `rhwp` v0.8.2, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c` | `67b4003e2be99ea44a7c957e4b35acde1b5e6e82a54fe195c5598c3c617bc2e3` | Copyright 2014–2021 Adobe, Reserved Font Name `Source`. `licenses/NotoSansKR-OFL-1.1.txt` |

두 TTF는 SIL OFL 1.1이며 폰트 자체를 단독 판매하지 않는다. 배포 bundle에는 이 manifest와 기존
Noto Sans KR OFL 원문이 함께 들어간다. 일회성 thumbnail worker는 1,500 ms cold-start 한도를
지키기 위해 system font directory를 스캔하지 않고 두 파일만 process-local font database에
등록한다. 이 경계는 desktop editor·PDF의 system font 해석 규칙과 별개다.

## Studio 웹폰트

| 파일 | 라이선스 | 출처 |
| --- | --- | --- |
| `Pretendard-*.woff2` | SIL OFL 1.1 | Pretendard |
| `NotoSansKR-*.woff2` | SIL OFL 1.1 | Google Fonts |
| `NotoSerifKR-*.woff2` | SIL OFL 1.1 | Google Fonts |
| `NanumGothic-Regular.woff2` | SIL OFL 1.1 | Google Fonts |
| `NanumMyeongjo-Regular.woff2` | SIL OFL 1.1 | Google Fonts |
| `NanumGothicCoding-Regular.woff2` | SIL OFL 1.1 | Google Fonts |
| `GowunBatang-Regular.woff2` | SIL OFL 1.1 | Google Fonts |
| `GowunDodum-Regular.woff2` | SIL OFL 1.1 | Google Fonts |
| `D2Coding-Regular.woff2` | SIL OFL 1.1 | Naver D2 Coding |
| `LatinModernMath-Regular.woff2` | GUST Font License | Latin Modern Math |
| `SpoqaHanSans-Regular.woff2` | SIL OFL 1.1 | Spoqa Han Sans |
| `Cafe24*.woff2` | Cafe24 무료 폰트 라이선스 | Cafe24 |
| `Happiness*.woff2` | 행복고흥 무료 폰트 라이선스 | 행복고흥 |
