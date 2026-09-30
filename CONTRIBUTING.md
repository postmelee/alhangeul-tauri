# Alhangeul에 기여하기

버그 재현, 사용성 의견, 문서 개선, 테스트와 코드 기여를 환영합니다.
참여할 때는 [행동 강령](CODE_OF_CONDUCT.md)을 지켜주세요.

## 문제와 아이디어 제보

먼저 [기존 이슈](https://github.com/postmelee/alhangeul-tauri/issues)를 검색한 뒤
[버그 제보 또는 개선 제안](https://github.com/postmelee/alhangeul-tauri/issues/new/choose)을 선택하세요.

- 버그: 운영체제와 버전, 설치 형식, Alhangeul 버전, 재현 순서, 기대한 결과와 실제 결과를 적습니다.
- 문서 표시 문제: 공개해도 되는 최소 샘플이나 개인정보를 가린 화면이 도움이 됩니다. 기밀 문서 첨부는 필요하지 않습니다.
- 기능 제안: 사용자가 겪는 문제와 원하는 동작을 설명합니다. 큰 변경은 구현 전에 이슈에서 범위를 논의하세요.
- 보안 취약점: 공개 이슈 대신 [보안 정책](SECURITY.md)의 비공개 경로를 이용하세요.

문서 파싱·편집·배치 문제는 upstream [rhwp](https://github.com/edwardkim/rhwp)와 관련될 수 있습니다.
공개 가능한 문서라면 [rhwp 데모](https://edwardkim.github.io/rhwp/)에서 비교한 결과나 관련 이슈 링크를
추가할 수 있습니다. 비교는 선택 사항이며, 설치·파일 연결·로컬 글꼴·인쇄 등 데스크톱 문제는
Alhangeul에 바로 제보하세요. 개인정보나 기밀 문서를 공개 데모에 올리지 마세요.

## 코드와 문서 수정

1. 저장소를 fork하고 최신 `devel`에서 작업 브랜치를 만듭니다.
2. [개발 안내](docs/DEVELOPMENT.md)에 따라 Node.js 24, Corepack·pnpm과 필요한 의존성을 준비합니다.
3. 이슈의 목적에 맞게 수정하고 변경 영향을 확인합니다.
4. 원본 저장소의 **`devel`을 대상으로 PR**을 엽니다. 관련 이슈, 변경 이유와 동작, 수행한 검증과 한계를 적습니다.

내부 메인테이너의 작업 계획서·단계 보고서 전체를 외부 기여자에게 요구하지 않습니다.
문서나 작은 수정도 설명과 확인 결과를 남기면 됩니다. [PR 양식](.github/pull_request_template.md)의
내부 작업용 항목은 해당 없다고 표시하고, 관련 있는 요약·검증 항목을 작성하세요.

## 변경과 검증의 경계

- 제품의 지원 대상은 Windows와 Linux입니다. 데스크톱 실행·Rust native 검사·패키징은 해당 운영체제에서 수행합니다.
- JavaScript 패키지 관리는 **pnpm만** 사용합니다.
- `third_party/rhwp`는 읽기 전용 의존성입니다. 문서 엔진 수정은 upstream에서 논의하며, 버전 갱신은 별도 작업에서 검토합니다.
- Alhangeul의 데스크톱 통합은 `apps/desktop`, 편집기 연결은 `apps/studio-host`에서 다룹니다. [upstream 경계](docs/architecture/UPSTREAM.md)를 참고하세요.
- 버그 수정에는 가능한 경우 재현을 잡는 검증을 포함합니다. 문서만 바꿀 때는 링크·내용·렌더링을 확인하며 native 재빌드를 요구하지 않습니다.
- 제품 코드를 바꿀 때는 아래 기본 검사와 변경한 영역의 검증을 수행하고 결과를 PR에 남깁니다. 실제 Windows/Linux에서 확인하지 못한 항목도 적어주세요.

```sh
pnpm run check:product-boundary
pnpm run check:committed-rhwp
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

영역별 명령은 [개발 안내](docs/DEVELOPMENT.md), 필요한 CI 범위는
[CI 검증 안내](docs/operations/CI_VALIDATION.md)에서 확인하세요.
CI는 메인테이너가 수동으로 실행하며, PR을 제출했다고 자동으로 모든 검증이 실행되지는 않습니다.

## 문서와 개인정보

공개 문서는 한국어를 기본으로 작성합니다. 현재 사용자 안내는 루트 README와 커뮤니티 문서,
상세 개발·아키텍처·운영 안내는 `docs/`에 둡니다. 새로운 문서 위치는 PR에서 이유를 설명하세요.
API 이름·코드·파일 경로는 원래 표기를 유지합니다.

실제 개인 문서, 토큰, 인증서나 글꼴 바이너리를 저장소·로그·이슈에 포함하지 마세요.
샘플이나 자산을 추가한다면 공개·재배포 권한과 출처·라이선스를 확인해 주세요.

devel PR은 [필수 빠른 검증과 보호 정책](docs/operations/BRANCH_PROTECTION.md)을 따른다. merge candidate의 필수 check가 성공하고 작업지시자의 리뷰·병합 승인을 받은 뒤 병합한다. native/package 검증은 변경 영향에 맞춰 별도로 수행한다.
