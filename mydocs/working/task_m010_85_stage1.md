# Task #85 Stage 1 — 사용자 README와 커뮤니티 안내

GitHub Issue: [#85](https://github.com/postmelee/alhangeul-tauri/issues/85)
구현계획서: [task_m010_85_impl.md](../plans/task_m010_85_impl.md)
Stage: 1

## 단계 목적

첫 stable 공개 상태에 맞춰 사용자가 다운로드·설치·기능·제보 경로를 찾도록 README를 정비하고
기여·행동 강령·보안 제보의 공개 문서를 마련한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| README.md | 공개 v0.1.0, 패키지 선택, 두 OS 실제 편집·썸네일 화면, 사용 순서·제한·제보·출처 |
| CODE_OF_CONDUCT.md | 공식 한국어 Contributor Covenant 2.1, 실제 연락처와 CC BY 4.0 출처 |
| CONTRIBUTING.md | 외부 기여자의 fork/devel PR, 선택적 upstream 비교, 변경별 검증과 기밀 보호 |
| SECURITY.md | 최신 stable 지원, GitHub 비공개 신고와 기존 공개 이메일 대안 |

## 본문 변경 정도 / 본문 무손실 여부

README의 개발 중심 순서를 사용자 중심으로 재작성했다. 이미 게시된 릴리즈를 미공개로 안내하던
문구와 과거 검증 상태를 정정하고 상세 운영 기록은 기존 문서로 연결했다. 기능·제한·라이선스·출처와
upstream managed-reference pin 한 줄은 보존했다. 원문 무손실 작업이 아닌 승인된 안내 재구성이다.

신규 행동 강령은 공식 source commit `9920b1964ee207fbeb894532e1b4ffe623e46b9b`의 한국어 2.1
본문과 대조했다. Hugo 메타데이터 제거, 연락처 대입, 잘못 표기된 출처 링크 라벨 정리,
CC BY 4.0 출처 추가 외에는 공식 본문을 보존했다. 제품 MIT 라이선스는 변경하지 않았다.

## 검증 결과

```sh
node --test tests/rhwp-managed-references.test.mjs
git diff --check
```

- OK: 5 tests passed / 0 failed / 0 skipped. 현재 lock과 README pin marker가 정렬되어 있다.
- OK: 새 문서의 상대 링크·이미지 경로 27개 존재, 연락처 placeholder 없음.
- OK: Release API의 v0.1.0 draft=false/prerelease=false 및 6종 설치 파일과 패키지 안내 대조.
- OK: 공식 한국어 행동 강령 본문·원문 CC BY 4.0 라이선스 대조.
- OK: GitHub Markdown API 렌더링을 Browser로 확인. 이미지 5개 모두 로드,
  1280px 화면 가로 overflow 없음, 원시 강조 기호 노출 없음. 링크 줄바꿈과 한국어 강조 파싱을 보정했다.
- OK: `git diff --check`.

## 잔여 위험

- GitHub는 새 커뮤니티 문서를 기본 브랜치에 병합한 뒤 인식한다. 현재 체크 충족으로 기록하지 않는다.
- README의 시각 검증은 GitHub 렌더러 출력의 임시 로컬 표시이며 실제 저장소 화면은 Stage 3에서 확인한다.
- 기존 개발·출처 문서의 과거 개발 상태 설명은 이번 범위에서 재작성하지 않는다. 현재 공개 상태는
  README와 v0.1.0 기록을 우선하도록 문서 인덱스에서 안내한다.

## 다음 단계 영향

- 버그/기능 폼, chooser와 docs 인덱스를 새 사용자 문서에 연결한다.
- About metadata·topics 및 private reporting을 승인값으로 설정하고 원격 read-back한다.

## 승인 상태

작업지시자가 PR 생성까지 계속 진행하도록 명시 승인했다. 단계 결과를 기록하고 Stage 2로 진행한다.
