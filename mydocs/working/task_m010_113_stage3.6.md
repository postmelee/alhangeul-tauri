# Task #113 Stage 3.6 — Fedora GTK loader 실행 조건 확인

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 승인된 Stage3 안의 로컬 container harness 하위 범위3.6
상태: 로컬 harness 검증 완료 / 실제 Fedora 수용과 Stage3 전체 진행
확인일: 2026-10-08 (Asia/Seoul)

## 단계 목적

RPM 실제 설치 후 GTK SVG loader abort를 실행 환경에서 구분한다. 제품P·기존 actual bytes는
그대로다. 새 실제 성공 전에는 원인 보정 효과나 RPM GUI 수용을 완료로 쓰지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-release-linux-files.yml` | 일회성 RPM container의 AppArmor 실행 조건 |
| `scripts/ci/accept-release-fedora.sh` | 같은 비root user의 실제 GdkPixbuf SVG/PNG 필수 사전 확인 |
| `tests/ci-release-linux-candidate.test.mjs` | 필수 loader·readonly mounts·제한된 실행 범위 계약 |
| 기존 계획·notes 안내·오늘할일 | 실제 성공/실패 분리 및 후속 검사 입력 |

## 본문 변경 정도 / 본문 무손실 여부

제품·WASM·native/upstream/lock·installer·candidate·JSON notes는 그대로다. 기존 dialog·document·
restart assertion·timeout·retry0·dependency resolution을 유지한다. privileged/cap-add·host policy/
daemon/sysctl 변경·credential 전달·Glycin 내부 sandbox off는 없다. 기록은 기존 승인 위치에 추가했다.

## 검증 결과

```bash
pnpm run test:automation
bash -n scripts/ci/accept-release-fedora.sh
pnpm run check:action-pins
pnpm run check:product-boundary
git diff --check
```

- automation1331/1331·fail/cancelled/skipped0, bash syntax·action pins29/165/11·boundary819·diff 통과.
- 초기 테스트의 local read helper scope1 오류를 바로잡았다. 최종 통과만 완료 범위에 포함한다.
- 기존 J fast37741256674는 Node/Windows 전체 success다.
- [Linux-file37741260462](https://github.com/postmelee/alhangeul-tauri/actions/runs/37741260462)은 전체
  failure다. ARM64 job만 실제 모든 gate success: 4 restart 및 DELETE 뒤21~51ms app exit다.
  evidence11533478392/sha256:79dee45877cc7dbf56a9d7667152d024e0235023c466547641af6029dfb38cdb.
- RPM은 candidate/install success·GUI failure. Gtk icon helper의 실제 image-missing.svg loading 중
  Glycin bwrap exit1로 abort했다. apps0·app없음·oom_kill0이다. evidence11533868937/
  sha256:08f08bb436d3fd9fdf88e72cf196897f6d6048c1f8b0343f18396a5011b5541b를 독립 검증했다.
- [Fedora 유사 보고](https://bugzilla.redhat.com/show_bug.cgi?id=2412232),
  [Docker AppArmor 공식 문서](https://docs.docker.com/engine/security/apparmor/)는 진단 참고다.
  actual container의 AppArmor 충돌과 보정 효과는 아직 가설이며 새 SVG/GUI 결과로 확인한다.

## 잔여 위험

- 새 실제 loader/RPM GUI와 독립 Fedora VM37741321797은 미검증/진행 중이다.
- ARM64 부분 성공을 Linux-file 전체 성공으로 쓰지 않는다. 기존 다른 플랫폼 제한과 공개 gate 유지다.

## 다음 단계 영향

새 harness SHA로 RPM-only를 실행하며 이전 J의 VM 입력은 유지한다. product는 P,
RPM은 ordinary37728636737·artifact11529712604의 69249334 bytes·73397d3d...다.
새 binary/signing은 만들지 않는다. 성공한 범위와 실패 run을 최종 수용에서 구분한다.

## 승인 기록과 진행 경계

Stage3 candidate/acceptance 필요 최소 보정 승인 안에서 같은 기능의 실제 검증 조건을 정렬했다.
전체 Stage3 완료·추가 제품 보정·Stage4·공개 승인은 포함하지 않는다.
