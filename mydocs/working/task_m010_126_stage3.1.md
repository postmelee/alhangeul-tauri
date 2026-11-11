# Task #126 Stage 3.1 — 실제 게시 파일 수용 입력

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md) · Stage 3 하위 단계

## 단계 목적

Stage 2에서 검증한 실제 파일을 원격 설치 시험에서 재현할 수 있도록 입력과 노트 원문을 고정한다. Stage 3 전체 완료 보고가 아니다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| mydocs/working/task_m010_126.json | 서명 NSIS/MSI/AppImage 및 일반 RPM/arm64의 run·artifact ID/digest·내부 파일 SHA 고정 |
| docs/releases/v0.1.3.notes.json | 실제 6개 설치 파일·complete inventory와 사용자 변경/제한/참조를 담은 draft |
| 본 보고서 | 입력 검증 및 원격 수용 인계 |

Linux x64 DEB는 별도 Linux GUI workflow에 source `bcb892d49a9003615f3acd980babd71e59e147dd`와 일반 run `42996821567`을 전달한다. 서명 후보 producer는 `42996892999`다.

## 본문 변경 정도 / 본문 무손실 여부

두 입력 파일을 신규 작성했다. 제품 코드·공개 site/release.json·기존 노트·현재 피드는 변경하지 않았다. GitHub 본문/웹 HTML/updater 문구 초안은 같은 원문에서 private 생성했으며 draft HTML은 공개 tree에 넣지 않았다.

## 검증 결과

- `pnpm run check:release-notes`: 3 documents 성공.
- `pnpm run test:release-notes`: 124/124 성공.
- validateCandidate: nsis/msi/appimage/rpm/arm64 5종 성공.
- notes-cli generate 성공. T7 source 복사본에서 build-pages/check-pages: source 19, output 23 성공.
- `git diff --check` 성공. 제품 파일과 의존성은 최종 main과 동일하다.
- Stage 2의 11개 exact file 목록·서명 3종 검증을 인계한다. 본 하위 단계에서 새 설치 성공이나 공개 성공을 주장하지 않는다.

## 잔여 위험

실제 새 bytes의 Windows 2종·AppImage·DEB/RPM·arm64 설치/문서 검증이 남았다. 알려진 NSIS 썸네일·강제 MSI 재부팅 후 미검증 제한은 유지한다.

## 다음 단계 영향

이 커밋을 publish/task126에 게시하고 release-file-acceptance, release-fedora-vm-acceptance, release-linux-file-acceptance 및 Linux GUI full을 실행한다. 같은 desktop concurrency ref에는 active 1개와 pending 1개까지만 유지한다. 새 필수 실패가 있으면 원인을 해결한 뒤 해당 범위만 재검증한다.

## 승인 기록

“등록하고 릴리즈 완료까지 계속 진행해줘.”에 따라 입력을 게시하고 Stage 3 실제 파일 수용을 계속한다.
