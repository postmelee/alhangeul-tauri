# Task #69 Stage 4 — 동일 파일 공개와 원격 무결성 검증

GitHub Issue: [#69](https://github.com/postmelee/alhangeul-tauri/issues/69)
구현계획서: [task_m010_69_impl.md](../plans/task_m010_69_impl.md)
Stage: 4

## 단계 목적

승인한 제품 SHA와 설치본을 tag·draft·stable 순서로 게시하고 각 단계의 원격 bytes를 확인한다.
작업지시자는 tag/draft와 stable 전환을 각각 `진행해줘`로 승인했다.

## 산출물

| 파일 / 산출물 | 변경 요약 |
|---|---|
| GitHub Release v0.1.0 | ID 399698591, 승인한 11개 파일과 본문을 stable/latest로 공개 |
| `docs/releases/v0.1.0.md` | 공개 시각·tag·파일·서명 read-back 결과 |
| `mydocs/plans/task_m010_69_impl.md` | Stage 4 완료와 Stage 5 승인 경계 |
| `mydocs/orders/20260930.md` | #69 진행중, Stage 4 완료 |

## 본문 변경 정도 / 본문 무손실 여부

공식 기록의 과거 준비·실패·승인 기록을 유지하고 최신 결과를 추가했다. 제품·공개 파일·서명·
Release 본문은 변경하지 않았다. 기존 승인 위치만 사용했다.

## 검증 결과

실행 명령 (저장소는 postmelee/alhangeul-tauri):

```bash
gh api user --jq .login
gh release view v0.1.0 --json url,tagName,isDraft,isPrerelease,publishedAt,assets,body
git ls-remote origin refs/tags/v0.1.0 'refs/tags/v0.1.0^{}'
gh release download v0.1.0 --repo postmelee/alhangeul-tauri --dir /tmp/task69-stable-readback-20260930/assets
gh api repos/postmelee/alhangeul-tauri/releases/latest
node /tmp/task69-verify-stable.mjs
git diff --check
```

- 실행자 postmelee. draft와 stable은 별도 새 폴더에 내려받아 대조했다.
- stable API: draft=false, prerelease=false, latest ID=399698591.
- 원격 11개 파일 이름·크기·SHA-256/API digest 일치, checksum 자체와 대상 10개 일치.
- 원격 설치본의 Minisign 3개 검증 및 complete inventory 전체 일치.
- 본문은 CRLF/말미 개행 정규화 후 승인 텍스트 일치.
- tag object `3b6b4bc5eef0a5e290b8060b81191c5460cc4c63`,
  peeled product SHA `fc3cad15682f35723ab6558d1301e9096f7eec67` 일치.
- 임시 검증 스크립트는 저장소 `createReleaseInventory`를 호출해 서명을 검증했다.
  영구 파일 hash 목록은 공식 버전 기록에 보존했다.

## 잔여 위험

Stage 3에서 수용한 NSIS hosted 썸네일 실패, MSI 3010 재부팅 후 미검증, Windows Authenticode
미서명과 환경·글꼴·물리 인쇄 범위 제한은 유지한다. production updater는 아직 전환하지 않았다.

## 다음 단계 영향

Stage 5에서 실제 공개 URL·시각·inventory를 사이트 데이터에 반영하고 로컬 회귀를 확인한다.
데이터 PR 생성/병합과 exact Pages SHA 배포는 별도 승인 후 수행한다. 재빌드나 Windows 재점검은 필요 없다.

## 승인 요청

Stage 4 결과 검토와 Stage 5 사이트·updater 데이터 변경 및 로컬 검증 착수를 요청한다.
#69는 Stage 5~6이 남아 있으므로 종료하지 않는다.
