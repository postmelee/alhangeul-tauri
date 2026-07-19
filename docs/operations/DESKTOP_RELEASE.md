# 데스크톱 artifact와 배포 준비

Alhangeul은 아직 공식 설치 파일이나 공개 릴리스를 제공하지 않는다. 현재 `.github/workflows/alhangeul-desktop.yml`은 Windows/Linux native build 결과를 수동 검증하기 위한 정적 workflow 정의이며 GitHub Release를 생성하지 않는다.

## 현재 workflow 범위

`Alhangeul Desktop Artifact Build`는 `workflow_dispatch`로만 정의되어 있다.

| 대상 | Runner | Rust target | 예상 bundle |
|---|---|---|---|
| Windows x64 | `windows-2025` | `x86_64-pc-windows-msvc` | MSI, NSIS |
| Linux x64 | `ubuntu-22.04` | `x86_64-unknown-linux-gnu` | DEB, RPM, AppImage |
| Linux arm64 | `ubuntu-22.04-arm` | `aarch64-unknown-linux-gnu` | DEB |

workflow는 다음 작업만 수행한다.

1. submodule을 포함한 선택 commit checkout
2. Node, pnpm, Rust와 Linux Tauri 의존성 준비
3. 제품 경계·upstream·studio 검증
4. Tauri bundle 생성
5. Actions artifact 업로드

repository-level Actions는 별도 승인 전까지 비활성 상태를 유지한다. workflow 파일이 있다는 사실은 CI 실행이나 artifact 가용성을 의미하지 않는다.

## 의도적으로 포함하지 않는 작업

- GitHub Release 생성·수정
- 고정 다운로드 URL이나 latest channel 제공
- 코드 서명과 인증 정보 사용
- package registry 또는 배포판 repository 게시
- updater manifest와 update artifact 생성
- 태그 생성 또는 이동

따라서 workflow artifact를 공식 배포물로 안내하거나 README/site에 다운로드 링크를 추가하면 안 된다.

## 공개 배포 전 후속 작업

공식 배포를 시작하려면 최소한 다음 작업을 별도 Issue와 승인 경계로 수행한다.

1. `rhwp` Stable release tag + resolved commit pin 구조 확정
2. Windows/Linux native CI 활성화와 artifact smoke 검증
3. 버전·tag·bundle 이름과 checksum 정책 확정
4. Windows signing과 Linux package metadata 검토
5. 사용자 다운로드 문서와 rollback 절차 작성
6. 필요할 경우 독립 updater 보안 모델과 key 보관 정책 설계

릴리스·서명·패키지 게시·updater 활성화는 작업지시자의 명시 승인 없이는 수행하지 않는다.

## 로컬 검증

모든 호스트에서 먼저 platform-neutral 검증을 실행한다.

```sh
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

Windows/Linux에서 native 검증을 추가한다.

```sh
pnpm run test:desktop
pnpm run clippy:desktop
pnpm tauri build --debug
```

생성 bundle은 해당 작업의 artifact 보존 기간과 검증 기록 안에서만 사용한다.
