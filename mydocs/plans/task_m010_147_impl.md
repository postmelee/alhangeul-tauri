# Task #147 — v0.1.4 구현계획

[수행계획](task_m010_147.md) · [#147](https://github.com/postmelee/alhangeul-tauri/issues/147) · M010

| Stage | 산출물 | 검증 |
|---|---|---|
| 1 | #146 exact source 수용 근거 | required, all/full native, Windows PDF·Explorer, Linux GUI 및 원시 증거 |
| 2 | 버전 설정과 릴리즈 기록, devel→main 승격 | 5개 version 표면, pin, boundary, notes, 필수 CI와 merge tree |
| 3 | main exact source의 일반·서명 비게시 파일 및 후보 입력 | 배포 파일 6종의 package layout·고지·설치/실행·문서, Windows 10/11 Explorer, 동일 형식 업그레이드 확인 |
| 4 | GitHub Release 및 Pages | exact 11개 파일, 승인된 최종 notes, tag, 공개 파일·피드 서명 재조회 |
| 5 | production 업그레이드, 최종 기록과 정리 | 기존 공개 v0.1.3에서 세 자동 업데이트 경로와 수동 안내 확인, 보고 PR·이슈·브랜치·작업공간 정리 |

공식 릴리즈 기록·원문은 `docs/releases/`, 웹 데이터는 `site/`, 계획·단계별 보고와 후보 식별자는 `mydocs/`의 승인된 경로를 사용한다. 버전 변경 준비는 Stage 1의 CI와 병행할 수 있다. 통합은 선행 수용을 기다린다. 검증 파일과 비공개 진단은 T7에 보관한다.

## 실행 계약

- #146의 head와 base·required 성공을 재확인한다. [44746621403](https://github.com/postmelee/alhangeul-tauri/actions/runs/44746621403)의 필수 결과와 installer의 원시 판정을 함께 확인한다. Windows PDF 및 Linux GUI는 성공한 run의 exact artifact를 사용한다.
- Windows Explorer는 현재 guest harness에서 신선한 NSIS/MSI 설치를 확인한다. 과거 업그레이드 경로는 최초 v0.1.3의 해시, 버전, 같은 버전 MSI identity를 요구한다. v0.1.4 업그레이드의 입력이나 성공 판정으로 재사용하지 않는다.
- 최종 공개 파일은 같은 main SHA의 비게시 run에서 가져온다. AppImage/NSIS/MSI의 production Minisign과 세 수동 패키지의 hash를 대조한다. 서명 환경 reviewer와 보호 규칙을 적용한다. Authenticode 미서명·Smart App Control은 따로 기록한다.
- Studio WOFF2는 같은 rhwp 태그의 파일별 고지와 대조한다. 다른 6개는 그 태그의 검증된 입력으로 교체한다. 글꼴 원문은 `assets/fonts/licenses/studio/`에 보존하고 패키지 `licenses/`에 배치한다. 이전 PDF·썸네일 fallback 입력은 별도로 검증한다.
- 릴리즈 노트 원문은 스키마에 필요한 실제 source, 6개 size/hash 및 inventory가 확보된 뒤 확정한다. 공개 전후 검증·복구는 runbook을 따른다. 각 단계의 검증·근거를 해당 기록에 묶어 Task #147 커밋으로 남긴다.
