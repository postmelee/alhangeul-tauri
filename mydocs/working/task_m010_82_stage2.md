# Task #82 Stage 2 — 다운로드 안내와 OS 화면 전환

GitHub Issue: [#82](https://github.com/postmelee/alhangeul-tauri/issues/82)
구현계획서: [task_m010_82_impl.md](../plans/task_m010_82_impl.md)
Stage: 2

## 단계 목적

버전과 배포 형식 목록을 데이터로 표시하고, OS 선택에 맞춰 실제 앱·탐색기 화면을 겹쳐 보여준다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| site/index.html, styles.css | 다운로드 제목 줄바꿈 방지, 버전 안내 다음 줄에 배포 형식 표시 |
| site/script.js | 배포 배열에서 다운로드 행·안내 생성, release.json 버전과 exact URL 적용 |
| site/home-showcase.js, home-showcase.css | OS 동기화, hover·focus·클릭 전환, 작은 화면과 모션 감소 |
| site/updates/index.html, feedback/index.html | 공유 자산 캐시 버전 갱신 |
| tests/pages*.test.mjs | 배포 목록 확장·미공개 상태·이미지 전환·자산 보존 회귀 |

## 본문 변경 정도 / 본문 무손실 여부

기존 Linux 앱 PNG와 채택된 세 PNG의 원본 bytes를 유지했다. 공개 릴리즈 JSON, 설치본,
updater 데이터는 수정하지 않았다. 공개 상태의 오래된 '공개 전' 안내를 교체했다.

## 검증 결과

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs
git diff --check
```

모두 통과. Pages source 16/output 19, Node 41 tests 통과.
로컬 브라우저에서 1280×720 화면, OS 선택과 다운로드·이미지 동기화, 탐색기 전환 버튼을 확인했다.
390px 너비 iframe에서 모바일 배치와 이미지 접근을 육안 확인했다. 실제 터치 장치 검증은 아니다.
브라우저 확인 중 버튼을 가리던 장식 레이어를 수정했고, 모션 감소에서는 전환 애니메이션만 끄도록 했다.
단위 검증은 focus·hover·클릭 및 touch 이동 시 상태 유지, 배포 배열 확장을 포함한다.

## 잔여 위험

실제 모바일 터치·복수 브라우저·운영 Pages는 아직 검증하지 않았다. 뒤쪽 이미지는 일부만 보이며
노출 가장자리 hover 또는 명시적 선택 버튼으로 전환한다. 버전/URL 갱신은 release.json에서,
새 배포 형식은 script.js의 distributionChannels 배열에서 관리한다. release 데이터의 검증 스키마는
기존 계약을 유지하므로 새 artifact target 도입 시 해당 계약의 별도 확장도 필요하다.

## 다음 단계 영향

Stage 3에서 정식 회귀·접근성 검토 및 최종 보고/PR 준비를 진행한다. 운영 배포와 병합은 미실행이다.

## 승인 요청

Stage 2 결과 검토 후 Stage 3 진입 승인을 요청한다.

## 사용자 디자인 검토 반영

제목을 '한글 파일은 더 이상 / 낯선 문서가 아닙니다.' 두 줄로 조정했다. 다운로드 제목은
진하게, 버전은 '최신 버전 v0.1.0' 형태의 보조 정보로 표시한다. 중복 배포 형식 설명과 그
생성 함수는 제거했고 배열 기반 다운로드 행은 유지했다. 위 산출물/잔여 위험의 안내 문장
생성 설명은 이 수정으로 대체된다. Pages 41 tests, build/check 및 1280×720 브라우저 화면
확인을 통과했다. 사용자 요청 범위의 Stage 2 보완이며 Stage 3/PR/운영 배포는 미실행이다.
