# Task #113 Stage 4.4.1 — 고정 production 회귀 입력 보정

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 4.4.1 — PR119의 고정 upgrade 회귀 입력 정합화
상태: 명시 승인한 보정·로컬 전체 automation 수용 / 새 head PR required 확인 예정
확인일: 2026-10-09 02:21 (Asia/Seoul)

## 단계 목적

[PR119](https://github.com/postmelee/alhangeul-tauri/pull/119)의 최초 CI가 historical010→011 회귀2건과
새 site012 데이터의 혼합 때문에 실패했다. 기존 fixed upgrade의 strict 계약을 recorded next011
공개 원문에 연결하고 새 사이트의 version 전환과 구분했다. 실제 production upgrade 입력/CLI는 그대로다.
준비한1파일 diff·별도 검토본59/59를 제시한 뒤 작업지시자가 “고정 회귀 입력 보정·재검증 (권장)”을
명시 승인했다. 승인 근거 기록 `2026-10-08T17:18:56.148Z`, patch SHA256
`d77dd76b7f92e2d041628ff7f560a7ede57f0cff9e5478471fd7f2d98244a1ec`다.

## 산출물

| 파일 | 변경 |
|---|---|
| `tests/production-upgrade.test.mjs` | 현재 site 대신 spec.next의 published 원문으로 고정 manifest/inventory 입력 재구성 |
| 기존 계획·release 기록·최종 보고·오늘할일 | actual 최초 CI 실패·한정 승인·로컬 수용과 새 CI 대기 연결 |
| 임시 최초 전체 CI/로컬 실패·검토본/actual 성공 로그 | old failure를 보존하며 동일 source blind rerun 없음 |

## 본문 변경 정도 / 본문 무손실 여부

단위 회귀1파일의 fixture 입력만 바꿨다. 기존 manifest hash 검산·변조 거부·inventory source/path
음성 assertion을 유지한다. runtime `production-contract/updater CLI/workflows`, 010→011
`tests/gui/production-upgrade-inputs.json`, MANIFEST_HASH·native/app/key/endpoint·site/body/manifest는
바꾸지 않았다. skip·timeout·시험 수·assertion 기준 변경이 없다. source295→306LOC는 exact
recorded manifest 재구성11행과 기존59계약 맥락을1파일에 두는 최소 diff이며 권장300LOC 예외를 계획에 기록했다.
문서 위치는 기존 승인 tracking/제품 release 기록이다. 새 source/head에서만 PR CI를 자동 실행한다.

## 검증 결과

```bash
node --test tests/production-upgrade.test.mjs
pnpm run test:automation
git diff --check
# 정상 push 후 PR119 synchronize의 자동 required를 실제 새 merge candidate에서 확인
```

- 최초 [CI37814746426](https://github.com/postmelee/alhangeul-tauri/actions/runs/37814746426)
  attempt1/head a414f536/merge59d4a11c/tree52f7a089는 전체 failure다. Node automation1329/1331·fail2,
  Windows production57/59·fail2·notes124pass, required failure를 보존했다. 부분 결과를 전체 수용으로 쓰지 않는다.
- 같은2건을 로컬에서도57/59로 재현했다. 기존 spec011 hash654efd7e.../source96e89e90...과
  새 site012 hash58ca348b.../source6dcb05e9...의 비교였다. actual 공개 파일/서명·제품 기능 실패가 아니다.
- source 수정 전 별도 임시 검토 tree에서59/59를 확인했고, 명시 승인 후 실제1파일 diff를 적용했다.
  actual production59/59, 전체 automation1331/1331·failed/skipped0·diff check 수용이다.
- 전체 automation에 기존 notes124·Pages/updater151·모든 negative 계약도 포함된다. 이전 source/site와
  승인 생성물/body/manifest hashes는 동일하다. 새 제품/native/production upgrade를 실행하지 않았다.
- 새 PR head의 actual required 결과는 push 후 확정한다. 이전 run rerun/cancel·force·skip·보호 변경은 없다.

## 잔여 위험

- 최초 CI 실패는 해결된 과거 기록이며 새 head required는 아직 미확인이다. 통과 전 merge 승인 요청을 하지 않는다.
- 현재 production site/feed011·실제011→012 미실행이며 Gate5 data merge·exact Pages 배포와 Gate6가 남았다.
- NSIS thumbnail·MSI3010 post-reboot·Authenticode 및 Stage4.2의 지원/미검증 한계는 그대로다.

## 다음 단계 영향

보정·보고를 묶은 새 commit을 정상 ff로 기존 PR119에 반영하고 실제 head/tree·Node/Windows/required를
확인한다. 합격 뒤 PR 일반 merge 승인, actual merged devel full SHA의 Pages/manifest 승인으로 이어간다.

## 승인 요청

Stage4.4.1 보정·수용과 새 actual PR required를 검토하고 PR119 일반 merge를 승인한다. #113은 OPEN 유지다.
