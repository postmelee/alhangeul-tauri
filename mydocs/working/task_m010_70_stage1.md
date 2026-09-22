# Task #70 Stage 1 보고서 — 보관·실행 준비

GitHub Issue: [#70](https://github.com/postmelee/alhangeul-tauri/issues/70)
구현계획서: [task_m010_70_impl.md](../plans/task_m010_70_impl.md)
Stage: 1

## 단계 목적

새 키 생성 전 보관 책임과 비밀 입출력 경계, 실행 가능한 도구를 확정한다.
준비 완료이며 키 생성·실제 백업 복구·Secret 전환 완료가 아니다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_70.md` | 승인된 Mac 키 관리 예외와 단계 상태 |
| `mydocs/plans/task_m010_70_impl.md` | 조사 결과, 사용자 직접 암호 입력·백업·복구 순서 |
| `mydocs/orders/20260920.md` | Stage 1 준비 완료·Stage 2 승인 대기 |

## 본문 변경 정도 / 본문 무손실 여부

기존 승인 범위와 과거 키 증거를 보존했다. 키 관리만 Mac에서 수행하도록 승인된 계획을
정합화했으며 제품 소스·공개키·Secret·원격 보호 규칙은 변경하지 않았다.
기존 키 백업과 #69 원래 worktree의 미커밋 변경은 그대로 보존했다.

## 검증 결과

실행 명령(실제 비밀 보관 위치 및 환경값은 기록하지 않음):

```text
Tauri CLI --version
Tauri CLI signer generate --help
Tauri CLI signer sign --help
GitHub Release/tag 및 release 환경 메타데이터 조회
GitHub Actions in_progress/queued/waiting 조회
git diff --check
```

- OK — 설치된 CLI가 `tauri-cli 2.10.1`이며 signer 명령 도움말이 정상 동작했다.
- OK — 고정 버전 공개 소스와 옵션을 대조했다. write-keys 생략 시 private key 출력,
  CI 모드의 빈 암호 경로를 금지하고, 사용자 숨김 입력과 파일 저장 방식을 선택했다.
- OK — 사용자는 비밀번호를 Apple 암호 앱, 암호화 백업을 iCloud에 보관하는 방향으로 승인했다.
  실제 새 항목 저장·원격 백업·복구 여부는 Stage 2에서 확인한다.
- OK — 공개/초안 Release 0개, `v0.1.0*` tag 없음, 조회한 세 활성 run 상태 각각 0개.
  release 환경은 required reviewer postmelee, deployment branch policy null이었다.
  두 signing Secret의 이름·갱신 시각만 확인했고 원문은 조회하지 않았다.
- 관측 — Colima Docker image 조회는 blob I/O 오류였다. 여유 용량만으로 원인을 규명하지
  못했으며 복구/초기화는 하지 않았다. 사용자가 키 관리만 Mac으로 바꾸도록 승인했고
  CLI 실행을 확인하여 이 단계의 실행 경로를 확보했다. Docker 정상화로 기록하지 않는다.
- 관측 — 발견된 기존 키 후보는 Tauri/Minisign 형식이었다. 승인된 빈 암호 1회 시험에서
  checksum 불일치로 사용 가능성을 확인하지 못했다. 다른 암호를 시도하거나 파일을 변경하지 않았다.
- OK — #69 미커밋 diff의 전후 SHA-256이 같음을 확인했다.
- OK — 문서 정합성 및 `git diff --check` 통과. 제품 빌드·signing CI는 실행하지 않았다.

## 잔여 위험

- 실제 키 생성·복구 서명·클라우드 동기화는 아직 미실행이다.
- iCloud와 암호 앱이 같은 Apple 계정에 의존한다. 계정 복구 책임은 사용자에게 있다.
- 기존 후보가 현재 앱의 키인지, 암호가 다른지 파일 손상인지는 확정하지 못했다.
- 현재 fingerprint를 포함하는 `docs/architecture/UPDATER.md`의 단일 값 정합화는
  기존 architecture 위치에서 Stage 3에 반영할 추가 문서 위치 승인 대상이다.
- 원격 상태는 일시적 관측이며 Secret 전환 직전에 다시 확인해야 한다.

## 다음 단계 영향

- Stage 2는 사용자 로컬 터미널에서 비밀을 직접 입력한다. 암호 값·스크린샷을 요청하지 않는다.
- 기존 원본/백업과 다른 새 위치에 생성하고, 새 iCloud 백업에서 복구한 키로 서명한다.
- 복구 검증 성공 전 Secret은 유지한다. 공개·tag·Pages·updater 활성화는 제외한다.

## 승인 요청

- 준비 결과와 사용자 직접 입력 절차를 승인하면 Stage 2 생성·백업·복구로 진행한다(승인 A).
- Stage 3에서 현재 공개 fingerprint의 `docs/architecture/UPDATER.md` 정합화도 승인 요청한다.
  기여자용 현재 신뢰 계약 문서의 기존 위치를 유지하며 과거 보고서 값은 수정하지 않는다.
