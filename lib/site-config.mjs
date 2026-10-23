// Site identity for a fork. Defaults reproduce the upstream project exactly; CI
// auto-detects the repository so a fork deploys under its own Pages URL.
//
// Overrides (environment):
//   SITE_REPO        owner/repo, for example alice/awesome-reverse-engineering
//   SITE_BASE        absolute site base, for example https://re.example.org
//   SITE_AUTHOR      display name in JSON-LD and meta tags
//   SITE_AUTHOR_URL  profile URL for the author
//
// build.mjs passes { autoRepo: false } so the committed README stays stable unless
// SITE_BASE is set explicitly. site.mjs auto-detects from GITHUB_REPOSITORY.

const UPSTREAM = {
  repoSlug: 'edwardtay/awesome-reverse-engineering',
  base: 'https://edwardtay.github.io/awesome-reverse-engineering',
  author: 'Edward Tay',
  authorUrl: 'https://github.com/edwardtay',
};

export function siteConfig(env = process.env, { autoRepo = true } = {}) {
  const detected = autoRepo ? env.GITHUB_REPOSITORY : '';
  const repoSlug = (env.SITE_REPO || detected || UPSTREAM.repoSlug).trim();
  const [owner, repo] = repoSlug.split('/');
  if (!owner || !repo) throw new Error(`SITE_REPO must be owner/repo, got "${repoSlug}"`);

  const pagesBase =
    repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
      ? `https://${owner.toLowerCase()}.github.io`
      : `https://${owner.toLowerCase()}.github.io/${repo}`;

  const base = (env.SITE_BASE || (autoRepo && detected ? pagesBase : UPSTREAM.base)).replace(/\/+$/, '');

  return {
    repoSlug,
    owner,
    repo,
    base,
    repoUrl: `https://github.com/${repoSlug}`,
    author: env.SITE_AUTHOR || UPSTREAM.author,
    authorUrl: env.SITE_AUTHOR_URL || UPSTREAM.authorUrl,
  };
}
