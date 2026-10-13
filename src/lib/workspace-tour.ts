const key = (accountId: string) => `movewire-workspace-tour:${accountId}`;
export function queueWorkspaceTour(accountId: string) {
  try {
    localStorage.setItem(key(accountId), "pending");
  } catch {}
}
export function hasPendingWorkspaceTour(accountId: string) {
  try {
    return localStorage.getItem(key(accountId)) === "pending";
  } catch {
    return false;
  }
}
export function finishWorkspaceTour(accountId: string) {
  try {
    localStorage.setItem(key(accountId), "done");
  } catch {}
}
