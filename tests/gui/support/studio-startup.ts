const allowedTitles = new Set(['화면 스킨 선택', '로컬 글꼴 설정', '로컬 글꼴 감지']);

export function validateStartupDialogs(titles: string[]): void {
  if (new Set(titles).size !== titles.length || titles.length > 3) {
    throw new Error('중복 또는 과도한 시작 대화상자');
  }
  for (const title of titles) {
    if (!allowedTitles.has(title)) throw new Error(`예상하지 않은 시작 대화상자: ${title}`);
  }
}

export async function dismissKnownDialog(overlay: WebdriverIO.Element, title: string): Promise<void> {
  validateStartupDialogs([title]);
  let label = '시작하기';
  if (title === '로컬 글꼴 설정') {
    await overlay.$('input[name="alhangeul-local-font-choice"][value="disabled"]').click();
    label = '확인';
  } else if (title === '로컬 글꼴 감지') {
    label = '대체 글꼴로 보기';
  }
  const matching = [];
  for (const button of await overlay.$$('.dialog-footer .dialog-btn')) {
    if (await button.getText() === label) matching.push(button);
  }
  if (matching.length !== 1) throw new Error(`${title}: ${label} 버튼이 ${matching.length}개입니다`);
  await matching[0].click();
}

export async function waitForStudioStartup(session: WebdriverIO.Browser, timeoutMs: number): Promise<void> {
  const handled = new Set<string>();
  await session.waitUntil(async () => {
    const overlays = await session.$$('.modal-overlay').getElements();
    const titles = [];
    for (const overlay of overlays) {
      titles.push((await overlay.$('.dialog-title').getText()).replace(/\s*×\s*$/, ''));
    }
    validateStartupDialogs(titles);
    if (overlays.length) {
      // Appended overlays paint above earlier ones. Never click through an overlay.
      const index = overlays.length - 1;
      if (!handled.has(titles[index])) {
        handled.add(titles[index]);
        await dismissKnownDialog(overlays[index], titles[index]);
      }
      return false;
    }
    const state = await session.execute(() => ({
      status: document.getElementById('sb-message')?.textContent?.trim() ?? '',
      canvasReady: !!document.querySelector('#scroll-content > canvas[data-rhwp-rendered-zoom]'),
      toolbarReady: document.documentElement.classList.contains('alhangeul-toolbar-ready'),
    }));
    return isStudioStartupReady(state);
  }, { timeout: timeoutMs, timeoutMsg: 'Studio 시작 문서와 알려진 대화상자 처리가 완료되지 않았습니다' });
}


export function isStudioStartupReady(state: {
  status: string; canvasReady: boolean; toolbarReady: boolean;
}): boolean {
  return state.toolbarReady && (state.status === 'HWP 파일을 선택해주세요.'
    || (state.canvasReady && state.status.startsWith('새 문서.hwp')));
}
