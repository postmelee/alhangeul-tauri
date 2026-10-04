export interface SessionExitGuard {
  events: unknown[];
  deleteSession<T, A extends unknown[]>(original: (...args: A) => Promise<T>, ...args: A): Promise<T>;
  assertCompleted(): void;
}
export function createSessionExitGuard(options: { timeoutMs: number }): SessionExitGuard;
