// Static JSON API, generated into _site/api/ by scripts/site.mjs.
// Every payload is derived from data.json and data/meta.json, so the API can never
// disagree with the README or the site.
import { createContext, entryView, summarize, FLAG_INFO, STALE_INFO } from '../lib/normalize.mjs';

const stable = v => JSON.parse(JSON.stringify(v));

function related(views, view, limit = 5) {
  return views
    .filter(v => v.category.id === view.category.id && v.slug !== view.slug)
    .sort(
      (a, b) =>
        (b.maintenance.stars ?? 0) - (a.maintenance.stars ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit)
    .map(v => ({ slug: v.slug, name: v.name, description: v.description, url: v.url }));
}

export function buildApi({ data, meta, base, reviewed, refreshed }) {
  const ctx = createContext(data, meta);
  const views = data.entries.map(e => entryView(e, ctx));
  const counts = summarize(data, ctx);
  const generated = `${refreshed}T00:00:00Z`;
  const out = new Map();

  const link = v => ({
    ...v,
    links: {
      page: `${base}/t/${v.slug}/`,
      api: `${base}/api/tools/${v.slug}.json`,
      source: v.url,
    },
  });
  const linked = views.map(link);

  out.set('api/index.json', {
    name: 'Awesome Reverse Engineering',
    description:
      'Reverse engineering tools and learning resources with safety flags and weekly maintenance data.',
    generated,
    reviewed,
    refreshed,
    counts,
    flags: Object.entries(FLAG_INFO).map(([id, f]) => ({ id, ...f })),
    maintenance: STALE_INFO,
    endpoints: {
      entries: 'entries.json',
      categories: 'c/{id}.json',
      tools: 'tools/{slug}.json',
      search: 'search-index.json',
      schema: 'schema.json',
    },
    categories: data.categories.map(c => {
      const list = views.filter(v => v.category.id === c.id);
      return {
        id: c.id,
        name: c.name,
        title: c.title,
        intro: c.intro,
        count: list.length,
        page: `${base}/c/${c.id}/`,
        api: `${base}/api/c/${c.id}.json`,
      };
    }),
  });

  out.set('api/entries.json', {
    generated,
    reviewed,
    refreshed,
    count: linked.length,
    entries: linked,
  });

  out.set('api/search-index.json', {
    generated,
    count: linked.length,
    // Compact keys: s slug, n name, u url, d description, c category id,
    // t tags, f flag ids, w maintenance warning, p cost model, free free tier.
    entries: linked.map(v => ({
      s: v.slug,
      n: v.name,
      u: v.url,
      d: v.description,
      c: v.category.id,
      t: v.tags,
      f: v.flags.map(f => f.id),
      w: v.maintenance.warning,
      p: v.cost.model,
      free: v.cost.freeTier,
      stars: v.maintenance.stars,
    })),
  });

  for (const c of data.categories) {
    const list = linked.filter(v => v.category.id === c.id);
    out.set(`api/c/${c.id}.json`, {
      generated,
      id: c.id,
      name: c.name,
      title: c.title,
      intro: c.intro,
      count: list.length,
      page: `${base}/c/${c.id}/`,
      entries: list,
    });
  }

  for (const v of linked) {
    out.set(`api/tools/${v.slug}.json`, {
      generated,
      ...v,
      related: related(views, v),
      alternatives: related(views, v, 8).map(r => `${base}/t/${r.slug}/`),
    });
  }

  out.set('api/schema.json', stable({ ...API_SCHEMA, $id: `${base}/api/schema.json` }));
  return out;
}

const API_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://edwardtay.github.io/awesome-reverse-engineering/api/schema.json',
  title: 'Awesome Reverse Engineering entry',
  type: 'object',
  required: ['slug', 'name', 'url', 'description', 'category', 'cost', 'flags', 'maintenance', 'tags', 'links'],
  properties: {
    slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
    name: { type: 'string' },
    url: { type: 'string', format: 'uri', pattern: '^https://' },
    description: { type: 'string' },
    category: {
      type: 'object',
      required: ['id', 'name'],
      properties: { id: { type: 'string' }, name: { type: 'string' }, title: { type: 'string' } },
    },
    cost: {
      type: 'object',
      required: ['label', 'model', 'free', 'freeTier'],
      properties: {
        label: { type: 'string' },
        model: { enum: ['free', 'freemium', 'paid', 'mixed', 'unknown'] },
        free: { type: 'boolean' },
        freeTier: { type: 'boolean' },
        note: { type: 'string' },
      },
    },
    flags: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label', 'meaning'],
        properties: {
          id: { enum: ['runs', 'cloud', 'impersonated'] },
          label: { type: 'string' },
          symbol: { type: 'string' },
          meaning: { type: 'string' },
        },
      },
    },
    maintenance: {
      type: 'object',
      required: ['status', 'warning'],
      properties: {
        status: { enum: ['ok', 'stale', 'archived', 'declared', 'unknown'] },
        warning: { type: 'boolean' },
        note: { type: 'string' },
        lastPush: { type: ['string', 'null'] },
        stars: { type: ['integer', 'null'] },
        archived: { type: 'boolean' },
      },
    },
    tags: { type: 'array', items: { type: 'string' } },
    repo: { type: ['string', 'null'] },
    reviewed: { type: 'string' },
    refreshed: { type: 'string' },
    related: { type: 'array', items: { type: 'object' } },
    links: {
      type: 'object',
      required: ['page', 'api', 'source'],
      properties: {
        page: { type: 'string', format: 'uri' },
        api: { type: 'string', format: 'uri' },
        source: { type: 'string', format: 'uri' },
      },
    },
  },
};
