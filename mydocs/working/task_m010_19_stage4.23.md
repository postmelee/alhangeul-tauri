# Task #19 Stage 4.23 — PR 리뷰 readback 및 예방적 보정

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.23

## 단계 목적

[PR #65 리뷰](https://github.com/postmelee/alhangeul-tauri/pull/65#issuecomment-5581655036)의
파일명 readback false-positive를 수정하고 필요한 예방적 정리만 수행한다. 작업지시자가
검토 권고 뒤 `진행해줘`로 승인했다. 실제 경로 뒤에 문자가 붙은 실패가 관측된 사건은 아니며,
코드/API 계약으로 확인한 검증기 취약점과 그 회귀 검사다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-win32.ps1` | 같은 readback을 private 함수로 분리, `text.Length + 2`로 NUL 외 추가 문자 관측 |
| `tests/gui/windows-dialog/filename-readback.ps1` | 87 LOC, 실제 격리 `#32770`/`Edit` HWND의 정상 4·거부 5 사례 |
| `tests/windows-pdf-native-diagnostics.test.ps1` | 기존 실행에 실제 readback 9개 연결, evidence의 native/제품 범위 구분 |
| `tests/windows-pdf-workflow.test.mjs` | 버퍼·함수/fixture 연결·Debug/자동 변수 회귀 정적 계약 |
| `scripts/windows-pdf-dialog-policy.ps1` | 두 selector의 `$matches`를 `$found`로 변경 |
| `apps/desktop/src-tauri/src/commands.rs` | `AppendPdfPageRequest`의 Debug 파생만 제거 |
| plans/orders/기존 최종 보고서 | 승인·checkpoint·실제 결과와 재사용 한계 정렬 |

## 본문 변경 정도 / 본문 무손실 여부

기존 실패/수용 기록을 유지하고 승인된 기존 `mydocs` 위치에 결과를 기록했다. 공식 문서,
workflow, 패키징, 의존성/lockfile, upstream, UI 화면은 수정하지 않았다. 같은 readback 함수를
실제 setter와 음성 사례 검사에서 사용하며 테스트 안에 판정 로직을 복제하지 않는다.

리뷰 2번·3번·6번 변수명은 반영했다. 1번의 단순 log-and-continue는 무동작 중 만료 회수
기한을 깨므로 채택하지 않았다. 4번 dialog 이후 snapshot, 5번 startup 성능, 6번 확인창의
owner/수명 guard도 유지했다. Rust Path 비교는 중간 `.`을 정규화하므로 리뷰의 그 예시는
성립하지 않는다. `..`/symlink 별칭의 기존 한계는 해결하지 않았으며 atomic replace가
lost-update까지 막는다고 주장하지 않는다. 이 기록으로 새 이슈나 구현 범위를 만들지 않는다.

## 검증 결과

로컬 명령:

```sh
pnpm run test:gui:windows:contracts
node --test tests/windows-pdf-confirmation.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
git diff --check
```

각각 **60/60**, **61/61**, **445 files**, diff 통과다. 중복 import를 합산하지 않으며 Node
문자열 계약을 실제 Windows 실행으로 세지 않는다. macOS에서 native 코드를 실행하지 않았다.

원격 checkpoint: `6c599633bc5dbe0c16d29351ae382cf7de36393b`. 로컬 통과 뒤 기존 승인된
원격 checkpoint 예외로 commit/push했다. 아래 두 workflow를 각각 한 번만 실행했다.

- [Windows dialog run 34205938455](https://github.com/postmelee/alhangeul-tauri/actions/runs/34205938455):
  **success, 49초**. 기존 dispatcher의 `mode=windows-dialog-verify`다. PS5.1 parser,
  policy **62/62**, native **59/59**(readback 9개 포함), 통합 **5/5**, cleanup 통과.
  Open/Save ASCII·한글 정확 경로 4개, 한 문자/긴/한글 접미사·짧은 값·동일 길이 불일치
  거부 5개를 실제 Win32 Edit로 검사했다. 음성 사례는 실제 HWND에 잘못된 값을 주입한 뒤
  setter가 사용하는 private readback을 호출한다. OS가 자발적으로 접미사를 붙였다는 뜻은 아니다.
  WinForms 통합은 Open/Fresh/Overwrite/Decline/WrongTarget과 source/target/other 사후 조건이다.
  fixture 프로세스 종료·디렉터리 삭제 성공. 후속 독립 cleanup의 state 없음은 이미 정리된 결과다.
  Windows `10.0.26100.0`, image `20260824.214.3`, PowerShell `5.1.26100.33296`.
  제품/PDF/build/updater는 미실행이며 evidence의 `productTested=false`를 확인했다.
  artifact `10047760859`, 22041 bytes, GitHub digest
  `sha256:af238f8c3600d481f0be0c78e805094a6af9fb3360e0a3f897ccbb87fb01401d`.
- [Windows Rust run 34205941583](https://github.com/postmelee/alhangeul-tauri/actions/runs/34205941583):
  **success, 8분 21초**. 기존 `ci.yml scope=pdf-cleanup-windows`, full CI skipped.
  `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --lib pdf_temp_cleanup::tests -- --nocapture`
  실행으로 Debug 제거가 포함된 desktop command 컴파일과 cleanup **6/6** 통과를 확인했다.
  0 failed/ignored, 92 filtered out. 컴파일 **5분 30초**, 실제 테스트 **2.70초**.
  Rust `1.98.1 (48a229cea 2026-09-01)`, Windows 2025. 기존 test-step-local resource 제외를
  그대로 사용했으며 설치본을 만들지 않았다. 전체 Rust test/Clippy 실행으로 해석하지 않는다.
  artifact `10048010575`, 7102 bytes, GitHub digest
  `sha256:0610e4f9805bd48776dc7871ca2fcaaad318c966530a63bab06da71a16da13aa`.

두 run의 정확한 SHA/success와 다운로드한 context/JSON/로그를 read-back했다. policy/native의
실패 0, 통합 5개 정확 목록·cleanup을 별도 assertion으로 확인했다. raw 증거는
`/private/tmp/alhangeul-task19-stage423.ODmGAG`에 보관하며 저장소에는 넣지 않는다.

결과 문서 5개·로컬 링크 59개·보고서 필수 섹션 7개·단계 기록 27개·orders 완료 시각과
diff 검사를 통과했다. 성공 checkpoint 뒤에는 결과 문서만 변경했으므로 소스 검사를 반복하지 않았다.

## 잔여 위험

- 이번 작은 Win32/WinForms 검증은 새 Alhangeul 설치본/PDF 수용이 아니다. 기존 제품 PDF
  결과를 재사용하며 새 checkpoint 제품 재빌드나 Linux 재실행을 주장하지 않는다.
- 요청의 Debug 제거는 예방 조치이며 기존 로그 유출을 발견했다는 뜻이 아니다.
- HWPX 표 조판과 실제 동시 편집/reload/장시간/재시작 통합 미실행은 기존 최종 보고대로 남는다.
- readback 이후 외부 변경이나 모든 Windows UI provider를 검증한 것은 아니다. 실제 파일
  identity/hash/문서/PDF 사후 조건 검사는 계속 필요하다.

## 다음 단계 영향

관련 보정과 필요한 Windows 검증이 완료됐다. 결과 문서와 기존 PR 본문만 갱신하며
추가 workflow를 반복하지 않는다. 최초 전체 PDF/수용 기록과 이번 좁은 검증을 구분한다.

## 승인 요청

보정된 PR #65의 리뷰/merge 판단을 요청한다. 별도 리뷰 답글·merge·issue close·릴리즈/
Pages/updater 게시와 추가 작업 등록은 수행하지 않는다.
