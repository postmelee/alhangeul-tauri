# Task #15 Stage 4.3 완료 보고서 — Linux pagination 보정 exact-SHA 후보 handoff

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.3

## 단계 목적

Stage 2.3의 Linux WebKitGTK 교대 빈 쪽 보정을 포함한 exact source SHA로 CI와
Windows/Linux native bundle을 다시 만들고, 지원 bundle의 inventory를 독립
검증했다. workflow가 만든 Linux x64 DEB 자체를 Ubuntu 24.04 x64 GUI 환경에
설치해 CUPS-PDF, GTK `Print to File`, 앱 직접 PDF의 6쪽 결과까지 확인했다.

## exact 후보

| 항목 | 값 |
|---|---|
| source branch | `publish/task15` |
| candidate SHA | `d194050194a754cded496422a2fe0cf37331f723` |
| source commit | `Task #15 [Stage 2.3]: Linux GUI 검증 보고` |
| Linux 보정 commit | `eb7721c26e0f1b85d203a9b2dc67cef3e279cc29` |
| base 경계 | 미merge Task #13 exact SHA `63a2703cebf3a79d11a010974203fdaf4ccd3e76` 포함 |
| CI | [Alhangeul CI #31468117166](https://github.com/postmelee/alhangeul-tauri/actions/runs/31468117166) — success |
| native bundle | [Desktop Artifact Build #31468122093](https://github.com/postmelee/alhangeul-tauri/actions/runs/31468122093) — success |
| Windows 다운로드 | [`alhangeul-desktop-windows-x64`](https://github.com/postmelee/alhangeul-tauri/actions/runs/31468122093/artifacts/9092493835) |
| artifact 만료 | 2026-08-25 |

두 workflow 모두 `workflow_dispatch`, `publish/task15`, 위 candidate SHA를 가리키며
완료 상태와 각 job 성공을 GitHub API로 재확인했다. release tag, GitHub Release,
서명, updater, package repository 게시는 수행하지 않았다.

## 산출물

| 산출물 | 결과 |
|---|---|
| CI Unit tests | success — product/version/rhwp pin, automation, upstream, Studio build/test, desktop Rust test와 Clippy 통과 |
| Build windows-x64 | success — MSI·NSIS build, inventory 검증·upload |
| Build linux-x64 | success — AppImage·DEB·RPM build, inventory 검증·upload |
| Build linux-arm64 | success — DEB build, inventory 검증·upload |
| Smoke Windows x64 installers | success — exact SHA 확인, MSI·NSIS 설치·실행·제거와 post-clean 통과 |
| Linux x64 exact GUI | workflow DEB 설치 후 6쪽 문서 로드, system print와 direct PDF 검증 통과 |

업로드 artifact:

| 이름 | Artifact ID | GitHub archive size | 만료 |
|---|---:|---:|---|
| `alhangeul-desktop-windows-x64` | `9092493835` | 101,010,221 bytes | 2026-08-25 |
| `alhangeul-desktop-linux-x64` | `9092548245` | 501,368,132 bytes | 2026-08-25 |
| `alhangeul-desktop-linux-arm64` | `9092367773` | 163,895,534 bytes | 2026-08-25 |
| `alhangeul-desktop-windows-x64-installer-smoke` | `9092567321` | 31,098 bytes | 2026-08-25 |

독립 inventory 검증 결과:

| 플랫폼 | 종류 | 파일 크기 | SHA-256 |
|---|---|---:|---|
| Windows x64 | MSI | 52,776,960 bytes | `7adc3c4b174586519e41a90262b2c828923f4de43bf0db0822cc9712ea4466bf` |
| Windows x64 | NSIS | 48,461,549 bytes | `c6ca246c1f4a76dfb439496264907adf1ff6880b87169254254fa7d1f9b55784` |
| Linux x64 | AppImage | 131,127,800 bytes | `8fa7722cbde1012981af9ee943eee3f5ca3c062621a84fe79dadb9d8414e17a2` |
| Linux x64 | DEB | 54,711,442 bytes | `d5e08e39aa18ef52de0d51b1b3592c8cf2d8bce10f63ba3653ceba9c85dc8e8e` |
| Linux x64 | RPM | 54,711,380 bytes | `f897bdde4ec01981128a01d7326c7879b4967a433ae2ff62a1b4ea7026c80ad3` |
| Linux arm64 | DEB | 54,669,638 bytes | `d12ed55709709fadf74c7a0c9ec488141d787f56a018debe87fc3520ac8eea8e` |

Windows installer smoke 진단은 checked-out SHA
`d194050194a754cded496422a2fe0cf37331f723`, expected version `0.1.0`, MSI와
NSIS의 install/uninstall/post-clean을 모두 `passed`로 기록했다.

## 본문 변경 정도 / 본문 무손실 여부

candidate SHA 이후 제품 코드는 변경하지 않았다. 이 Stage는 exact workflow,
artifact와 GUI 검증 결과를 보고서와 오늘할일에 고정한다. `third_party/rhwp`,
browser visible preview, Windows upstream print stylesheet, page SVG, HWP/HWPX 저장,
searchable direct PDF 데이터에는 추가 변경이 없다.

Linux 보정은 동일 물리 크기 문서의 Tauri hidden print surface에만 적용된다. workflow
DEB의 설치 실행파일 SHA-256은
`c2cba98e6c3008d6b1c88e8c6ce76d7f457c8dabde944969de740948b334d57b`다.

## 검증 결과

### Workflow와 artifact gate

실행 명령:

```bash
git push origin HEAD:refs/heads/publish/task15
gh workflow run ci.yml --repo postmelee/alhangeul-tauri --ref publish/task15
gh workflow run alhangeul-desktop.yml --repo postmelee/alhangeul-tauri \
  --ref publish/task15 \
  -f build_ref=d194050194a754cded496422a2fe0cf37331f723 \
  -f run_tests=true
gh run view 31468117166 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run view 31468122093 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download 31468122093 --repo postmelee/alhangeul-tauri --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform windows-x64 \
  --root <artifact-root> --verify-inventory <inventory-path>
pnpm run check:desktop-artifacts -- --platform linux-x64 \
  --root <artifact-root> --verify-inventory <inventory-path>
pnpm run check:desktop-artifacts -- --platform linux-arm64 \
  --root <artifact-root> --verify-inventory <inventory-path>
```

결과:

- OK — CI exact SHA의 Unit tests job과 desktop Rust test·Clippy가 모두 성공했다.
- OK — Windows x64, Linux x64, Linux arm64 native build와 inventory upload가 모두 성공했다.
- OK — 독립 다운로드한 모든 지원 bundle의 필수 종류, 크기와 SHA-256이 inventory와 일치했다.
- OK — Windows installer smoke가 exact SHA에서 MSI·NSIS 모두 통과했다.

### Linux workflow DEB GUI gate

환경:

- Colima x86_64 VM, Ubuntu 24.04.4, WebKitGTK 2.52.3, GTK 3.24.41
- workflow artifact의 `Alhangeul_0.1.0_amd64.deb`
- 문서: 6쪽 `biz_plan.hwp`

| 경로 | 결과 | SHA-256 |
|---|---|---|
| CUPS-PDF | A4 6쪽, 쪽별 non-space text `45/54/408/637/478/250`, 빈 쪽·잘림 없음 | `fbaedc933b9456fc3f2b5520dfc2d6e5a4c5268dae1cddb05358ea7f43e9ed8b` |
| GTK `Print to File` | A4 6쪽, 쪽별 non-space text `45/53/408/637/478/250`, 빈 쪽·잘림 없음 | `0670bcc8d5fadb438e98416d9431ce06b4a9f12471539cad56117314cd541e22` |
| `파일 > PDF로 저장` | A4 6쪽, 쪽별 non-space text `45/642/410/638/478/250`, 검색 가능한 text 유지 | `660d0571ce8ecba24f66668023d060c989919fe9e3be76841979b546685bec63` |

`pdfinfo`, 쪽별 `pdftotext`, Poppler 6쪽 렌더와 육안 검사를 함께 사용했다. 세
경로에서 왼쪽 치우침, 교대 빈 쪽, 본문 잘림을 발견하지 않았다. 로컬 증거는
`.codex-task15-linux-evidence-d194050/`, exact DEB는
`.codex-task15-exact-artifacts-d194050/`에 보존했다.

## 잔여 위험

- Windows installer smoke는 GUI system print dialog와 실제 page surface 내용을
  검증하지 않는다. 새 exact MSI·NSIS 중 하나에서 수동 GUI 인쇄 회귀 확인이 남았다.
- Linux x64 GUI는 workflow DEB로 확인했다. AppImage·RPM은 inventory와 package build
  gate를 통과했지만 별도 GUI 설치·실행 경로를 각각 반복하지 않았다.
- Linux system-print PDF를 Poppler로 렌더할 때 일부 Type 3 glyph의 bounding box
  경고가 출력된다. 6쪽 렌더, 한글 표시와 text 추출은 정상이며 빈 쪽 보정 실패와는
  구분한다.
- 혼합 물리 page size의 GTK media 전환과 Task #13의 미merge 상태는 이전 보고서와
  동일하게 남아 있다. #13 merge 전에는 #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Windows exact artifact에서 별도 Alhangeul preview 없이 system dialog가 직접
  열리고, 단일·다중 페이지와 취소·반복 인쇄가 정상인지 확인한다.
- Microsoft Print to PDF 결과의 쪽 수·한글·표·이미지와 `파일 > PDF로 저장`의
  searchable PDF 회귀를 함께 확인한다.
- Windows 수동 gate가 통과해도 Task #13 merge 전에는 #15 PR을 만들지 않는다.

## 승인 요청

- 위 Windows artifact를 내려받아 exact GUI gate를 확인하고 결과를 알려주면 Stage 4
  최종 판정과 다음 의존 단계로 진행한다.
