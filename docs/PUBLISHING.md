# Publish your own copy

This repository is a normal fork of `edwardtay/awesome-reverse-engineering`. The
defaults still point at the upstream site and author, so nothing breaks if you
push it unchanged. Follow these steps to publish it under your own account.

You need a GitHub account, Git, and Node 22 or newer. The commands below are for
PowerShell; the Bash equivalents are the same without `$env:`.

## 1. Create an empty repository

Create a new repository on GitHub. Do **not** add a README, `.gitignore` or
licence: this working tree already contains them, and an initialised remote makes
the first push need a merge.

Suggested name: `awesome-reverse-engineering` (your fork) or `re-tools` (a
standalone catalogue).

## 2. Point `origin` at your repository

Check what the clone currently uses:

```powershell
git remote -v
```

It normally shows `origin  https://github.com/edwardtay/awesome-reverse-engineering`.
Keep the upstream project under a separate name so you can pull editorial
updates later:

```powershell
git remote rename origin upstream
git remote add origin https://github.com/<you>/<your-repo>.git
```

If `origin` is already your repository, add the upstream instead:

```powershell
git remote add upstream https://github.com/edwardtay/awesome-reverse-engineering.git
```

## 3. Review and commit

Everything from the development work is currently uncommitted. Run the checks
first:

```powershell
npm run verify
node scripts/health.mjs
git status --short
```

`npm run verify` runs the data check, the 13 tests and a full site build. It does
not need `npm install`; the project has no dependencies.

Then commit and push:

```powershell
git add -A
git commit -m "feat: JSON API, MCP server, triage CLI and per-tool pages"
git push -u origin main
```

`git add -A` also normalises line endings for the generated Markdown, JSON and
SVG files. The `.gitattributes` file keeps those outputs LF on Windows and Linux,
so the CI check stays byte-stable.

## 4. Turn on GitHub Pages

In your repository: **Settings → Pages → Build and deployment → Source:
GitHub Actions**. Do not choose "Deploy from a branch"; the website workflow
uploads `_site/` itself.

Push to `main` (or run **Actions → Website → Run workflow**) and wait for the
`github-pages` environment. The site is then at:

- `https://<you>.github.io/<your-repo>/` for a project repository
- `https://<you>.github.io/` if the repository is named `<you>.github.io`

`scripts/site.mjs` reads `GITHUB_REPOSITORY` in Actions and derives that URL
automatically, so canonical links, JSON-LD and the JSON API already point at your
site. The README still points at upstream until you set `SITE_BASE` in the next
step.

## 5. Set your identity (optional but recommended)

In **Settings → Secrets and variables → Actions → Variables**, add any of:

| Variable | Example | Used for |
|---|---|---|
| `SITE_BASE` | `https://re.example.org` | Canonical URLs, API links, README website link |
| `SITE_REPO` | `alice/awesome-reverse-engineering` | GitHub source links |
| `SITE_AUTHOR` | `Alice Doe` | `<meta name="author">` and JSON-LD |
| `SITE_AUTHOR_URL` | `https://github.com/alice` | JSON-LD author profile |

The Website, Weekly Refresh and Validate workflows all read these variables, so
the generated files stay consistent. With no variables set, the upstream values
are used and everything still works.

To update the committed README and `llms.txt` immediately, run the build once
with the same values and commit the result:

```powershell
$env:SITE_BASE = "https://re.example.org"
$env:SITE_AUTHOR = "Alice Doe"
$env:SITE_AUTHOR_URL = "https://github.com/alice"
node scripts/build.mjs --offline
git add README.md llms.txt
git commit -m "docs: point the README at the new site"
git push
```

Bash:

```bash
SITE_BASE=https://re.example.org \
SITE_AUTHOR="Alice Doe" \
SITE_AUTHOR_URL=https://github.com/alice \
node scripts/build.mjs --offline
```

## 6. Custom domain

Set the domain in **Settings → Pages → Custom domain**, create the DNS records
GitHub shows, and set the `SITE_BASE` variable to `https://your.domain`. The
Pages action does not need a `CNAME` file; GitHub stores the custom domain in the
repository settings. Re-run the Website workflow so canonical and API links use
the new base.

## 7. Weekly refresh and validation

- **Weekly Refresh** runs on Mondays, updates `data/meta.json`, the generated
  files and commits them with `GITHUB_TOKEN`. No secret is needed.
- **Validate** runs the tests and `build.mjs --check` on every pull request.
- The refresh commits only the generated files listed in the workflow. If you
  add new generated outputs, add them to that `git add` line as well.

## 8. Pull upstream changes later

```powershell
git fetch upstream
git merge upstream/main
npm run verify
git push
```

If the merge touches `README.md`, `data.json` or the generated assets, rerun
`node scripts/build.mjs --offline` before committing. The generated files must
match `data.json`; `build.mjs --check` will tell you.

## Attribution

The catalogue is released under CC0. Keep [`LICENSE`](../LICENSE) and the
upstream link in the footer even after you change the site identity. The safety
flags and maintenance data are the useful part; attribution is cheap.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Pages shows 404 after a successful action | Set **Settings → Pages → Source** to **GitHub Actions** and confirm the `github-pages` environment exists |
| Canonical or API links still point at `edwardtay.github.io` | Set the `SITE_BASE` (and optionally `SITE_REPO`) repository variable, then rerun the Website workflow |
| `build.mjs --check` fails only in CI | The CI has no `SITE_BASE`; set the repository variable, or rebuild the README without `SITE_BASE` and commit it |
| `git push` is rejected as non-fast-forward | You initialised the remote with a README. Run `git pull --rebase origin main`, resolve, then push |
| The action cannot push in Weekly Refresh | Check **Settings → Actions → General → Workflow permissions** allows read and write |
