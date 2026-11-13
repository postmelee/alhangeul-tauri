import { invoke } from '@tauri-apps/api/core';

/** This choice affects Alhangeul's next startup, not WebView2's own traffic. */
export function createUpdatePreferences(): HTMLElement {
  const section = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = '자동 업데이트 확인';
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.disabled = true;
  checkbox.dataset.testid = 'automatic-update-checks';
  label.append(checkbox, document.createTextNode('앱 시작 시 새 버전 확인'));
  const description = document.createElement('p');
  description.textContent = '기본값은 꺼짐입니다. 켜면 다음 실행부터 GitHub에 새 버전을 확인하며 IP 주소 등 접속 정보가 처리될 수 있습니다. 다운로드·설치는 별도로 선택합니다. 이 설정은 WebView2의 Microsoft 통신에는 적용되지 않습니다.';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = '설정을 불러오는 중…';
  section.append(legend, label, description, status);
  void invoke<boolean>('updater_get_automatic_checks').then((enabled) => {
    checkbox.checked = enabled;
    status.textContent = enabled ? '자동 확인이 켜져 있습니다.' : '자동 확인이 꺼져 있습니다. 수동 확인은 사용할 수 있습니다.';
  }).catch(() => {
    status.textContent = '저장된 선택을 읽지 못했습니다. 여기서 설정을 다시 저장할 수 있습니다.';
  }).finally(() => { checkbox.disabled = false; });
  checkbox.addEventListener('change', () => {
    const enabled = checkbox.checked;
    checkbox.disabled = true;
    status.textContent = '설정을 저장하는 중…';
    void invoke<void>('updater_set_automatic_checks', { enabled }).then(() => {
      status.textContent = enabled ? '저장했습니다. 다음 실행부터 자동으로 확인합니다.' : '저장했습니다. 다음 실행부터 자동으로 확인하지 않습니다. 이미 시작한 요청은 취소되지 않습니다.';
    }).catch(() => {
      checkbox.checked = !enabled;
      status.textContent = '설정을 저장하지 못했습니다. 이전 선택이 유지되므로 다시 시도해 주세요.';
    }).finally(() => { checkbox.disabled = false; });
  });
  return section;
}
