// SPDX-License-Identifier: MPL-2.0
// Only a launch-time local account ID attributes a session. Names are never keys.
export function accountStatistics(journal, accountId) {
  const instances = new Map();
  let totalMs = 0, lastPlayed = null, uncertain = false, historicalMs = 0;
  for (const session of journal.sessions) {
    const duration = session.segments.reduce((n, [start, end]) => n + Math.max(0, end - start), 0);
    if (!session.accountId) { historicalMs += duration; continue; }
    if (session.accountId !== accountId) continue;
    const item = instances.get(session.instanceId) || {instanceId: session.instanceId, totalMs: 0, sessions: 0, lastPlayed: null, uncertain: false};
    item.totalMs += duration; item.sessions++;
    if (!item.lastPlayed || session.startedAt > item.lastPlayed) item.lastPlayed = session.startedAt;
    item.uncertain ||= !!session.uncertain;
    instances.set(item.instanceId, item);
    totalMs += duration; uncertain ||= !!session.uncertain;
    if (!lastPlayed || session.startedAt > lastPlayed) lastPlayed = session.startedAt;
  }
  return {enabled: journal.enabled, totalMs, lastPlayed, uncertain, historicalMs, instances: [...instances.values()].sort((a,b) => b.lastPlayed.localeCompare(a.lastPlayed))};
}
