# Task #147 Stage 1 — rhwp v0.9.1 후보 검증 중간 기록

[수행계획](../plans/task_m010_147.md) · [PR #146](https://github.com/postmelee/alhangeul-tauri/pull/146)

검증 head `d6350b7b51fea3e58259957e5bae7adece8e9ab3`, upstream fixed `981ce66b4183b13c1a3b5907e04a8969c8c42034`. PR required [44708765183](https://github.com/postmelee/alhangeul-tauri/actions/runs/44708765183)는 성공했다.

[첫 native 검증 44746621403](https://github.com/postmelee/alhangeul-tauri/actions/runs/44746621403)은 전체 실패다. Windows/Linux 패키지와 세 코어 probe, Linux 썸네일 설치 수명주기, MSI·MSI 강제 재설치의 계약, 표준 사용자 NSIS API·수명주기 job은 성공했다. 표준 사용자 NSIS의 실제 문서 bitmap 12개·대조 이미지 4개와 제품 제거 성공을 원본에서 확인했다. MSI 강제 재설치 원시 결과는 재부팅 요구이며 계약만 통과했다. artifact `14639007288`에서 `reboot-required`와 `post-reboot-unverified`를 확인했다.

[관리자 문맥 NSIS job](https://github.com/postmelee/alhangeul-tauri/actions/runs/44746621403/job/136358695392)의 원본 artifact `14640455627` SHA-256 `07ebb8183243804686c76b6aa9675bf2923ded82e893352b25997ac38e6c799e`를 검산했다. 원래 알려진 `0x80040154` 12건 외에 `Alhangeul cycle 1 graceful-exit timeout`이 추가됐다. 닫기 요청 30초 뒤에도 창 handle과 응답 상태가 남아 있었다. 평가의 `invalid-common-evidence`와 집계 실패는 이 원본을 보존한다. 현상만으로 앱 코드 결함·러너 타이밍 중 어느 쪽인지 확정하지 않는다.

새 러너에서 같은 SHA로 [44758438233](https://github.com/postmelee/alhangeul-tauri/actions/runs/44758438233)을 실행해 재현 여부를 한 번 확인한다. 집계는 동일 시도의 모든 필수 job을 요구하므로 실패 job만 골라 재실행하지 않았다. Windows Explorer/PDF, Linux GUI는 성공한 정확한 producer가 확보되면 실행한다. 전체 실패 run의 설치 파일·ABI를 공개 수용으로 해석하지 않는다.

공개 v0.1.3의 NSIS/MSI/AppImage와 서명·inventory·체크섬을 canonical URL에서 다시 받았다. API hash·size와 세 Minisign을 검증했다. 추후 생산 업데이트는 이 기준선에 연결한다.
