/** Prevents duplicate in-flight claims; expires if the tab dies before `finally` runs. */
const OAUTH_PROC_LOCK_TTL_MS = 120_000;

export function isRefundOAuthProcLockBusy(lockKey: string): boolean {
  try {
    const raw = sessionStorage.getItem(lockKey);
    if (!raw) return false;
    const started = parseInt(raw, 10);
    if (!Number.isFinite(started)) {
      sessionStorage.removeItem(lockKey);
      return false;
    }
    if (Date.now() - started > OAUTH_PROC_LOCK_TTL_MS) {
      sessionStorage.removeItem(lockKey);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setRefundOAuthProcLock(lockKey: string): void {
  sessionStorage.setItem(lockKey, String(Date.now()));
}

export function clearRefundOAuthProcLock(lockKey: string): void {
  try {
    sessionStorage.removeItem(lockKey);
  } catch {
    /* */
  }
}
