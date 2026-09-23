# Task #5 Stage 4 완료보고서 — Native artifact inventory와 운영 문서

GitHub Issue: [#5](https://github.com/postmelee/alhangeul-tauri/issues/5)
구현계획서: [`task_m010_5_impl.md`](../plans/task_m010_5_impl.md)
Stage: 4

## 단계 목적

Stage 3의 exact-ref native canary가 업로드한 Windows/Linux artifact를 별도 임시 경로에 내려받아 build 시 동봉된 inventory와 실제 파일을 독립 재검증하고, 확인된 build smoke 범위와 공식 배포의 경계를 공식 운영·개발 문서에 반영하는 단계다.

검증 대상은 native run `30357240402`와 canary commit `b8847f5086eab7c0f8243e999f2c145271ef713c`로 고정했다. Actions artifact가 installer 생성과 upload 이후에도 원래 inventory를 보존했음을 확인했지만, 설치·실행·서명·Release·배포까지 검증한 것으로 확장하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/operations/DESKTOP_RELEASE.md` | 118줄. Actions 활성·수동 전용 상태, 검증 일자·exact commit·CI/native run, 세 archive metadata, installer 6개의 byte size·SHA-256, 14일 retention, 다운로드 후 검증 명령과 비배포 경계를 기록했다. |
| `docs/DEVELOPMENT.md` | 160줄. 개발 상태를 실제 Actions 운영 상태로 갱신하고 `test:automation`, 다운로드 artifact inventory 검증 예시와 운영 문서 링크를 최소 추가했다. |
| `mydocs/working/task_m010_5_stage4.md` | 다운로드·독립 검증, 외부 상태 확인, 문서 변경과 잔여 위험을 모은 본 완료보고서다. |

공식 문서 diff는 2개 파일, 75 insertions, 13 deletions다. README, site와 workflow는 변경하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

`docs/operations/DESKTOP_RELEASE.md`의 기존 platform matrix, 수동 workflow 범위, 의도적으로 제외한 Release·서명·updater 경계와 로컬 검증 구조를 보존했다. 과거 상태였던 “repository Actions 비활성”만 실제 활성 상태와 수동 trigger 경계로 교체하고, 검증된 canary와 독립 inventory 증거를 새 절로 추가했다.

공개 배포 전 후속 작업 목록에서는 이번 Task로 완료된 `rhwp` Stable pin과 Windows/Linux artifact smoke 항목을 제거하고, 아직 수행하지 않은 version/tag 정책, signing, 설치·실행 smoke, 사용자 문서와 updater 설계만 남겼다.

`docs/DEVELOPMENT.md`는 기존 개발·빌드·upstream pin 설명을 재작성하지 않았다. 개발 상태 한 항목과 platform-neutral 검증 명령 한 줄, 다운로드 후 inventory 검증 예시와 공식 운영 문서 링크만 추가했다.

공식 문서는 API가 보고한 archive digest와 다운로드 후 검증기가 재계산한 내부 installer SHA-256을 구분한다. Actions artifact를 공식 설치 파일이나 공개 release로 안내하지 않으며 README/site 다운로드 링크도 추가하지 않았다.

## 검증 결과

native run artifact를 workspace 밖의 새 임시 디렉터리 `/tmp/alhangeul-task5-stage4.2yJyID`에 다운로드했다.

```bash
gh run download 30357240402 \
  --repo postmelee/alhangeul-tauri \
  --dir /tmp/alhangeul-task5-stage4.2yJyID
```

GitHub API metadata 확인 결과:

| Artifact | ID | 크기 (bytes) | Expired | Head SHA |
|---|---:|---:|---|---|
| `alhangeul-desktop-windows-x64` | `8687655675` | 53,615,008 | `false` | `b8847f5086eab7c0f8243e999f2c145271ef713c` |
| `alhangeul-desktop-linux-x64` | `8687615390` | 354,121,922 | `false` | `b8847f5086eab7c0f8243e999f2c145271ef713c` |
| `alhangeul-desktop-linux-arm64` | `8687395654` | 90,022,918 | `false` | `b8847f5086eab7c0f8243e999f2c145271ef713c` |

각 platform 디렉터리에는 `alhangeul-artifact-inventory.json`이 정확히 하나씩 존재했다. 구현계획서의 세 독립 검증 명령:

```bash
pnpm run check:desktop-artifacts -- \
  --platform windows-x64 \
  --root /tmp/alhangeul-task5-stage4.2yJyID/alhangeul-desktop-windows-x64 \
  --verify-inventory \
  /tmp/alhangeul-task5-stage4.2yJyID/alhangeul-desktop-windows-x64/alhangeul-artifact-inventory.json

pnpm run check:desktop-artifacts -- \
  --platform linux-x64 \
  --root /tmp/alhangeul-task5-stage4.2yJyID/alhangeul-desktop-linux-x64 \
  --verify-inventory \
  /tmp/alhangeul-task5-stage4.2yJyID/alhangeul-desktop-linux-x64/alhangeul-artifact-inventory.json

pnpm run check:desktop-artifacts -- \
  --platform linux-arm64 \
  --root /tmp/alhangeul-task5-stage4.2yJyID/alhangeul-desktop-linux-arm64 \
  --verify-inventory \
  /tmp/alhangeul-task5-stage4.2yJyID/alhangeul-desktop-linux-arm64/alhangeul-artifact-inventory.json
```

결과:

- OK — Windows x64: MSI·NSIS 필수 종류와 inventory 일치
- OK — Linux x64: AppImage·DEB·RPM 필수 종류와 inventory 일치
- OK — Linux arm64: DEB 필수 종류와 inventory 일치
- OK — 모든 필수 installer가 0바이트보다 크고 build log의 파일명·크기·SHA-256과 일치

독립 재검증한 필수 installer:

| Platform | 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---|
| Windows x64 | MSI | `msi/Alhangeul_0.3.1_x64_en-US.msi` | 28,192,768 | `bfab22693473c2cbd60b5e3aa396ccad9a6b7c7649d19d671f84ecf11afa45b9` |
| Windows x64 | NSIS | `nsis/Alhangeul_0.3.1_x64-setup.exe` | 25,661,219 | `c2e152bcec79a1c423f1ae1410840a96b1441f50710320b12a93eb5ce89191be` |
| Linux x64 | AppImage | `appimage/Alhangeul_0.3.1_amd64.AppImage` | 106,834,424 | `1c8f678f3a1e97d0498129934f637ffc82e8479378df8a07be3c76d56246b10b` |
| Linux x64 | DEB | `deb/Alhangeul_0.3.1_amd64.deb` | 30,091,764 | `f6df90bf962ef33759b50f1c7452998278ec72fbe941751c9698ad5015d6422d` |
| Linux x64 | RPM | `rpm/Alhangeul-0.3.1-1.x86_64.rpm` | 30,092,577 | `5445382ba9f4d5e7f30a61a47991d7becd333ff0f7725f253f05b1e52ed98293` |
| Linux arm64 | DEB | `deb/Alhangeul_0.3.1_arm64.deb` | 30,049,140 | `f0b841837cc66a699c1f917552287d263394e562be01bd1f2e5b419c3544595f` |

나머지 Stage 4 검증:

```bash
pnpm run test:automation
pnpm run check:product-boundary
rg -n \
  'b8847f5086eab7c0f8243e999f2c145271ef713c|30357007192|30357240402|MSI|NSIS|DEB|RPM|AppImage|SHA-256' \
  docs/operations/DESKTOP_RELEASE.md
git diff --exit-code devel -- .github/workflows/pages.yml
git diff --check
```

- OK — automation test 23/23 통과
- OK — product boundary 179개 파일 검사 통과
- OK — 공식 문서에서 exact SHA, CI/native run과 모든 필수 installer 종류·SHA-256 확인
- OK — Pages workflow diff 없음
- OK — `git diff --check`가 출력 없이 종료 코드 0으로 통과
- OK — 대상 workflow의 secret 참조 없음; automation 비배포 정적 계약 통과

외부 상태 확인:

- OK — GitHub Release API 응답 `[]`
- OK — remote tag 조회 결과 없음
- OK — `pages.yml` run 이력 `[]`
- OK — README, site와 workflow diff 없음

검증을 마친 임시 디렉터리 685MB는 별도 배포 경로로 옮기지 않고 삭제했으며 현재 존재하지 않는다. artifact는 2026-08-11 만료 전까지 native run에서 다시 다운로드할 수 있다.

## 잔여 위험

- API archive digest는 GitHub가 반환한 metadata이며, 다운로드 후 독립 검증은 archive 압축 byte가 아니라 동봉 inventory와 압축 해제된 모든 파일을 대상으로 수행했다.
- installer 설치·실행 smoke, Windows signing, Linux package metadata의 배포 적합성, GitHub Release와 updater는 검증하지 않았다.
- Stage 4 문서를 포함한 새 실행 가능 head는 아직 remote CI/native matrix에서 재검증하지 않았다. Stage 5에서 exact SHA로 두 workflow를 다시 실행해야 한다.
- Actions artifact는 14일 뒤 만료되며 장기 배포 채널이나 영구 checksum 게시물이 아니다.

## 다음 단계 영향

- Stage 5는 본 Stage 4 commit까지 포함한 clean head를 `publish/task5`로 fast-forward하고 remote SHA 일치를 확인해야 한다.
- 같은 exact SHA에서 CI를 먼저 성공시킨 뒤 Windows x64·Linux x64·Linux arm64 native artifact workflow를 다시 실행해야 한다.
- 현재 macOS host에서는 platform-neutral 검증만 실행하며 native Rust test·Clippy·Tauri build 성공은 Windows/Linux Actions 결과로 판정한다.
- Stage 5 이후 실행에 영향을 주지 않는 `mydocs` 보고 문서만 추가됐음을 path diff로 확인해 불필요한 native 재실행을 막는다.

## 승인 요청

- Stage 4 artifact 독립 검증, 공식 문서 변경과 본 완료보고서를 승인하면 Stage 5의 최종 실행 가능 head 통합 검증으로 진행한다.
