// Graveyard and maintenance health, derived from the same model as the API.
// Read-only: this reports candidates, it never edits data.json or GRAVEYARD.md.
import { createContext, entryView } from './normalize.mjs';

export function healthReport(data, meta) {
  const ctx = createContext(data, meta);
  const views = data.entries.map(e => entryView(e, ctx));
  const graveyardNames = new Set(data.graveyard.map(g => g.n.toLowerCase()));

  const candidates = views
    .filter(v => v.maintenance.warning && !graveyardNames.has(v.name.toLowerCase()))
    .map(v => ({
      name: v.name,
      slug: v.slug,
      status: v.maintenance.status,
      note: v.maintenance.note,
      lastPush: v.maintenance.lastPush,
      stars: v.maintenance.stars,
      category: v.category.id,
      url: v.url,
    }))
    .sort(
      (a, b) =>
        (a.lastPush || '').localeCompare(b.lastPush || '') ||
        (b.stars ?? 0) - (a.stars ?? 0) ||
        a.name.localeCompare(b.name),
    );

  const stillListed = data.entries
    .filter(e => graveyardNames.has(e.n.toLowerCase()))
    .map(e => ({ name: e.n, url: e.u }));

  const archived = candidates.filter(c => c.status === 'archived');
  const stale = candidates.filter(c => c.status === 'stale');
  const declared = candidates.filter(c => c.status === 'declared');

  return {
    reviewed: data.reviewed,
    refreshed: ctx.refreshed,
    counts: {
      entries: data.entries.length,
      graveyard: data.graveyard.length,
      candidates: candidates.length,
      archived: archived.length,
      stale: stale.length,
      declared: declared.length,
      stillListed: stillListed.length,
      websiteOnly: views.filter(v => !v.repo).length,
    },
    candidates,
    stillListed,
  };
}
