# Alhangeul

Alhangeul은 Windows와 Linux에서 HWP/HWPX 문서를 열고 편집하기 위한 Tauri 기반 오픈소스 데스크톱 앱입니다. 문서 파싱과 렌더링은 [rhwp](https://github.com/edwardkim/rhwp)를 사용하고, 이 저장소는 데스크톱 셸과 파일·창·인쇄 같은 제품 통합을 소유합니다.

> 현재 소스의 제품 버전은 독립 Alhangeul의 M010 기준선인 `0.1.0`입니다. 공식 설치 파일, 태그나 공개 릴리스는 아직 제공하지 않습니다.

## 현재 기능

- HWP/HWPX 문서 열기
- HWP/HWPX 문서 저장, 다른 이름으로 저장과 형식 변환 저장
- 현재 편집 상태의 페이지 SVG를 이용한 직접 PDF 저장
- 시스템 인쇄
- 파일 드래그 앤 드롭과 파일 연결
- 여러 창에서 문서 열기
- Windows MSI/NSIS에서 Explorer HWP/HWPX 첫 페이지 썸네일
- Linux DEB/RPM에서 HWP/HWPX 첫 페이지 파일 관리자 썸네일
- Windows MSI/NSIS·Linux x64 AppImage의 동일 설치 형식 updater (구현·시험 수용 완료, production 미공개)

HWP/HWPX 저장·재열기, 직접 PDF와 시스템 인쇄는 `rhwp v0.8.4`의 Windows NSIS·Linux x64 DEB 대표 환경에서 확인했습니다. native 저장에는 외부 원본 변경 감지·덮어쓰기 확인이 있으며, upstream Studio의 브라우저 autosave/recovery와 별개로 native recovery 저장소는 제공하지 않습니다. 검증된 과거 후보와 새 공개 파일의 수용은 구분합니다.

Windows 썸네일은 MSI·NSIS 등록·복원과 실제 Shell bitmap, VDI 대표 화면의 시각 수용 근거가 있습니다. 모든 Explorer 보기 크기·DPI·한컴 조합을 검증한 것은 아닙니다. 구조와 범위는 [Windows thumbnail 아키텍처](docs/architecture/WINDOWS_THUMBNAILS.md)를 참고하세요.

Linux 썸네일은 x64 DEB/RPM·arm64 DEB의 package lifecycle과 x64 DEB의 Nautilus·Thunar/Tumbler를 확인했습니다. package가 설치한 system MIME만 사용한 실제 문서의 첫 페이지·cache 갱신·손상 문서 fallback도 확인했습니다. Fedora RPM GUI·arm64 GUI 수용과 AppImage 파일 관리자 등록은 이 결과에 포함되지 않습니다. 자세한 matrix는 [Linux thumbnail 아키텍처](docs/architecture/LINUX_THUMBNAILS.md)를 따릅니다.

updater의 시험용 N→N+1 수용과 실제 production 업데이트는 다릅니다. 공개 manifest와 설치 파일은 아직 게시하지 않았습니다. [updater 아키텍처](docs/architecture/UPDATER.md), [버전별 검증 근거와 미해결 한계](docs/releases/v0.1.0.md)를 함께 확인하세요.

## 지원 범위

- Windows x64
- Linux x64
- Linux arm64

CI와 Windows/Linux native artifact workflow는 수동 `workflow_dispatch` 전용입니다. Actions artifact는 임시 검증물이며 공식 설치 파일이 아닙니다. 일반 artifact build는 게시하지 않고, 서명·Release 게시와 Pages 배포는 각각 명시 승인된 별도 실행입니다.

## 릴리즈 문서

처음 공개하거나 다음 버전을 배포할 때는 아래 순서로 읽습니다. 문서의 완료가 제품 공개 승인을 뜻하지는 않습니다.

1. [릴리즈 정책](docs/operations/DESKTOP_RELEASE.md) — 지원 패키지·서명·승인·복구 기준
2. [공개 실행 가이드](docs/operations/PUBLIC_RELEASE_RUNBOOK.md) — 입력 확정부터 게시·실패 재개까지
3. [최소 검증 체크리스트](docs/operations/RELEASE_CHECKLIST.md) — 변경 영향에 따른 실행·근거 재사용
4. [버전별 기록](docs/releases/README.md) — 준비/공개 상태와 결과, [첫 공개 인계](docs/releases/v0.1.0.md#첫-공개-작업-9-인계)

전체 문서 위치는 [문서 인덱스](docs/README.md)를 참고하세요.

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
