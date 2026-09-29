# Task #69 Stage 3 — 최종 설치본 수용 결과

GitHub Issue: [#69](https://github.com/postmelee/alhangeul-tauri/issues/69)
구현계획서: [task_m010_69_impl.md](../plans/task_m010_69_impl.md)
Stage: 3 — 실제 파일 수용, 2026-09-29 결과 정리

## 단계 목적

게시 후보 6종의 같은 bytes를 설치·실행해 최소 문서 동작을 확인한다.
이번 보고는 승인된 추가 검증의 완료 기록이며 공개 승인이나 모든 기능의 검증 완료가 아니다.
제품 SHA는 `fc3cad15682f35723ab6558d1301e9096f7eec67`, 버전은 `0.1.0`,
upstream은 rhwp `v0.8.6`이다. 검증 중 제품 재빌드·재서명·공개는 하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-release-files.yml` | 기존 서명 MSI/AppImage 수용 |
| `.github/workflows/alhangeul-release-linux-files.yml` | 기존 RPM/arm64 수용, 컨테이너 실패 증거 보존 |
| `.github/workflows/alhangeul-release-fedora-vm.yml` | 동일 RPM의 Fedora 데스크톱 VM 수용 |
| `.github/workflows/alhangeul-desktop.yml` | 비게시 수동 진입 mode |
| `scripts/ci/release-*-candidate.mjs`, `accept-release-*.sh`, `release-fedora-*.sh`, `run-release-file-gui.sh` | 원본 후보 확인, 설치·GUI·실패 수집 |
| `tests/gui/specs/release-files.e2e.ts`, `tests/gui/wdio.release-files.conf.ts` | HWP/HWPX 수정 저장·재시작 재열기와 marker 확인 |
| `tests/ci-release-*.test.mjs`, `tests/actions-workflows.test.mjs` | 변조 거부·실패 전달·workflow 계약 |
| #69 계획·오늘할일·본 보고서 | 실제 결과와 잔여 위험 분리 |

## 본문 변경 정도 / 본문 무손실 여부

제품 소스·버전·pin·최종 설치본 bytes는 유지했다. 승인된 검증 harness만 추가·보정했다.
과거 실패 run을 삭제하거나 통과로 바꾸지 않았다. 원래 source SHA와 실행 harness SHA를 분리했다.

## 검증 결과

### 최종 후보와 실제 수용

일반 producer [36320353815](https://github.com/postmelee/alhangeul-tauri/actions/runs/36320353815),
서명 producer [36320371932](https://github.com/postmelee/alhangeul-tauri/actions/runs/36320371932)의
기존 원본 archive·inventory·개별 파일 SHA를 검증해 소비했다. 서명 대상 3파일의 Minisign도
앞선 후보 대조에서 확인했다. 자세한 archive ID/digest 이력은 구현계획서와 #69에 보존한다.

| 파일 | 환경과 확인 범위 | 결과·근거 |
|---|---|---|
| NSIS x64 | 사용자 Windows VDI 최종 설치 점검 | 사용자 “점검했어. 이상없어.”, 서명 producer artifact `10933208421`; 항목별 독립 캡처를 제출받았다는 뜻은 아님 |
| MSI x64 | Windows runner 설치·HWP/HWPX 수정/저장/재시작 재열기·제거·WebView2 정책 복원 | [36457019871](https://github.com/postmelee/alhangeul-tauri/actions/runs/36457019871) success |
| AppImage x64 | Ubuntu 22.04, 원본 FUSE 실행·쓰기 자격·같은 문서 시나리오 | [36455831548](https://github.com/postmelee/alhangeul-tauri/actions/runs/36455831548)의 AppImage job success; 전체 run은 당시 MSI 실패 |
| DEB x64 | Ubuntu 22.04/Xvfb, 문서·PDF·GTK/CUPS 인쇄·썸네일 등 8개 시나리오 | [36354317628](https://github.com/postmelee/alhangeul-tauri/actions/runs/36354317628) success |
| DEB arm64 | Ubuntu 24.04 native arm64, apt 의존성 설치·문서 수정/저장/재시작 재열기 | [36465315970](https://github.com/postmelee/alhangeul-tauri/actions/runs/36465315970)의 arm64 job success; 전체 run은 당시 RPM 실패 |
| RPM x64 | Fedora 44 Cloud 1.7 기반 KVM, dnf 설치·LightDM/Xfce/X11 로그인에서 같은 문서 시나리오 | [36513158401](https://github.com/postmelee/alhangeul-tauri/actions/runs/36513158401) 모든 필수 단계 success |

### Fedora VM 최종 증거

- harness SHA `c8844f958e7c8b2f2f7c89e5961a640a2f29194e`.
- 증거 artifact `11009958648`, 원본 ZIP SHA-256
  `98661376753ef6ab2f29ecfe96f1d3b3d3359af785d0b90e5d7b6f832b4da0af` 재계산 일치.
- 원본 RPM SHA-256 `6c87ba0321f6a9c8ca5068915217064f8c839cabaf3a8d60451df8f3e496308c`.
  VM 전송 후 다시 대조, 설치 조회는 `alhangeul x86_64 0.1.0-1`.
- cloud-init `done`, errors=[] / recoverable_errors={}; VM 및 GUI outcome 모두
  lastPhase=complete / exitCode=0. VM 종료와 artifact upload 성공.
- logind 증거: 비root acceptance 사용자, LightDM autologin, Xfce, X11, seat0/VT1,
  Remote=no/Active=yes. Xvfb·컨테이너가 아닌 실제 guest 데스크톱 세션이다.
- HWP/HWPX 두 scenario success. 참조 문서/이미지 4파일의 크기·SHA를 재검증하고,
  저장 문서 2개에서 `ALHANGEUL RELEASE FILE ROUNDTRIP 0123456789`를 pinned WASM으로 재확인했다.
- HWP와 HWPX 재열기 화면을 읽어 한글 본문·표 및 HWP의 추가 marker 표시를 확인했다.
  모든 페이지·글꼴의 시각적 동일성 검증을 뜻하지 않는다.
- 같은 RPM이 실제 Fedora VM에서는 통과했다. 이전 컨테이너에서 발생한 native Open 실패는
  환경에 따라 결과가 달라짐을 보여주지만, 정확한 컨테이너 원인이나 upstream 결함을 확정하지 않는다.

### 검증 명령과 이력

```bash
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/ci/release-fedora-vm*.sh
actionlint .github/workflows/alhangeul-desktop.yml .github/workflows/alhangeul-release-fedora-vm.yml
node --test tests/ci-release-fedora-vm.test.mjs
git diff --check
```

추가 검증 구현·보정 시 자동화 최종 990건 통과. VM workflow 추가 시 actionlint·제품 경계
688파일 통과. 마지막 hostname 설정 보정 후 관련 계약 3건·shellcheck·diff 통과.
이번 결과 확인에서는 성공한 native 검증을 반복하지 않고 원본 증거 ZIP·4파일 hash·2문서 marker와
대표 화면을 검증했다. 최초 VM의 로그 권한 오류 및 다음 VM의 hostname 경고는 과거 실패로 보존한다.

## 잔여 위험

- Windows hosted NSIS Shell 썸네일 원시 실패 12건과 lifecycle 통과의 차이는 유지한다.
  VDI 사용자 점검과 이번 다른 형식의 문서 검증으로 그 원시 실패를 성공으로 바꾸지 않는다.
- MSI 강제 재설치 3010 관측 이후 실제 재부팅 후 검증은 미실행이다.
- Wayland/GNOME·모든 Linux 배포판·모든 글꼴·물리 프린터·모든 launcher/Shell 조합을 검증한 것이 아니다.
  Fedora 결과는 명시한 Cloud 기반 Xfce/X11 VM에 한정한다.
- Windows Authenticode 미서명과 updater Minisign의 역할 차이를 유지한다.
- production updater 조회·Pages/manifest 전환은 공개 이후 승인된 별도 단계다.

## 다음 단계 영향

추가 요청한 MSI·AppImage·RPM·arm64의 설치/문서 수용 공백은 위 환경 범위에서 해소됐다.
제품이 같으므로 사용자 Windows 재점검이나 후보 재빌드는 필요 없다.
현재 공개 판단은 **승인 전 보류**다. 검증 변경 검토와 잔여 위험 수용, 정확한 tag/11개 asset/notes의
공개 실행안 확정 후 Stage 4로 진행한다. #69는 OPEN이며 릴리즈 전체 작업은 완료하지 않았다.

## 승인 요청

본 수용 결과와 잔여 위험을 검토한 뒤 공개 준비 범위를 결정한다.
이 보고서 작성은 tag·draft·stable 공개·Pages/updater 활성화 승인을 대신하지 않는다.
