# Task #70 Stage 3 보고서 — 새 키 CI 서명과 산출물 독립 검증

GitHub Issue: [#70](https://github.com/postmelee/alhangeul-tauri/issues/70)
구현계획서: [task_m010_70_impl.md](../plans/task_m010_70_impl.md)
Stage: 3, 검증일: 2026-09-22

## 단계 목적

복구 검증한 새 공개키로 제품의 신뢰 기준을 전환하고, GitHub Secret의 키·암호 조합이
실제 Windows/Linux installer 서명을 생성하는지 확인한다. 공개 릴리즈 수용은 별도다.

## 산출물

| 대상 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/tauri.updater.conf.json` | 복구 검증한 공개키로 교체 |
| `scripts/check-release-metadata.mjs`, `tests/release-metadata.test.mjs` | 새 fingerprint 고정·이전 유효 키 거부 회귀 |
| `docs/operations/DESKTOP_RELEASE.md`, `docs/architecture/UPDATER.md` | 현재 fingerprint 정합화 |
| release 환경 signing Secret 두 개 | 사용자 숨김 입력·로컬 서명 검증 후 동일 값 등록 |
| 본 보고서·계획·오늘할일 | 실행 근거와 수용 한계 |

## 본문 변경 정도 / 본문 무손실 여부

후보 커밋은 `70fa1dd407ec4abcbe3cf496f7ec01aee884377c`다. version·endpoint·native·installer·lock·
workflow는 변경하지 않았다. 과거 #16의 fingerprint·검증 기록과 #69 미커밋 변경을 보존했다.
보고서 커밋은 증거 문서만 추가하며 검증한 source SHA를 소급 변경하지 않는다.

## 검증 결과

로컬 명령:

```text
pnpm run check:product-version
pnpm run check:release-metadata
node --test tests/release-metadata.test.mjs tests/updater-release.test.mjs tests/pages.test.mjs
pnpm run check:updater-artifacts --root <다운로드·검증한 bundles> --version 0.1.0 --tag v0.1.0 --source-sha 70fa1dd407ec4abcbe3cf496f7ec01aee884377c --public-key-env TASK70_PUBLIC_KEY
git diff --check
```

- OK — 제품 버전·metadata 검사, Node 회귀 69/69, 실패·skip 0.
- OK — [fast 35681649719](https://github.com/postmelee/alhangeul-tauri/actions/runs/35681649719/attempts/1), attempt 1 성공.
- OK — [full 35683014919](https://github.com/postmelee/alhangeul-tauri/actions/runs/35683014919/attempts/1), attempt 1 성공.
  세 core·세 제품 target 및 Windows NSIS/MSI/MSI 강제 재설치 계약과 집계 성공.
  설치 계약 성공은 모든 환경의 실제 썸네일 생성이나 재부팅 후 성공을 보장하지 않는다.
- 실패 보존 — [서명 attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/35683016977/attempts/1)은
  두 target의 키 복호화 실패였다. 사용자가 생성 암호와 보관된 암호의 불일치를 확인하고 수정했다.
  검증한 동일 입력으로 재등록한 두 Secret 갱신 시각은 `2026-09-22T04:20:59Z`다. Secret 원문은 조회하지 않았다.
- OK — 승인 후 실패 job을 재실행한 [서명 attempt 2](https://github.com/postmelee/alhangeul-tauri/actions/runs/35683016977/attempts/2) 성공.
  Windows build `04:23:26–04:46:43Z`, Linux build `04:23:27–04:35:57Z`, inventory 검증 `04:46:46–04:47:05Z`.
  아래 세 artifact 생성 시각은 각 attempt 2 producer 실행 구간에 속한다. attempt 1 artifact는 0개였다.
- 모든 CI head SHA와 서명 build_ref는 위 후보 SHA에 일치한다. 미게시 입력은 구현계획서에 기록했다.
- OK — 정확한 artifact ID로 받은 ZIP 3개의 SHA-256을 API digest와 비교했다. 모두 일치하고 만료되지 않았다.

| Artifact | ID | ZIP SHA-256 | 생성 시각 UTC |
|---|---|---|---|
| alhangeul-updater-windows-x64 | 10677169782 | `4368a5842765e28df1fad10331b5a3d11e6dea452ccdf90c83bc2a466dab3734` | 04:46:39 |
| alhangeul-updater-linux-x64 | 10676774057 | `38b8ec16b3f9e5b3c2c797147b7f0ff915da81dfd3400dfa20b62b298ef78b83` | 04:35:54 |
| alhangeul-updater-release-inventory | 10677411274 | `77acb7826777106f1181c5d5f2063f4ccbc80cc6055824c1b70624b838914475` | 04:47:02 |

- OK — 추출한 세 installer의 실제 bytes와 `.sig`를 새 공개키로 검증했다.
  fingerprint: `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`.
- OK — 기존 `createReleaseInventory`로 크기·hash·서명·URL·source·version·tag를 재계산하여
  CI complete inventory와 deep equality를 확인했다. CLI 검사도 세 target 모두 성공했다.

| Installer | Bytes | SHA-256 |
|---|---|---|
| NSIS x64 | 55243202 | `569300d637a315c16d541afeeaf488cc2dd3dcdf8020977836d53b43d53e93bf` |
| MSI x64 | 62181376 | `8cb1bd3c94fbc958ae5d3f65ffac80075641b69fdc675293fbabb28a81925bfb` |
| AppImage x64 | 134007288 | `90033e95c15942155024522a6fc693fcb4dd5853bf383ea16027f7a8b51dfbd0` |

- OK — publish job skipped, GitHub Release 목록 비어 있음, 원격 `v0.1.0*` tag 없음.
  Pages 게시·updater 활성화는 실행하지 않았다. inventory URL은 예정 주소이지 게시된 asset의 증거가 아니다.
- 로컬 공개 산출물은 `/private/tmp/alhangeul-task70-signed.dvrGNRAW`에 다음 인계를 위해 유지한다.
  이 위치에는 개인키·암호가 없다. 원본·암호화 백업은 삭제하지 않았다.

## 잔여 위험

- 이번 수용은 키 전환과 서명·artifact 검증이다. #69 최종 후보의 실제 설치 확인 및 공개 후
  N→N+1 업데이트 수용을 대체하지 않는다. 과거 키를 신뢰하는 시험본에는 재설치가 필요하다.
- 암호 재사용 및 iCloud/암호 앱의 계정 의존 위험은 남는다. 비밀값이나 실제 비밀 경로는 기록하지 않는다.
- Actions artifact는 만료될 수 있다. 이후 재사용 시 ID·digest·만료 및 exact bytes를 다시 확인한다.

## 다음 단계 영향

- Stage 4에서 최종 보고와 #69 인계를 정리한다. 새 CI 구조나 제품 기능을 추가하지 않는다.
- 공개키·Secret은 새 쌍으로 정합화됐다. 과거 공개키 source의 서명 실행을 피한다.
- full은 ordinary bytes 검증, 서명 run은 별도 생성 bytes 검증이다. 두 파일 집합이 동일하다고 주장하지 않는다.

## 승인 요청

- Stage 3 결과를 승인하면 Stage 4 최종 보고·#69 인계 준비로 진행한다.
- PR 게시·merge 및 첫 공개 릴리즈는 각각 승인 경계를 유지한다.
