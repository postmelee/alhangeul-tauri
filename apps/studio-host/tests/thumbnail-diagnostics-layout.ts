// Run against the real browser layout with upstream base.css loaded, not jsdom.
export function assertDialogLayout(assert: (condition: unknown, message: string) => void, state: string) {
  const dialog = document.querySelector<HTMLDialogElement>('.thumbnail-diagnostics-dialog')!;
  const body = dialog.querySelector<HTMLElement>('.thumbnail-diagnostics-body')!;
  const actions = dialog.querySelector<HTMLElement>('.thumbnail-diagnostics-actions')!;
  const rect = dialog.getBoundingClientRect();
  const footer = actions.getBoundingClientRect();
  const content = body.getBoundingClientRect();
  const gap = innerWidth <= 480 ? 8 : 16;
  const tolerance = 1;
  assert(Math.abs(rect.left + rect.width / 2 - innerWidth / 2) <= tolerance, `${state}: 수평 중앙`);
  assert(Math.abs(rect.top + rect.height / 2 - innerHeight / 2) <= tolerance, `${state}: 수직 중앙`);
  assert(rect.left >= gap - tolerance && rect.right <= innerWidth - gap + tolerance
    && rect.top >= gap - tolerance && rect.bottom <= innerHeight - gap + tolerance, `${state}: 화면 여백 유지`);
  assert(dialog.scrollWidth <= dialog.clientWidth + tolerance, `${state}: 가로 넘침 없음`);
  assert(footer.bottom <= rect.bottom && footer.top >= content.bottom - tolerance, `${state}: 하단 버튼 영역 유지`);
  if (body.scrollHeight > body.clientHeight + tolerance) {
    assert(getComputedStyle(body).overflowY === 'auto', `${state}: 긴 본문 내부 스크롤`);
    const before = actions.getBoundingClientRect().top;
    body.scrollTop = body.scrollHeight;
    assert(body.scrollTop > 0, `${state}: 본문 끝까지 스크롤 가능`);
    assert(Math.abs(actions.getBoundingClientRect().top - before) <= tolerance, `${state}: 본문 스크롤 중 버튼 고정`);
    body.scrollTop = 0;
  }
}
