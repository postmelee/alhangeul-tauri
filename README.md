# Alhangeul

Alhangeul은 Windows와 Linux에서 HWP/HWPX 문서를 열고 편집하기 위한 Tauri 기반 오픈소스 데스크톱 앱입니다. 문서 파싱과 렌더링은 [rhwp](https://github.com/edwardkim/rhwp)를 사용하고, 이 저장소는 데스크톱 셸과 파일·창·인쇄 같은 제품 통합을 소유합니다.

> 현재 독립 제품 전환과 배포 기반을 준비하는 개발 단계입니다. 공식 설치 파일이나 공개 릴리스는 아직 제공하지 않습니다.

## 현재 기능

- HWP/HWPX 문서 열기
- HWP 문서 저장 및 다른 이름으로 저장
- PDF 내보내기
- 인쇄
- 파일 드래그 앤 드롭과 파일 연결
- 여러 창에서 문서 열기

HWPX 저장, autosave/recovery와 외부 파일 변경 감지는 아직 지원하지 않습니다.

## 지원 범위

- Windows x64
- Linux x64
- Linux arm64

실제 native build와 배포물 검증은 후속 CI 작업에서 진행합니다. 현재 저장소의 GitHub Actions workflow는 비활성 상태를 유지하며 자동 배포하지 않습니다.

## 개발 시작

Node.js 24, Corepack, Rust stable과 대상 운영체제의 Tauri 2 시스템 의존성이 필요합니다.

```sh
git submodule update --init --recursive
corepack enable
pnpm install --frozen-lockfile
pnpm run check:product-boundary
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
- 현재 의존 경계와 후속 release pin 계획: [UPSTREAM.md](docs/architecture/UPSTREAM.md)
- 초기 코드와 자산 출처: [PROVENANCE.md](docs/architecture/PROVENANCE.md)

License: MIT
