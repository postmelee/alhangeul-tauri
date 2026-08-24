import { CommandDispatcher as UpstreamCommandDispatcher } from '@upstream/command/dispatcher';
import type { CommandRegistry } from '@upstream/command/registry';
import type { CommandServices } from '@upstream/command/types';
import type { EventBus } from '@upstream/core/event-bus';
import { getDesktopHost } from '../core/desktop-host';
import { setupDesktopEvents } from '../core/desktop-events';
import { installDesktopToolbarModeSync } from '../core/desktop-toolbar-mode-sync';
import { isTauriRuntime } from '../core/platform';

type Disposer = () => void;

interface DesktopAdapterRegistration {
  dispose(): void;
}

let activeDesktopRegistration: DesktopAdapterRegistration | null = null;

export class CommandDispatcher extends UpstreamCommandDispatcher {
  private disposeDesktopAdapters: Disposer = () => {};

  constructor(registry: CommandRegistry, services: CommandServices, eventBus: EventBus) {
    super(registry, services, eventBus);
    if (!isTauriRuntime()) return;
    const host = getDesktopHost();
    host.bindCommandServices(services);
    this.disposeDesktopAdapters = installDesktopAdapters({
      host,
      dispatcher: this,
      eventBus,
      setMessage(message) {
        const status = document.getElementById('sb-message');
        if (status) status.textContent = message;
      },
    });
  }

  dispose(): void {
    this.disposeDesktopAdapters();
  }
}

function installDesktopAdapters({
  host,
  dispatcher,
  eventBus,
  setMessage,
}: Parameters<typeof setupDesktopEvents>[0] & { eventBus: EventBus }): Disposer {
  activeDesktopRegistration?.dispose();
  const abortController = new AbortController();
  const disposeToolbar = installDesktopToolbarModeSync(eventBus);
  let disposeEvents: Disposer | null = null;
  let disposed = false;

  const registration: DesktopAdapterRegistration = {
    dispose() {
      if (disposed) return;
      disposed = true;
      abortController.abort();
      disposeEvents?.();
      disposeToolbar();
    },
  };
  const uninstall = () => {
    registration.dispose();
    if (activeDesktopRegistration === registration) activeDesktopRegistration = null;
  };
  activeDesktopRegistration = registration;

  void setupDesktopEvents({ host, dispatcher, setMessage }, abortController.signal)
    .then((dispose) => {
      if (disposed) dispose();
      else disposeEvents = dispose;
    })
    .catch((error) => {
      if (disposed) return;
      uninstall();
      console.error('[desktop-events] setup failed:', error);
    });

  return uninstall;
}
