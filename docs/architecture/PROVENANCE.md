# 코드와 자산 출처

이 문서는 Alhangeul이 독립 제품으로 소유하는 코드와 초기 출처를 구분한다. 과거 출처는 지속 upstream 관계를 뜻하지 않는다.

## HOP 기반 코드

- 초기 저장소: [`golbin/hop`](https://github.com/golbin/hop)
- 기준 commit: `bbd6bf69db05f275d714e7c61cef58b662809c6a`
- 적용 방식: 기준 commit의 Git 이력을 보존한 새 저장소에서 제품명, 지원 플랫폼과 배포 경계를 단계적으로 독립화
- upstream 정책: HOP remote를 fetch·merge·release source로 사용하지 않음

기준 commit 이후의 Alhangeul 제품 코드, issue, release와 운영 자동화는 `postmelee/alhangeul-tauri`가 독립적으로 소유한다. HOP의 이후 변경을 자동으로 가져오지 않는다.

## 지속 upstream

문서 engine과 renderer의 유일한 지속 upstream은 [`edwardkim/rhwp`](https://github.com/edwardkim/rhwp)다. 현재 고정 상태와 후속 Stable release pin 정책은 [UPSTREAM.md](UPSTREAM.md)에 기록한다.

## 라이선스

초기 코드의 MIT 라이선스와 copyright notice를 저장소의 `LICENSE`에 보존한다. Alhangeul의 변경도 같은 MIT 라이선스로 배포한다. `rhwp`와 bundled font 등 제3자 구성요소는 각 원본의 라이선스와 notice를 따른다.

## Alhangeul icon

- source 저장소: [`postmelee/alhangeul-macos`](https://github.com/postmelee/alhangeul-macos)
- source commit: `dcef80cae43195a3e353de084f7246614da924be`
- source 경로: `assets/logo-256@2x.png`
- 저장 경로: `assets/logo/logo-source.png`
- SHA-256: `cc8b326aa54bff659689222fca317b561c7984d86c479b61b534bf4fddec3cd5`

Windows/Linux PNG·ICO와 studio favicon은 이 source를 기계적으로 resize·변환한 산출물이다. 새로운 그림을 합성하거나 원본 디자인을 변경하지 않았다.

## 독립 remote 원칙

- 기본 remote는 `postmelee/alhangeul-tauri`만 제품 개발과 게시 대상으로 사용한다.
- HOP remote는 설정하지 않으며 역사 확인은 보존된 Git commit과 이 문서를 기준으로 한다.
- `rhwp` 갱신은 HOP가 아닌 `edwardkim/rhwp`의 명시적인 release와 resolved commit만 기준으로 한다.
- 출처 기록을 제품 다운로드, 업데이트 endpoint 또는 자동 동기화 계약으로 해석하지 않는다.
