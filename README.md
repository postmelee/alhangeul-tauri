# Alhangeul

Alhangeul은 Windows와 Linux에서 HWP/HWPX 문서를 열고 편집하기 위한 Tauri 기반 오픈소스 데스크톱 앱입니다. 문서 파싱과 렌더링은 [rhwp](https://github.com/edwardkim/rhwp)를 사용하고, 이 저장소는 데스크톱 셸과 파일·창·인쇄 같은 제품 통합을 소유합니다.

> 현재 소스의 제품 버전은 독립 Alhangeul의 M010 기준선인 `0.1.0`입니다. 공식 설치 파일, 태그나 공개 릴리스는 아직 제공하지 않습니다.

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
- 현재 Stable pin: `v0.8.2` (`9b16aa9e23f476e2b335d7c029fc9f24a199d63c`)
- 기계 검증 가능한 pin과 artifact 출처: [rhwp-core.lock](rhwp-core.lock)
- 의존 경계와 갱신·rollback 절차: [UPSTREAM.md](docs/architecture/UPSTREAM.md)
- 초기 코드와 자산 출처: [PROVENANCE.md](docs/architecture/PROVENANCE.md)

License: MIT
