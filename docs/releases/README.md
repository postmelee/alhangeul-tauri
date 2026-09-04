# Alhangeul 릴리즈 기록

이 폴더는 Windows/Linux 제품의 버전별 준비 상태, 승인, 검증 출처와 공개 결과를 보관한다.
기록 파일이 있다는 사실은 해당 버전이 공개됐다는 뜻이 아니다.

## 릴리즈 목록

2026-09-04 확인: 이 저장소의 GitHub Release 목록은 비어 있다.

| 버전 | 상태 | 이전 공개 버전 | GitHub Release | 기록 |
|---|---|---|---|---|
| v0.1.0 | 준비 중, 공개 승인 대기 | 없음 | 미생성 | [v0.1.0 준비 기록](v0.1.0.md) |

최신 공개 버전은 실제 non-draft Release와 공개 read-back으로 판정한다. 가장 높은 파일명이나
현재 source version을 최신 공개 버전으로 취급하지 않는다. 상태 확인 시점을 함께 갱신한다.

## 문서 책임

| 위치 | 역할 |
|---|---|
| [데스크톱 릴리즈 정책](../operations/DESKTOP_RELEASE.md) | 반복 승인·지원 matrix·신뢰·복구 기준 |
| 이 인덱스 | 버전별 상태와 기록 진입점 |
| `v<version>.md` | 해당 버전의 식별자·변경점·검증·결정·실패 재개·인계 |
| [기록 템플릿](../../mydocs/_templates/release_record.md) | 다음 버전의 작성 형식; 실제 결과를 미리 채우지 않음 |
| [GitHub Releases](https://github.com/postmelee/alhangeul-tauri/releases) | 공개 installer·서명·inventory와 사용자 릴리즈 노트 |
| [사용자 업데이트 페이지](https://postmelee.github.io/alhangeul-tauri/updates/) | 짧은 변경 요약과 플랫폼별 다운로드 진입점 |
| `site/release.json`, Pages output manifest | 별도 승인으로 게시하는 다운로드·updater 기계 입력 |
| `mydocs/working/`, `mydocs/report/` | 특정 Task의 단계·최종 결과; 제품 공개 기록과 구분 |

공개 실행 runbook과 검증 체크리스트의 진입점은 Task #54 Stage 2에서 연결한다.

## 작성·갱신 규칙

1. 승인된 릴리즈 작업에서 템플릿을 읽고 목표 tag와 같은 이름의 `v<version>.md`를 만든다.
   source version이 있어도 공개 채널·후보가 미정이면 `준비 중`으로 시작한다.
2. 이전 공개 tag·commit과 후보 범위를 확정한 뒤 포함 PR·해결된 Issue·참고 Issue를 구분한다.
   첫 공개에는 이전 버전 대신 `없음`을 적고 분석 시작 기준을 별도로 승인받는다.
3. 기본 검증과 변경 영향별 추가 검증의 실행·재사용·미실행 근거를 기록한다. build SHA,
   workflow SHA, Pages SHA, archive digest와 installer hash를 서로 대체하지 않는다.
4. Release·Pages·updater 상태는 각각 실제 결과를 확인한 뒤 갱신한다. 일부 게시 성공이나
   같은 버전의 업데이트 없음 확인만으로 전체 공개·업그레이드 완료를 선언하지 않는다.
5. 사용자 요약은 앱·upstream의 사용자에게 보이는 변화로 작성한다. 긴 검증 로그·운영 변경은
   이 기록에 두며 공개 노트와 웹 페이지에 그대로 복제하지 않는다.
6. 이후 문제가 발견되면 해당 공개 version 기록에 알려진 한계와 후속 링크를 덧붙인다.
   과거 결과를 새 결과로 덮어쓰거나 tag·asset이 교체된 것처럼 기록하지 않는다.

과거 Actions archive는 만료될 수 있다. 고유 SHA·run·digest·수용 한계는 Task 원본 보고서와
고정 commit 링크로 보존하되 archive 가용성이나 현재 후보의 성공을 보장하는 값으로 쓰지 않는다.
private key·암호·token·개인 문서·실제 credential 보관 경로는 기록하지 않는다.
