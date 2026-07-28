# Task #7 Stage 5 보고서 — exact-SHA 제품 버전 경계 검증

GitHub Issue: [#7](https://github.com/postmelee/alhangeul-tauri/issues/7)
구현계획서: [`task_m010_7_impl.md`](../plans/task_m010_7_impl.md)
Stage: 5

## 단계 목적

Stage 4의 clean head를 `publish/task7`과 일치시키고 같은 exact SHA에서 Ubuntu CI와 Windows/Linux native artifact matrix를 실행해 `0.1.0 재시작` 선택의 원격 수용 기준을 검증한다.

CI의 제품 version gate와 Ubuntu Rust test·Clippy, 세 native platform의 `0.1.0` installer 생성·inventory·upload, 다운로드 후 독립 inventory 검증을 확인한다. 이 결과를 공식 release, installer 설치·실행, signing이나 updater 검증으로 확장하지 않는다.

## 산출물

| 파일 또는 외부 상태 | 변경 요약 |
|---|---|
| `publish/task7` | Stage 4 canary `02931beb43e2944083e78d792603bff82200478c`로 생성하고 local·remote SHA 일치 확인 |
| [CI run `30383886807`](https://github.com/postmelee/alhangeul-tauri/actions/runs/30383886807) | 같은 SHA에서 제품 version gate와 Ubuntu platform-neutral·Rust test·Clippy 성공 |
| [Native run `30384403366`](https://github.com/postmelee/alhangeul-tauri/actions/runs/30384403366) | 같은 SHA에서 Windows x64, Linux x64, Linux arm64 build·inventory·upload 성공 |
| `docs/operations/DESKTOP_RELEASE.md` | Task #7 exact SHA·run, `0.1.0` artifact metadata와 다운로드 후 installer inventory 추가 |
| `mydocs/working/task_m010_7_stage5.md` | 원격·artifact 통합 검증, 비배포 경계와 잔여 위험을 기록한 본 보고서 |

## 본문 변경 정도 / 본문 무손실 여부

remote canary 성공 뒤 제품 source, verifier, test와 workflow를 수정하지 않았다. `docs/operations/DESKTOP_RELEASE.md`에는 기존 제품 version 기준의 “후속 native 검증” 상태를 실제 Task #7 성공으로 바꾸고, Task #5의 역사적 `0.3.1` 표와 분리된 새 `0.1.0` 절만 추가했다.

Task #5의 CI/native run 번호, `0.3.1` installer 이름·크기·SHA-256은 변경하지 않았다. Release·tag·고정 다운로드 경로·updater를 만들거나 README/site에 artifact 링크를 추가하지 않았다.

canary 이후 local 변경은 운영 증적 문서와 본 보고서뿐이다. 다음 명령으로 실행 가능한 제품·workflow 경로가 canary와 같은지 확인했다.

```bash
git diff --exit-code \
  02931beb43e2944083e78d792603bff82200478c -- \
  package.json apps/desktop apps/studio-host scripts tests .github/workflows
```

결과는 출력 없이 종료 코드 0이다.

## 검증 결과

### 인증, canary push와 remote 일치

```bash
gh auth status
git status --short
git push origin HEAD:refs/heads/publish/task7
git ls-remote --heads origin refs/heads/publish/task7
```

- OK — GitHub active account `postmelee`, workflow 실행 권한 확인
- OK — push 전 `local/task7` worktree clean
- OK — 기존 remote `publish/task7`이 없는 상태에서 새 branch 생성
- OK — local HEAD와 remote branch가 `02931beb43e2944083e78d792603bff82200478c`로 일치
- OK — remote `local/task7` branch는 생성하지 않음

### exact-SHA Ubuntu CI

```bash
gh workflow run ci.yml \
  --repo postmelee/alhangeul-tauri \
  --ref publish/task7
gh run view 30383886807 \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,event,headBranch,headSha,createdAt,updatedAt,status,conclusion,url,jobs
```

| 항목 | 결과 |
|---|---|
| Event | `workflow_dispatch` |
| Branch | `publish/task7` |
| Head SHA | `02931beb43e2944083e78d792603bff82200478c` |
| 생성 시각 | `2026-07-28T17:39:34Z` |
| Run conclusion | `success` |
| Unit tests job | `90358212859`, `success`, 5분 59초 |

- OK — checkout, 제품 경계와 `Check product version` 성공
- OK — `rhwp` pin, automation, upstream, Studio test/build 성공
- OK — Ubuntu desktop Rust test와 Clippy 성공

### exact-SHA Windows/Linux native matrix

```bash
gh workflow run alhangeul-desktop.yml \
  --repo postmelee/alhangeul-tauri \
  --ref publish/task7 \
  -f build_ref=02931beb43e2944083e78d792603bff82200478c \
  -f run_tests=true
gh run view 30384403366 \
  --repo postmelee/alhangeul-tauri \
  --json databaseId,event,headBranch,headSha,createdAt,updatedAt,status,conclusion,url,jobs
```

| 항목 | 결과 |
|---|---|
| Event | `workflow_dispatch` |
| Branch | `publish/task7` |
| Head SHA | `02931beb43e2944083e78d792603bff82200478c` |
| 생성 시각 | `2026-07-28T17:46:21Z` |
| Run conclusion | `success` |
| Linux arm64 job | `90359954790`, `success`, 8분 |
| Windows x64 job | `90359954792`, `success`, 11분 29초 |
| Linux x64 job | `90359954827`, `success`, 12분 55초 |

세 job 모두 exact checkout, 제품 경계·version, `rhwp` pin, automation, upstream, Studio, Tauri build, artifact verifier와 upload 단계를 성공했다.

GitHub API artifact metadata:

| Platform | Artifact ID | Archive 크기 (bytes) | API archive digest | Expired | 만료 시각 |
|---|---:|---:|---|---|---|
| Windows x64 | `8698659028` | 53,659,794 | `sha256:74f8ae91c83c6cb857b94e2ec3851460fb36dcf9a060160e88da8b72036edb22` | `false` | `2026-08-11T17:57:32Z` |
| Linux x64 | `8698704612` | 354,129,430 | `sha256:3b63ab15180e33c72683f3f129cd661673ba7ac55a644c0d1e7cdada68b8803a` | `false` | `2026-08-11T17:58:51Z` |
| Linux arm64 | `8698559801` | 90,030,240 | `sha256:20a0c4f3195ab078bc8f7e2c89428096ede7937a41e4ec6d87ec3401bbdaa8fc` | `false` | `2026-08-11T17:54:09Z` |

세 API 항목의 workflow run head는 모두 canary SHA와 일치한다.

### 다운로드 후 독립 inventory 검증

`mktemp -d`가 만든 `/tmp/alhangeul-task7-stage5.DOQDzU`에 artifact 세 개를 내려받았다. 압축 해제 크기는 685MB였고 platform마다 inventory가 하나씩 존재했다.

```bash
gh run download 30384403366 \
  --repo postmelee/alhangeul-tauri \
  --dir /tmp/alhangeul-task7-stage5.DOQDzU

pnpm run check:desktop-artifacts -- \
  --platform windows-x64 \
  --root /tmp/alhangeul-task7-stage5.DOQDzU/alhangeul-desktop-windows-x64 \
  --verify-inventory \
  /tmp/alhangeul-task7-stage5.DOQDzU/alhangeul-desktop-windows-x64/alhangeul-artifact-inventory.json

pnpm run check:desktop-artifacts -- \
  --platform linux-x64 \
  --root /tmp/alhangeul-task7-stage5.DOQDzU/alhangeul-desktop-linux-x64 \
  --verify-inventory \
  /tmp/alhangeul-task7-stage5.DOQDzU/alhangeul-desktop-linux-x64/alhangeul-artifact-inventory.json

pnpm run check:desktop-artifacts -- \
  --platform linux-arm64 \
  --root /tmp/alhangeul-task7-stage5.DOQDzU/alhangeul-desktop-linux-arm64 \
  --verify-inventory \
  /tmp/alhangeul-task7-stage5.DOQDzU/alhangeul-desktop-linux-arm64/alhangeul-artifact-inventory.json
```

- OK — Windows x64: MSI·NSIS 필수 종류와 모든 inventory file 일치
- OK — Linux x64: AppImage·DEB·RPM 필수 종류와 모든 inventory file 일치
- OK — Linux arm64: DEB 필수 종류와 모든 inventory file 일치

독립 재검증한 필수 installer:

| Platform | 종류 | 파일 | 크기 (bytes) | SHA-256 |
|---|---|---|---:|---|
| Windows x64 | MSI | `msi/Alhangeul_0.1.0_x64_en-US.msi` | 28,192,768 | `b03dff87b050cde11153f7c12d71fe7efeef529653693e4035f9eef157626316` |
| Windows x64 | NSIS | `nsis/Alhangeul_0.1.0_x64-setup.exe` | 25,706,193 | `a75834e758d73ef5c5ae520926df67a2b9f4c4dd7af7d78ef8960b95f82b8487` |
| Linux x64 | AppImage | `appimage/Alhangeul_0.1.0_amd64.AppImage` | 106,838,520 | `a03971f3de13c65f8c109018a6fe7d345ef3fb326328699183f6d4fcf61da945` |
| Linux x64 | DEB | `deb/Alhangeul_0.1.0_amd64.deb` | 30,092,866 | `29220ca6834588f3602429cb6eb7ab9edf7c589fdddb8f78f36b8968a4f7848c` |
| Linux x64 | RPM | `rpm/Alhangeul-0.1.0-1.x86_64.rpm` | 30,093,069 | `2fa1997d1932085f21030da0ed60c990e73f6c4e6b43ce4bccf4563822d6dd19` |
| Linux arm64 | DEB | `deb/Alhangeul_0.1.0_arm64.deb` | 30,049,994 | `15124f7a98d508aec74e930a542705ee5eeaeda0d03bcfc6bdf99399e0cfd737` |

검증 후 명시적 임시 디렉터리만 삭제했고 현재 존재하지 않는다. artifact는 14일 retention 동안 해당 native run에서 다시 다운로드할 수 있다.

### 비배포 상태와 문서 회귀

```bash
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
pnpm run check:product-boundary
rg -n \
  '0\.3\.1|30357007192|30357240402|bfab2269|f0b84183' \
  docs/operations/DESKTOP_RELEASE.md
rg -n \
  '02931beb43e2944083e78d792603bff82200478c|30383886807|30384403366|Alhangeul_0\.1\.0|Alhangeul-0\.1\.0' \
  docs/operations/DESKTOP_RELEASE.md
git diff --check
```

- OK — GitHub Release 목록 없음
- OK — remote tag 없음
- OK — 제품 경계 181개 파일 검사 통과
- OK — Task #5 `0.3.1` run·installer·대표 checksum 보존
- OK — Task #7 exact SHA·run과 `0.1.0` installer 6개 기록
- OK — `git diff --check` 통과

### 수행하지 않은 항목

- Windows/Linux installer 설치·실행 smoke
- Windows signing과 Linux package signing
- GitHub Release 또는 tag 생성
- package registry·배포판 repository·Pages 게시
- updater manifest와 update artifact 생성
- macOS native build·서명·공증

## 잔여 위험

- Actions artifact는 14일 retention이므로 만료 뒤 해당 run에서 다운로드할 수 없다.
- installer 필수 종류, 0바이트 초과와 inventory 무결성은 확인했지만 실제 설치·실행과 signing은 검증하지 않았다.
- archive API digest와 압축 해제 installer SHA-256은 검증 대상이 다르며 재현 가능한 byte-for-byte build를 입증하지 않는다.
- `0.1.0` source version과 native filename은 검증했지만 공식 release, tag나 지원 다운로드 채널은 아직 없다.
- Stage 5 운영 증적 문서와 보고서는 canary 이후 추가되므로 remote `publish/task7`은 아직 Stage 4 canary를 가리킨다. 실행 경로가 바뀌지 않는다는 조건에서 최종 보고 절차가 이를 포함해 push해야 한다.

## 다음 단계 영향

- Stage 1–5가 모두 완료됐다. 작업지시자 승인 후 `task-final-report` 절차로 최종 보고서 작성, 오늘할일 완료 처리, 최종 커밋과 `publish/task7` push, `devel` 대상 Open PR 생성을 진행한다.
- 최종 remote native 검증 기준 SHA는 `02931beb43e2944083e78d792603bff82200478c`이고 CI run은 `30383886807`, native run은 `30384403366`이다.
- canary 뒤에는 운영 증적 문서와 `mydocs`만 추가됐다. executable, workflow나 공식 동작 문서가 바뀌면 이 전제를 폐기하고 원격 검증을 다시 수행해야 한다.
- 최종 보고서에서도 Actions build smoke와 공식 release·설치·signing·updater 미검증 경계를 유지한다.

## 승인 요청

- Stage 5 exact-SHA CI·native matrix, 다운로드 후 독립 inventory 검증과 운영 증적을 승인하면 `task-final-report` 절차로 최종 보고서와 PR 게시를 진행한다.
