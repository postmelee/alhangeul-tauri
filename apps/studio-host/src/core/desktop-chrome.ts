const NON_EDITOR_CHROME_SELECTOR = '#menu-bar, #icon-toolbar, #style-bar, #status-bar';

export function installNonEditorContextMenuGuards(doc: Document): void {
  const preventContextMenu = (event: Event) => {
    event.preventDefault();
  };

  doc.querySelectorAll<HTMLElement>(NON_EDITOR_CHROME_SELECTOR).forEach((element) => {
    element.addEventListener('contextmenu', preventContextMenu);
  });
}
