import { CommandDispatcher as UpstreamCommandDispatcher } from '@upstream/command/dispatcher';
import type { CommandRegistry } from '@upstream/command/registry';
import type { CommandServices } from '@upstream/command/types';
import type { EventBus } from '@upstream/core/event-bus';
import { getDesktopHost } from '../core/desktop-host';
import { ensureDesktopEvents } from '../core/desktop-events';
import { installDesktopToolbarModeSync } from '../core/desktop-toolbar-mode-sync';
import { isTauriRuntime } from '../core/platform';

export class CommandDispatcher extends UpstreamCommandDispatcher {
  constructor(registry: CommandRegistry, services: CommandServices, eventBus: EventBus) {
    super(registry, services, eventBus);
    if (!isTauriRuntime()) return;
    installDesktopToolbarModeSync(eventBus);
    const host = getDesktopHost();
    host.bindCommandServices(services);
    void ensureDesktopEvents({
      host,
      dispatcher: this,
      setMessage(message) {
        const status = document.getElementById('sb-message');
        if (status) status.textContent = message;
      },
    }).catch((error) => console.error('[desktop-events] setup failed:', error));
  }
}
