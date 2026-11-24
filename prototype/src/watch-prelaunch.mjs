// SPDX-License-Identifier: MPL-2.0
// Read once on mount/restore and on a launch boundary. The short poll is only
// needed while the visible overlay offers time-sensitive skip/cancel controls.
export function watchPrelaunch(api, visibility, update) {
  let revision = 0, timer, disposed = false;
  async function refresh() {
    clearTimeout(timer);
    const request = ++revision;
    if (disposed || visibility.hidden) return;
    try {
      const state = await api.prelaunch164('state');
      if (request !== revision) return;
      update(state);
      if (state.active) timer = setTimeout(refresh, 150);
    } catch {
      if (request === revision) timer = setTimeout(refresh, 1000);
    }
  }
  const unsubscribe = api.onPrelaunchActivity(refresh);
  visibility.addEventListener('visibilitychange', refresh);
  refresh();
  return () => {
    disposed = true;
    revision++;
    clearTimeout(timer);
    unsubscribe();
    visibility.removeEventListener('visibilitychange', refresh);
  };
}
