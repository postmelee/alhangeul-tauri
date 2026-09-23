# Task #69 Stage 1 — 첫 공개 범위와 최소 검증 기준 확정

GitHub Issue: [#69](https://github.com/postmelee/alhangeul-tauri/issues/69)
구현계획서: [task_m010_69_impl.md](../plans/task_m010_69_impl.md)
Stage: 1 · 작성일: 2026-09-22

## 단계 목적

첫 공개의 실제 차단 조건을 정리하고 기존 CI·사용자 VDI를 활용하는 최소 검증안을 확정한다.
완료 범위는 후보 준비 기준이며, 제품 설치 수용·릴리즈 공개 완료가 아니다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_69.md` | 기존 6종/11 asset·현재 pin 유지, 비게시 후보 진입 조건 조정 승인 기록 |
| `mydocs/plans/task_m010_69_impl.md` | 파일별 CI/VDI/미실행 표, 최소 실행량, 공개 전 별도 판단 경계 |
| `docs/releases/v0.1.0.md` | 역사적 No-Go와 현재 상태 분리, #70 키 준비 인계, Stage 1 완료 근거 |
| `mydocs/orders/20260920.md`, `20260922.md` | 기존 조사·#70 완료 보존, #69 준비 PR 대기 상태 |

## 본문 변경 정도 / 본문 무손실 여부

기존 미커밋 문서 4개는 `40aa0ec`, devel 통합은 `1cf5589`에 보존했다.
오늘할일 충돌은 양쪽 task 행을 유지했다. 과거 릴리즈 관측은 지우지 않고 최신 판단을 앞에 둔다.
이번 단계는 문서만 변경하며 native·설치·workflow·key·lock·공개 데이터는 수정하지 않았다.
공식 운영 정책을 완화한 것이 아니라 비게시 후보 준비 시점만 조정했다.

## 확정한 기준과 승인

- 기본 후보: `0.1.0` / `v0.1.0` stable, Windows x64 NSIS·MSI, Linux x64 AppImage·DEB·RPM,
  Linux arm64 DEB. 6 installer + 3 signature + inventory + SHA256SUMS = 11 asset.
- rhwp `v0.8.4` / `496333b27d21ddb9114ba9ae340bcb895870c9a7` 유지. upstream 갱신은 별도 작업.
- Windows Authenticode 미서명 경고와 updater Minisign의 다른 역할 유지.
  #70의 복구·Secret 정합화·서명 검증 완료를 인계한다. 비밀 값은 조회하거나 기록하지 않는다.
- 사용자에게 설명한 최소안에 대한 `진행해줘` 승인으로 일반 full·서명 각 1회, 기존 Linux x64 DEB
  GUI 1회, 최종 NSIS VDI 설치 1회를 기본으로 확정했다. 추가 full·새 CI 고도화·시험 N/N+1은 없다.
- 미확보 환경이 있어도 비게시 후보 준비는 진행할 수 있다. 그러나 해당 파일의 공개·검증 면제는
  승인되지 않았다. Stage 3에서 추가 확인 또는 구체적 범위/위험 결정을 별도 승인받는다.
- #58은 릴리즈 후, #67은 백로그로 유지한다. #69는 준비 PR merge로 종료하지 않는다.

## 검증 결과

2026-09-22 재실행 명령:

```bash
gh issue view 69 --json number,state,body,milestone
gh api --paginate repos/postmelee/alhangeul-tauri/releases
gh api repos/postmelee/alhangeul-tauri/environments/release
gh api repos/postmelee/alhangeul-tauri/environments/github-pages
gh api repos/postmelee/alhangeul-tauri/environments/github-pages/deployment-branch-policies
git ls-remote origin refs/heads/devel refs/heads/main 'refs/heads/publish/task69' 'refs/tags/v0.1.0*'
gh pr list --state open --json number,title,headRefName,baseRefName
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
node --test tests/release-metadata.test.mjs tests/product-version.test.mjs tests/pages.test.mjs
git diff --check
```

- OK: #69 OPEN/M010. Release 0개, 대상 tag 없음, 열린 PR 0개, publish/task69 없음.
- OK: devel `f82da34449521cb8b21d1adf2e42dba20ed9aecb`, main `69b4730a228a76cc121a1d08ef1b52ba530c22cb`.
- OK: release reviewer `postmelee`, self-review 허용, branch policy null. Pages는 devel만 허용.
  두 환경의 admin bypass는 true이며 이번에 변경하지 않았다. 권한 존재는 실행 승인과 구분한다.
- OK: version `0.1.0`, release metadata, rhwp pin/6 artifacts 정합성. Node 회귀 65/65 통과.
- OK: 원격 devel 기준 이번 작업 diff는 문서뿐이다. 문서 상대 링크와 `git diff --check`를 확인한다.
- 미실행: 새 원격 CI·서명·설치·PR 생성·tag·Release·Pages/manifest 게시.

## 잔여 위험

- 최종 main SHA와 게시할 파일은 아직 없다. #70 source `70fa1dd…`의 full `35683014919` attempt 1과
  서명 `35683016977` attempt 2는 키 준비 근거이지 최종 후보 수용 근거가 아니다.
- 현재 Windows installer reuse는 ordinary archive 전용이다. 서명 MSI 자체 설치·GUI는 미확보다.
- 최종 AppImage 실행·쓰기 자격·production 조회, Fedora RPM 의존성/GUI, arm64 GUI는 미확보다.
- Linux GUI의 실제 환경은 Ubuntu 22.04/Xvfb이며 launcher 파일 인자·taskbar 그룹핑 등 증거가
  없는 항목은 미검증으로 남긴다. hosted NSIS 제한과 MSI 재부팅 후 미검증도 유지한다.
- 위 위험의 공개 수용은 아직 승인되지 않았다. 6종을 줄이는 경우에도 inventory/Pages의 필수
  세 updater target 계약과 맞는 별도 변경 승인이 필요하다.

## 다음 단계 영향

1. 문서-only 준비 PR을 `publish/task69 → devel`로 생성한다. 완료/close 문구를 넣지 않는다.
2. PR 리뷰·merge 후 `devel → main` release PR을 별도로 승인받고 최종 source SHA를 고정한다.
3. 그 SHA로 빌드 입력과 비게시 서명 입력을 제시하고 실행 승인을 받는다.
4. 같은 bytes의 CI·GUI·VDI 확인 후 Stage 3 공개 판단을 한다. 재빌드하면 파일 검증도 다시 한다.

## 승인 요청

Stage 1 보고를 검토하고 문서-only 준비 PR 생성(`publish/task69 → devel`)을 승인 요청한다.
merge·release PR·빌드·서명·공개 승인은 포함하지 않는다. #69 전체 완료 보고와 정리는 아직 하지 않는다.
