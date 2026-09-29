# Contributing to Jonás Orbit v3

Jonás Orbit is a personal portfolio, and its code is **not open source** (see [LICENSE](LICENSE)). **Third-party pull requests are not accepted.** If you find a bug, accessibility issue, or vulnerability, open an issue—or follow [SECURITY.md](SECURITY.md) for sensitive reports—and I will review it.

The rest of this guide describes the project's internal workflow and the standards for changes entering `main`.

## Before you start

1. Read [AGENTS.md](AGENTS.md) and the [documentation index](docs/README.md).
2. Check the current plan and the latest decision for the area you will change.
3. For a broad change, first describe the problem and proposed approach.
4. Do not invent content, metrics, production links, or licensing terms.

## Set up the environment

```bash
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local`.

The project uses Node.js 24 and exact dependency versions. Dependency updates belong in dedicated changes after reviewing security advisories and migration notes.

## Change workflow

- Work and commit directly on `main`; do not create feature branches. The only other branch is `production`, which Railway deploys and which moves only by pushing a verified commit to it.
- Keep commits focused; exclude local screenshots, logs, and builds.
- Add or update the tests relevant to your change in Appendix A of the [project plan](docs/plans/jonas-orbit-v3-mission-endurance.md).
- If a product decision changes, record it in [the decision log](docs/registro-de-decisiones.md) and update the index in [AGENTS.md](AGENTS.md).
- For visual changes, attach comparable desktop and mobile evidence and state whether motion and audio were enabled. Keep working screenshots outside Git.

## Verification

Before committing to `main`:

```bash
npm run check
npm run test:e2e
```

`npm run test:e2e` requires a prior `npm run build`. Do not pipe `npm run check` into `head`, `tail`, or another command: that can hide the actual exit status.

## Commit messages

Explain the outcome, scope, risks, and verification. For visible interface changes, say where the comparable screenshots are (outside Git) and name any owner review still pending. Do not present an unapproved visual decision as approved.

## Content and assets

- Visitor-facing prose belongs in MDX, not in `content/worlds.data.ts`.
- Photographs, audio, fonts, and external references need documented provenance and licensing.
- Never commit secrets, unnecessary personal data, or credentials from capture sessions.
