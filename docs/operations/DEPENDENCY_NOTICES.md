# 배포 의존성 고지

앱 설치 폴더의 `licenses/Alhangeul-LICENSE.txt`는 제품 소스 라이선스,
`licenses/fonts/`는 번들 글꼴의 개별 저작권·원문 고지,
`licenses/dependency-notices.zip`은 고정 의존성에서 확보한 원문 고지 묶음이다.
다른 프로젝트의 코드를 제품의 MIT 라이선스로 다시 허가하지 않는다.

## 재생성과 범위

Python 3.11 이상과 PyYAML이 있는 환경에서 저장소의 고정 rhwp checkout을 준비한 뒤
`python3 scripts/privacy/collect-dependency-notices.py`를 실행한다. crate archive는 네 native
Cargo.lock 및 bundled WASM의 원본 `third_party/rhwp/Cargo.lock`에 기록된 SHA-256,
JavaScript archive는 pnpm-lock.yaml의 integrity와 대조한다. WASM 원본 lock 자체의 hash도
`rhwp-core.lock`의 고정 출처와 일치해야 한다. native 잠금 파일만으로 WASM 의존성을 대신하지 않는다.
archive의 코드는 실행하지 않으며 고지 이름의 일반 파일만 보존한다. ZIP의 시간은 고정한다.
고정 rhwp의 LICENSE·THIRD_PARTY_LICENSES·vendor·licenses 고지도 포함한다.
archive에 원문 고지가 없는 Rust 항목은 `assets/licenses/upstream-notice-sources.json`을
참조한다. crate checksum·Cargo repository·배포 archive의 VCS commit이 일치하고 해당
commit의 원문 URL과 고정 hash가 맞는 경우에만 보완한다. 원문 출처를 ZIP inventory에 남긴다.
타스크별 요약 JSON이 필요하면 `--evidence <경로>`를 명시한다. 기본 실행은 과거 타스크
증거 파일을 덮어쓰지 않는다.

ZIP의 inventory는 build/dev/optional 및 실제 지원 target에 링크되지 않는 패키지를 포함하는
superset이다. 실제 배포 SBOM이나 라이선스 조합 적합성 판정으로 사용하지 않는다.
`notice filename not found; review required`는 원문 고지를 찾지 못한 항목이다. 이를 고지가
불필요하다는 뜻으로 해석하지 않는다. 실제 target/feature별 closure와 소스 header·README·
해당 버전의 upstream 원문을 대조해 남은 항목을 해결한 뒤 릴리스 적합성을 판단해야 한다.

native artifact CI는 지원 OS에서 `collect-native-notice-closure.mjs`를 실행해 실제 target으로
필터링한 Cargo 기본 feature·normal dependency graph를 별도 artifact에 남긴다. build/dev 전용
edge는 제외하지만 procedural macro와 feature 통합의 영향은 남으므로 바이너리 SBOM으로
해석하지 않는다. 각 제품 root의 package와 ZIP inventory의 누락 목록을 교차 확인하는 자료다.

폰트 파일별 대응은 [FONTS.md](../../assets/fonts/FONTS.md)를 따른다. 고지 보존과 폰트의
원본 대응·예약 이름·렌더링 수용은 각각 확인한다. 고정 의존성 변경 뒤에는 고지 묶음과
설치 산출물의 포함 여부를 다시 검증한다.
