# Production readiness

This is the operational checklist for publishing Jonás Orbit v3. A successful build alone does not mean the product is ready. The approved plan, its Appendix A test matrix, and current design decisions still apply.

## Required gates

Run every gate for a release candidate:

```bash
npm ci
npm audit --audit-level=high
npm run check
npm run test:e2e
npx playwright test --project=firefox --project=webkit
npm run preview
# In another terminal while preview is running:
npm run test:worker
```

The GitHub CI workflow covers Chromium, Firefox, WebKit, Lighthouse, and links. It has read-only permissions and per-job time limits. Run it manually on `main` before publishing to `production` when Actions is available.

As of 2026-09-28, GitHub Actions jobs are blocked by account billing or spending limits. Firefox and WebKit checks were therefore attempted on Linux with the official Playwright image. WebKit on Windows lacks the required `AudioContext` behavior.

```bash
docker run --rm --ipc=host -v "$PWD:/src:ro" mcr.microsoft.com/playwright:v1.61.1-noble bash -c '
  mkdir /work &&
  tar -C /src --exclude=./node_modules --exclude=./.next --exclude=./Fotos --exclude=./Disenos \
    --exclude=./portfolio-content --exclude=./assets -cf - . | tar -C /work -xf - &&
  cd /work && npm ci && npm run build &&
  CI=true npx playwright test --project=firefox --project=webkit'
```

Railway also runs the full `npm run check` (lint, types, Knip, tests, and build) on Linux with `NODE_ENV=production`; a failure prevents deployment.

## Recorded status on 2026-09-28

- **Railway:** the `web` service builds the `production` branch. The final release review records a successful deployment with a healthy `/api/health`, live routes, security headers, and a rendered Turnstile widget. Earlier failed healthchecks in the same review were resolved by correcting Turnstile configuration.
- **Contact abuse control:** implemented in the application because the public domain points directly to Railway.
- **GitHub Actions:** runs could not start because of the account's billing or spending limit. Local, Linux Docker, and Railway-build evidence is recorded separately.
- **Browser coverage:** the final review records incomplete Firefox and WebKit Linux verification because the test disk filled during the run. Do not describe that gate as passed until it is rerun.
- **Contact delivery:** a real authorized form submission remains necessary to confirm the Resend domain and email delivery. A healthy endpoint alone does not prove delivery.
- **External links:** Netflix returned 403 and LinkedIn 999 to automated clients; check those links manually.

See the [production release review](reviews/production-release-2026-09-28.md) for deployment IDs, exact pass counts, and remaining limitations, and the [repository-readiness review](reviews/repository-readiness-2026-09-27.md) for earlier evidence.

## Environment contract

Production runs Next.js with `npm start` on Railway's supplied `PORT` (8080 at the recorded release). `/api/health` returns 200 only when contact runtime is set to production, the site origin is HTTPS, and Turnstile/Resend variables are present and consistent with the hostname. Otherwise it returns 503 without disclosing the missing value. The check cannot prove that the Resend sending domain is authorized or that email arrives.

- **Security headers:** `next.config.ts` configures CSP for prerendered routes and Turnstile, HSTS without `includeSubDomains`, `nosniff`, Referrer-Policy, `X-Frame-Options: SAMEORIGIN`, COOP, and Permissions-Policy. `X-Powered-By` is omitted. `public/_headers` applies only on Cloudflare.
- **Contact rate limit:** `app/api/contact/route.ts` and `lib/rate-limit.ts` permit five `POST /api/contact` requests per minute per IP, then block for 10 minutes and return 429 with `Retry-After`. The IP is taken from Railway's `x-real-ip`. State is in memory, so this is exact with one replica; multiple replicas count independently. The Cloudflare Terraform rule does not apply to direct Railway traffic.
- **Legacy domain:** `orbit.jonasjavier.dev` redirects with 308 to `https://jonasjavier.dev` while preserving the path.
- **Unknown routes:** `dynamicParams = false` on locale and case-study routes produces a direct 404 without on-demand rendering or cache writes. A `NoFallbackError` logged for one of those requests indicates this 404 path.
- **Cloudflare compatibility:** the OpenNext preview uses Static Assets for prerendered routes without R2. `test:worker` checks routes, redirects, 404s, and an invalid contact request without sending email. This preview is not the Railway production deployment.
- **Pinned versions:** the dedicated security update recorded Next.js 16.3.6, OpenNext 1.20.6, Vitest 4.1.11, Wrangler 4.141.0, PostCSS 8.5.28, and Sharp 0.35.4. The 2026-09-28 audits reported zero advisories. Recheck each candidate; CI blocks new high or critical advisories.

### Railway configuration

| Setting | Recorded value |
| --- | --- |
| Source | GitHub `JonasJavier/jonas-orbit-v3`, `production` branch |
| Builder | Railpack, Node 24 from `.nvmrc`/`devEngines`, npm 11.13.0 |
| Build context | `.dockerignore` excludes source assets, design evidence, and `docs/` |
| Build | `npm run check` |
| Start | `npm start` |
| Healthcheck | `/api/health`, five-minute window |
| Replicas | One in `us-west2` |
| Domains | `jonasjavier.dev` canonical; `orbit.jonasjavier.dev` redirects |

`railway up` is unsuitable here: the `public/` upload compressed to roughly 280 MB and Railway returned 413. Service configuration lives in Railway rather than a `railway.json` file.

Service variable **names** are `NEXT_PUBLIC_SITE_URL=https://jonasjavier.dev`, `TURNSTILE_EXPECTED_HOSTNAME=jonasjavier.dev`, `CONTACT_RUNTIME_ENV=production`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`, `TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY`. Values remain in Railway. `NEXT_PUBLIC_SITE_URL` is embedded at build time; changing it requires a new deployment.

The sender must use the verified `send.jonasjavier.dev` domain in Resend, and the Turnstile widget must authorize `jonasjavier.dev`. Manage widget credentials in [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile), the sending domain in [Resend Domains](https://resend.com/domains), and a domain-limited sending key in [Resend API Keys](https://resend.com/api-keys). Enter values only in Railway → `jonas-orbit-v3` → `web` → `production` → Variables; never copy secrets into issues, chats, or commits.

## Publish

A push to `main` does not publish. Move `production` to a `main` commit that has passed the gates:

1. Run the checks above on the candidate commit.
2. Run `git push origin <commit>:production` as a fast-forward, without `--force`.
3. Railway builds with `npm run check` and routes traffic only after `/api/health` returns 200.
4. Verify the live healthcheck, `/es`, all six destinations, a project case, `robots.txt`, `sitemap.xml`, canonical and Open Graph URLs, security headers, and the legacy-domain redirect. After a contact change, test one authorized real delivery.

When GitHub Actions is restored, Railway's **Wait for CI** setting can make it wait for commit checks as well.

## Recover

- `railway deployment list --service web` shows deployments and commits. Restore the last healthy deployment from the service dashboard's **Rollback** action or by moving `production` to its commit.
- On a regression, restore service before investigating in production.
- If contact fails, restore its last verified variables and confirm an actual delivery. Test keys are not valid in production.
- Record the cause and add a test reproducing the failure before publishing again.

## Repository size

The public repository no longer versions the original photographs, design files, or project evidence kits. Their earlier history is in the private archive repository. A Git LFS or artifact-store migration would still require a dedicated review of history and clone coordination. Day-to-day hygiene remains mandatory: do not version builds, logs, QA captures, or temporary comparisons.
