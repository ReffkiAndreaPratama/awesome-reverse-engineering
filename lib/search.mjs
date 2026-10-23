// Small, dependency-free search over normalised entry views.
// The same scorer backs the MCP tool and the static search index is kept simple
// enough for the site to filter client-side.

const norm = s =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

function score(view, tokens) {
  const name = norm(view.name);
  const desc = norm(view.description);
  const cat = norm(view.category.name);
  const tags = view.tags.map(norm).join(' ');
  let total = 0;
  for (const t of tokens) {
    let s = 0;
    if (name === t) s = 100;
    else if (name.startsWith(t)) s = 70;
    else if (name.includes(t)) s = 45;
    else if (tags.includes(t)) s = 25;
    else if (desc.includes(t)) s = 12;
    else if (cat.includes(t)) s = 8;
    if (s === 0) return 0; // every token must match somewhere
    total += s;
  }
  return total;
}

export function searchViews(views, query, { limit = 20 } = {}) {
  const tokens = norm(query).split(/[^a-z0-9.+#@-]+/).filter(Boolean);
  if (!tokens.length) return [];
  return views
    .map(v => ({ v, s: score(v, tokens) }))
    .filter(x => x.s > 0)
    .sort(
      (a, b) =>
        b.s - a.s ||
        (b.v.maintenance.stars ?? 0) - (a.v.maintenance.stars ?? 0) ||
        a.v.name.localeCompare(b.v.name),
    )
    .slice(0, limit)
    .map(x => x.v);
}

export function filterViews(
  views,
  { category, cost, flag, tag, free, warning, runtime } = {},
) {
  return views.filter(v => {
    if (category && v.category.id !== category) return false;
    if (cost && v.cost.model !== cost) return false;
    if (free === true && !v.cost.freeTier) return false;
    if (flag && !v.flags.some(f => f.id === flag)) return false;
    if (tag && !v.tags.includes(tag)) return false;
    if (warning === true && !v.maintenance.warning) return false;
    if (runtime && !v.tags.includes(runtime)) return false;
    return true;
  });
}
