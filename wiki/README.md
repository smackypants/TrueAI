# TrueAI LocalAI — Wiki source

This directory holds the **source of truth** for the
[TrueAI LocalAI GitHub Wiki](https://github.com/smackypants/TrueAI/wiki).

GitHub Wikis are stored in a *separate* git repository
(`TrueAI.wiki.git`) that is not built or pushed by the agent / PR flow
of this repo. So we keep the canonical Markdown here, in version
control alongside the code it describes, and mirror it into the wiki
repo manually (or via a future opt-in workflow).

## Layout

Filenames map 1:1 to wiki page slugs. Spaces become hyphens; the
landing page is `Home.md`. The two underscore-prefixed files are
GitHub Wiki conventions:

- [`_Sidebar.md`](./_Sidebar.md) — persistent left-hand navigation.
- [`_Footer.md`](./_Footer.md) — persistent footer.

Everything else is a normal wiki page.

## Conventions every page follows

- **H1** = page title.
- **Subtitle line** = one-sentence purpose + audience badge
  (`*Audience: end user*`, `*Audience: developer*`, or
  `*Audience: both*`) + `Last reviewed: YYYY-MM-DD`.
- **Linkbacks** to canonical in-repo docs (e.g. `FEATURES.md`,
  `ANDROID_BUILD_GUIDE.md`) instead of duplicating their full text.
- **Source citations** (`see src/lib/llm-runtime/config.ts`) so the
  wiki stays grep-able and verifiable as the code evolves.
- **Mermaid diagrams** for architecture, data flow, release pipelines.
- **Screenshot placeholders** look like
  `<!-- SCREENSHOT: settings → llm runtime panel -->`. Drop a real
  image in when convenient.

## Mirroring to the actual GitHub Wiki

Two supported flows:

### Manual (recommended for now)

```bash
# 1. Clone the wiki repo (one-time)
git clone https://github.com/smackypants/TrueAI.wiki.git ../TrueAI.wiki

# 2. Sync — copies wiki/*.md into the wiki repo, drops nothing else
rsync -av --delete --exclude='.git' --exclude='README.md' \
  wiki/ ../TrueAI.wiki/

# 3. Commit & push
cd ../TrueAI.wiki
git add -A
git commit -m "Sync wiki from main repo @ $(git -C ../TrueAI rev-parse --short HEAD)"
git push
```

### Automated (opt-in, not enabled by default)

A GitHub Actions workflow that performs the above on every push to
`main` is **intentionally not added** in this PR — workflows live
under `.github/**`, which the project's governance rules require to
be touched only with explicit approval. Open an issue if you want
that workflow added; it is a ~30-line `actions/checkout` +
`peaceiris/actions-gh-pages`-style job.

## Contributing

Edit the Markdown here, open a PR, get it reviewed, merge. The wiki
mirror happens out-of-band. **Do not** edit pages in the live GitHub
Wiki UI — those edits will be overwritten on the next sync.

If your edit changes a documented behaviour, also update the
"Last reviewed" date on the page footer.
