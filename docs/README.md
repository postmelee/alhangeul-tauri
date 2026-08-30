# Alhangeul 문서

이 디렉터리는 Alhangeul의 개발, 아키텍처와 운영 문서를 둔다.

## 구성

```text
docs/
  DEVELOPMENT.md             로컬 개발 환경과 주요 명령
  KEYBOARD_SHORTCUTS.md      Windows/Linux 키보드 단축키
  architecture/
    LOCAL_FONTS.md           로컬 폰트 해석과 라이선스 경계
    LINUX_THUMBNAILS.md      Linux 파일 관리자 thumbnail 처리와 package 경계
    PROVENANCE.md            초기 코드와 제품 자산 출처
    UPSTREAM.md              upstream rhwp 경계와 고정 정책
    WINDOWS_THUMBNAILS.md    Windows Explorer thumbnail 처리와 등록 경계
  operations/
    DESKTOP_RELEASE.md       artifact 검증과 후속 배포 준비 경계
```

## 작성 규칙

- 사용자·기여자에게 유효한 현재 상태만 기록한다.
- 기능 스펙은 `docs/specs/<topic>/`, 공통 아키텍처 결정은 `docs/architecture/`에 둔다.
- 빌드, 배포와 유지보수 절차는 `docs/operations/`에 둔다.
- 작업 계획과 단계 보고서는 공식 문서가 아닌 `mydocs/`에 둔다.
- Alhangeul이 소유하는 동작은 `apps/desktop` 또는 `apps/studio-host`에 두며 `third_party/rhwp`를 제품 코드처럼 직접 수정하지 않는다.
- 아직 제공하지 않는 설치 파일, 릴리스와 자동 업데이트를 사용할 수 있다고 설명하지 않는다.
