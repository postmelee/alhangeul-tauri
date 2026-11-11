# Task #122 Stage 2 — Alhangeul v0.1.3 제품 버전과 후보 노트

2026-11-10 · [이슈 #122](https://github.com/postmelee/alhangeul-tauri/issues/122) · [구현계획서](../plans/task_m010_122_impl.md)

## 단계 목적

rhwp v0.9.0을 통합한 제품에 v0.1.3을 부여하고 Windows/Linux 설치본 검증에 사용할 후보 문구를 작성했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `package.json`, `apps/desktop/package.json`, `apps/desktop/src-tauri/{Cargo.toml,Cargo.lock,tauri.conf.json}` | 다섯 위치의 제품 버전을 0.1.3으로 맞췄다. Cargo.lock에서는 데스크톱 패키지의 버전만 변경했다. |
| `tests/release-metadata.test.mjs` | 실제 저장소와 CLI가 새 버전을 반환하는지 검사한다. |
| [버전 기록과 사용자 안내 초안](../../docs/releases/v0.1.3.md) · [릴리즈 인덱스](../../docs/releases/README.md) | upstream의 편집·저장·PDF 변화, 앱의 글꼴·Worker 보정, 설치본에서 검증할 항목, 현재 공개 상태를 기록했다. |

## 본문 변경 정도 / 동작 보존

글꼴·Worker 호환성은 [Stage 1.1](task_m010_122_stage1.1.md)에서 구현해 [공식 후보](task_m010_122_stage1.md)에 포함됐다. 해당 소스와 공식 WASM으로 새 제품 버전을 검증했다. 공개 사이트·피드에 대한 diff는 없다.

## 검증 결과

| 실행 | 결과 |
|---|---|
| `pnpm run check:product-boundary`, `check:product-version`, `check:release-metadata` | 제품 경계, 버전 5곳, Windows/Linux 릴리즈 메타데이터 통과 |
| `pnpm run test:studio`, `pnpm run build:studio` | 43개 파일 289개 테스트 통과, Studio 번들 생성 성공 |
| 번들 참조·파일 해시 대조 | main이 폼·PDF Worker를 참조하고 main과 PDF Worker의 WASM 파일이 일치했다. SHA-256은 `9d26197106cbe47236247c6c5cc8a32777dd794dc747d7360586f9b5dde7d7a6`으로 공식 lock과 같다. |
| `pnpm run test:release-notes`, `pnpm run check:release-notes` | 124개 계약 테스트와 기존 JSON 2건 검증 통과. v0.1.3 Markdown의 로컬 링크와 인덱스 연결은 별도로 확인했다. |
| `pnpm run test:automation` | 제품 버전 CLI의 기대값을 함께 갱신한 뒤 1,360개 전체 통과 |
| `git diff --check` | 공백·패치 오류 없음 |

Mac에서 플랫폼 공통 검사를 실행했고 Studio 빌드·회귀 검사에는 T7의 기존 검증 사본을 사용했다. Vite는 Tauri 모듈의 정적·동적 import 혼용으로 별도 청크가 생성되지 않는다는 경고를 냈다.

## 잔여 위험

버전별 JSON의 현행 계약은 draft에도 실제 후보 소스 SHA, 설치 파일 6종의 크기·해시와 서명된 updater inventory를 요구한다. 이전 v0.1.2의 준비 절차와 같이 현재 사용자 문구는 버전 기록에 보관한다. 실제 서명된 파일과 inventory 확보 후 `docs/releases/v0.1.3.notes.json`으로 옮기고 배포용 본문·웹·updater 문구를 생성해야 한다.

## 다음 단계 영향

Stage 3의 입력은 이 단계의 제품 커밋이다. 동일 SHA로 Windows x64 NSIS·MSI, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB를 생성한 뒤 설치와 문서·PDF·인쇄·썸네일 동작을 확인한다.

## 승인 요청

Stage 2 결과와 Windows/Linux 설치 파일 6종의 Stage 3 빌드·수용 검증에 대한 승인을 요청한다.
