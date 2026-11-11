# Task #126 Stage 6.1 — 최종 사용자 안내 반영

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md)

## 단계 목적

실제 3종 업데이트 성공을 단일 notes 원문·GitHub 본문·웹 데이터에 반영하고 최종 Pages 배포 입력을 고정한다. 전체 Stage 6 종료는 후속 공개 read-back 후 기록한다.

## 산출물

- v0.1.3 notes·생성 HTML·site/release.json·README 및 기술 기록.
- 실제 업데이트 검증 안내, PR #128 참조와 2026-11-11T13:03:13Z 참조 상태 재조회.
- 최종 GitHub body 6,206 bytes, SHA256 `48b641ee46260fe71c4a46a82e57b47cedca2457a8099ab6adcd9496ad61381a`.
- 최종 안내 manifest 2,456 bytes, SHA256 `8b94dd1508da603c7c0dc0d83b01033ccd8a24393b06ba7401ddea5283524ba7`.

## 본문 변경 정도 / 본문 무손실 여부

미완료였던 실제 업데이트 안내를 NSIS·MSI·AppImage의 성공 결과로 갱신했다. 알려진 제한·이전 후보 이력·버전별 fixture는 보존한다. 최초 검증 manifest `91874d92...`와 최종 안내 manifest `8b94dd15...`는 notes만 다르고 version/pub_date/platform URL/signature는 동일하다. 실제 업데이트의 재현에는 Stage 5에 고정한 harness와 최초 manifest를 사용한다.

## 검증 결과

- `check:release-notes`: 3 documents 통과.
- `test:release-notes`: 124/124 통과.
- Pages·v0.1.3 upgrade 계약: 119/119 통과.
- T7 검증 복사본의 Pages source 20 / output 24 통과, `git diff --check` 통과.
- GitHub body-only 갱신 후 실제 API 본문 exact bytes 확인. Release ID·tag·source·공개 시각·11개 asset ID/이름/크기/digest/URL 불변.
- Stage 4에서 독립 다운로드한 공개 11개 파일을 새 API metadata와 다시 대조하고 Minisign 3종·inventory·checksum·본문을 검산했다. 파일을 재업로드하거나 태그를 이동하지 않았다.

## 잔여 위험

최종 안내의 Pages 게시와 HTTP/화면 read-back은 다음 단계에서 확인한다. 아직 최초 피드가 공개되어 있으며 위 최종 hash를 실제 게시 완료로 기록하지 않는다.

## 다음 단계 영향

중간 devel PR의 필수 CI·일반 merge 후 exact Pages를 배포하고 최종 HTTP·화면을 재검증한다. 그 결과를 포함해 최종 보고서·보드·PR을 작성한다.

## 승인 기록

작업지시자의 “등록하고 릴리즈 완료까지 계속 진행해줘.”에 따라 계속한다.
