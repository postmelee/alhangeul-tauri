# Alhangeul

Alhangeul은 Windows와 Linux에서 HWP/HWPX 문서를 열고 편집하기 위한 Tauri 기반 오픈소스 데스크톱 앱입니다. 문서 파싱과 렌더링은 [rhwp](https://github.com/edwardkim/rhwp)를 사용하고, 이 저장소는 데스크톱 셸과 파일·창·인쇄 같은 제품 통합을 소유합니다.

> 현재 소스의 제품 버전은 독립 Alhangeul의 M010 기준선인 `0.1.0`입니다. 공식 설치 파일, 태그나 공개 릴리스는 아직 제공하지 않습니다.

## 현재 기능

- HWP/HWPX 문서 열기
- HWP/HWPX 문서 저장, 다른 이름으로 저장과 형식 변환 저장
- 현재 편집 상태의 페이지 SVG를 이용한 직접 PDF 저장
- 시스템 인쇄 (Issue #15 보정 merge와 새 exact-SHA 수용 전에는 공개 후보 범위에서 제외)
- 파일 드래그 앤 드롭과 파일 연결
- 여러 창에서 문서 열기
- Linux DEB/RPM에서 HWP/HWPX 첫 페이지 파일 관리자 썸네일

HWPX 저장과 직접 PDF 저장은 소스·플랫폼 중립 test/build와 이전 Windows/Linux exact 후보에서 확인했고, Windows 직접 PDF의 한글 검색·선택·복사도 확인했습니다. 현재 PR 보정 뒤의 새 exact-SHA 후보와 Issue #15의 시스템 인쇄 보정은 다시 수용해야 하므로 아직 공개 릴리스 완료로 간주하지 않습니다. upstream Studio의 브라우저 autosave/recovery는 상속하지만 별도 native recovery 저장소는 제공하지 않으며, native 원본 저장의 외부 파일 변경 감지도 같은 후속 수용 대상입니다.

Windows Explorer HWP/HWPX 첫 페이지 썸네일은 source와 hosted Windows x64 자동 gate에서 COM activation, MSI·NSIS 등록·복원과 실제 Shell bitmap 반환까지 확인했습니다. Explorer 보기 크기·DPI·cache 갱신과 한컴 설치 환경의 수동 UI 수용은 아직 남아 있으므로 현재 공개 기능이나 설치 파일 완료로 간주하지 않습니다. 구조와 검증 경계는 [Windows thumbnail 아키텍처](docs/architecture/WINDOWS_THUMBNAILS.md)를 참고하세요.

Linux 첫 페이지 썸네일은 exact-SHA package candidate에서 x64 DEB/RPM의 설치·업데이트·rollback·제거, arm64 DEB lifecycle·직접 PNG와 x64 DEB의 Nautilus·Thunar/Tumbler를 자동 검증했습니다. package가 설치한 system MIME 정의만 사용해 실제 HWP/HWPX의 서로 구분되는 첫 페이지, cache hit·mtime 갱신과 손상 문서 icon fallback까지 확인했습니다. Linux arm64 RPM/GUI, Fedora RPM GUI, KDE/Dolphin, AppImage registration, Flatpak과 Snap은 현재 범위가 아닙니다. 구조와 정확한 지원 matrix는 [Linux thumbnail 아키텍처](docs/architecture/LINUX_THUMBNAILS.md)를 참고하세요.

## 지원 범위

- Windows x64
- Linux x64
- Linux arm64

GitHub Actions는 활성 상태이며 CI와 Windows/Linux native artifact workflow는 수동 `workflow_dispatch` 전용입니다. exact commit의 native build smoke는 검증했지만 14일 보존 Actions artifact는 공식 설치 파일이나 공개 릴리스가 아니며, workflow는 자동 배포하지 않습니다.

## 개발 시작

Node.js 24, Corepack, Rust stable과 대상 운영체제의 Tauri 2 시스템 의존성이 필요합니다.

```sh
git submodule update --init --recursive
corepack enable
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

지원 플랫폼에서 데스크톱 개발 서버를 실행합니다.

```sh
pnpm tauri dev
```

자세한 구조와 검증 명령은 [개발 문서](docs/DEVELOPMENT.md)를 참고하세요.

## 의존성과 출처

- 지속 upstream: [edwardkim/rhwp](https://github.com/edwardkim/rhwp)
- 현재 Stable pin: `v0.8.4` (`496333b27d21ddb9114ba9ae340bcb895870c9a7`)
- 기계 검증 가능한 pin과 artifact 출처: [rhwp-core.lock](rhwp-core.lock)
- 의존 경계와 갱신·rollback 절차: [UPSTREAM.md](docs/architecture/UPSTREAM.md)
- 초기 코드와 자산 출처: [PROVENANCE.md](docs/architecture/PROVENANCE.md)

License: MIT
