/**
 * Portfolio screenshot run for Network (github.com/JonasJavier/cs50w-network).
 *
 * Captures every screen and state of the running app at two viewports:
 *   desktop 1440x900, mobile 390x844, both at deviceScaleFactor 2.
 *
 * Nothing is written into the Network repository. Screenshots land in OUT_DIR.
 * The app must already be running against the isolated demo database - see
 * demo-env.sh and seed_portfolio_demo.py in this folder.
 *
 * Usage
 *   node capture.mjs
 * Environment
 *   WEB_URL       default http://127.0.0.1:5199
 *   API_URL       default http://127.0.0.1:8001
 *   OUT_DIR       default ./raw
 *   DEMO_PASSWORD default PortfolioDemo!2026
 *   COMPOSER_IMAGE  absolute path to an image used in the composer shot
 *
 * Determinism: animations and transitions are disabled, the timezone is pinned
 * to UTC, the caret is hidden, and web fonts are awaited before every shot.
 */

import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const WEB = process.env.WEB_URL ?? 'http://127.0.0.1:5199'
const API = process.env.API_URL ?? 'http://127.0.0.1:8001'
const OUT = path.resolve(process.env.OUT_DIR ?? './raw')
const PASSWORD = process.env.DEMO_PASSWORD ?? 'PortfolioDemo!2026'
const COMPOSER_IMAGE = process.env.COMPOSER_IMAGE ?? ''

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const SCALE = 2

const HERO = 'mira.kessel'
const NEWCOMER = 'noah.fielding'
const STRANGER = 'felix.nakamura' // the hero does not follow this account

const KILL_MOTION = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
  * { caret-color: transparent !important; }
  html { scroll-behavior: auto !important; }
`

const log = (...args) => console.log(...args)

// ---------------------------------------------------------------------------
// API helpers - used to obtain tokens and to discover real ids to link to.
// ---------------------------------------------------------------------------

async function apiJson(pathname, token) {
  const res = await fetch(`${API}/api/v1${pathname}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`GET ${pathname} -> ${res.status}`)
  return res.json()
}

async function tokensFor(username) {
  const res = await fetch(`${API}/api/v1/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`login ${username} -> ${res.status} ${await res.text()}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// Browser plumbing
// ---------------------------------------------------------------------------

async function makeContext(browser, { device, theme, auth }) {
  const isMobile = device === MOBILE
  const context = await browser.newContext({
    viewport: device,
    deviceScaleFactor: SCALE,
    colorScheme: theme,
    isMobile,
    hasTouch: isMobile,
    locale: 'en-US',
    timezoneId: 'UTC',
  })
  await context.addInitScript(
    ([preference, session]) => {
      try {
        localStorage.setItem(
          'network-theme',
          JSON.stringify({ state: { preference }, version: 2 }),
        )
        if (session) {
          localStorage.setItem(
            'network-auth',
            JSON.stringify({
              state: { access: session.access, refresh: session.refresh, user: session.user },
              version: 0,
            }),
          )
        }
      } catch {
        /* private mode - the app renders fine without persisted state */
      }
    },
    [theme, auth ?? null],
  )
  return context
}

async function settle(page, { extra = 450 } = {}) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
  await page.addStyleTag({ content: KILL_MOTION }).catch(() => {})
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(extra)
}

async function shoot(page, file) {
  await fs.mkdir(OUT, { recursive: true })
  await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' })
  log(`  + ${file}`)
}

// ---------------------------------------------------------------------------
// Shot catalogue. Narrative order: desktop first, then the mobile pass.
// Each entry: { slug, device, theme, as, run(page, ctx) }
// `as` is a username, or null for the signed-out screens.
// ---------------------------------------------------------------------------

function buildShots(ids) {
  const D = DESKTOP
  const M = MOBILE
  const feedPost = ids.ownPostWithComments
  const commentId = ids.commentToHighlight
  const imagePost = ids.ownImagePost

  /** Signed-out screens. */
  const auth = (device) => [
    {
      slug: 'login',
      device,
      theme: 'light',
      as: null,
      run: async (page) => {
        await page.goto(`${WEB}/login`)
        await page.getByRole('button', { name: 'Log in' }).waitFor()
        await settle(page)
      },
    },
    {
      slug: 'login-error',
      device,
      theme: 'light',
      as: null,
      run: async (page) => {
        await page.goto(`${WEB}/login`)
        await page.getByLabel('Username or email').fill(HERO)
        await page.getByLabel('Password', { exact: true }).fill('definitely-not-the-password')
        await page.getByRole('button', { name: 'Log in' }).click()
        await page.getByRole('alert').waitFor({ timeout: 15000 })
        await settle(page)
      },
    },
    {
      slug: 'register',
      device,
      theme: 'light',
      as: null,
      run: async (page) => {
        await page.goto(`${WEB}/register`)
        await page.getByRole('button', { name: /create account|sign up|create/i }).first().waitFor()
        await settle(page)
      },
    },
  ]

  /** The signed-in walk-through, as the hero account. */
  const app = (device) => {
    const wide = device === DESKTOP
    return [
      {
        slug: 'feed',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/`)
          await page.locator('article').nth(2).waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        // The screenshot has to happen while the feed request is still in
        // flight, so the runner handles this one directly (see `manualShot`).
        slug: 'feed-loading-skeleton',
        device,
        theme: 'light',
        as: HERO,
        manualShot: true,
      },
      {
        slug: 'feed-infinite-scroll',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/`)
          await page.locator('article').nth(2).waitFor({ timeout: 20000 })
          const before = await page.locator('article').count()
          for (let i = 0; i < 6; i += 1) {
            await page.mouse.wheel(0, 4000)
            await page.waitForTimeout(700)
            if ((await page.locator('article').count()) > before + 5) break
          }
          await page.waitForTimeout(600)
          await settle(page)
        },
      },
      {
        slug: 'feed-following',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/?feed=following`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'composer-with-image',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          const box = page.locator('textarea').first()
          await box.click()
          await box.fill(
            'Writing up the queue rewrite for the team wiki tonight. Short version: ' +
              'bound the buffer, shed load early, measure the depth. #distributed #backend',
          )
          if (COMPOSER_IMAGE) {
            await page.locator('input[type="file"]').first().setInputFiles(COMPOSER_IMAGE)
            await page.locator('button[aria-label="Remove image"]').waitFor({ timeout: 10000 })
          }
          await settle(page)
        },
      },
      {
        slug: 'post-options-menu',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await page.locator('button[aria-label="Post options"]').first().click()
          await page.getByText('Delete', { exact: true }).waitFor({ timeout: 10000 })
          await settle(page, { extra: 250 })
        },
      },
      {
        slug: 'post-editing',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await page.locator('button[aria-label="Post options"]').first().click()
          await page.getByText('Edit', { exact: true }).click()
          await page.getByText('Edit post').waitFor({ timeout: 10000 })
          await settle(page, { extra: 250 })
        },
      },
      {
        slug: 'post-delete-confirm',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await page.locator('button[aria-label="Post options"]').first().click()
          await page.getByText('Delete', { exact: true }).click()
          await page.getByText('Delete post?').waitFor({ timeout: 10000 })
          await settle(page, { extra: 250 })
        },
      },
      {
        slug: 'quote-modal',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/post/${feedPost}`)
          const article = page.locator('article').first()
          await article.waitFor({ timeout: 20000 })
          await article
            .locator('button[aria-label="Repost"], button[aria-label="Reposted"]')
            .first()
            .click()
          await page.getByRole('menuitem', { name: 'Quote', exact: true }).click()
          await page.getByText('Quote post').waitFor({ timeout: 10000 })
          await settle(page, { extra: 250 })
        },
      },
      {
        slug: 'post-likes-list',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/post/${feedPost}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await page.locator('button[aria-label$="likes"]').first().click()
          await page.getByRole('dialog').waitFor({ timeout: 10000 })
          await settle(page, { extra: 400 })
        },
      },
      {
        slug: 'post-detail-comments',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/post/${feedPost}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await page.waitForTimeout(900)
          await settle(page)
        },
      },
      {
        slug: 'post-detail-comment-deeplink',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/post/${feedPost}?comment=${commentId}`)
          await page.locator(`#comment-${commentId}`).waitFor({ timeout: 20000 })
          await page.locator(`#comment-${commentId}`).scrollIntoViewIfNeeded()
          await settle(page)
        },
      },
      {
        slug: 'comment-reply-composer',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/post/${feedPost}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await page.waitForTimeout(800)
          await page.getByRole('button', { name: 'Reply', exact: true }).first().click()
          const reply = page.locator('input[placeholder^="Reply to"]').first()
          await reply.waitFor({ timeout: 10000 })
          // Short on purpose: the reply box is a single-line input, and longer
          // text scrolls out of view at 390px wide.
          await reply.fill('Writing it up now, link soon.')
          await reply.scrollIntoViewIfNeeded()
          await settle(page, { extra: 300 })
        },
      },
      {
        slug: 'image-lightbox',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/post/${imagePost}`)
          await page.locator('button[aria-label="Open image"]').first().waitFor({ timeout: 20000 })
          await page.locator('button[aria-label="Open image"]').first().click()
          await page.waitForTimeout(700)
          await settle(page, { extra: 300 })
        },
      },
      {
        slug: 'profile-own',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'profile-media-grid',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}?tab=media`)
          await page.locator('img[loading="lazy"]').first().waitFor({ timeout: 20000 })
          await page.waitForTimeout(900)
          await settle(page)
        },
      },
      {
        slug: 'profile-likes-tab',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}?tab=likes`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'profile-edit-modal',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}`)
          await page.getByRole('button', { name: 'Edit profile' }).first().click()
          await page.getByRole('dialog').waitFor({ timeout: 10000 })
          await settle(page, { extra: 400 })
        },
      },
      {
        slug: 'profile-followers-modal',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}?tab=followers`)
          await page.getByRole('dialog').waitFor({ timeout: 15000 })
          await page.waitForTimeout(900)
          await settle(page)
        },
      },
      {
        slug: 'profile-following-modal',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}?tab=following`)
          await page.getByRole('dialog').waitFor({ timeout: 15000 })
          await page.waitForTimeout(900)
          await settle(page)
        },
      },
      {
        slug: 'profile-other-person',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${STRANGER}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'notifications',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/notifications`)
          await page.locator('li button').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'notifications-clear-confirm',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/notifications`)
          await page.locator('li button').first().waitFor({ timeout: 20000 })
          await page.getByRole('button', { name: /^Clear$/ }).click()
          await page.getByText('Clear all notifications?').waitFor({ timeout: 10000 })
          await settle(page, { extra: 300 })
        },
      },
      {
        slug: 'bookmarks',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/bookmarks`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'search-idle-trending',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/search`)
          await page.getByText('Trending this week').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'search-people',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/search?q=engineer`)
          await page.waitForTimeout(1400)
          await settle(page)
        },
      },
      {
        slug: 'search-posts',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/search?q=pagination`)
          await page.waitForTimeout(1200)
          await page.getByRole('tab', { name: /Posts/ }).click().catch(() => {})
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'search-hashtag',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/search?q=%23design`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'search-no-results',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/search?q=qwertzuiop`)
          await page.getByText(/No people matching/).waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'account-menu',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await page.locator('button[aria-label="Account menu"]').click()
          await page.getByText('My profile').waitFor({ timeout: 10000 })
          await settle(page, { extra: 250 })
        },
      },
      {
        slug: 'settings',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/settings`)
          await page.getByText('Danger zone').waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'settings-delete-account-modal',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/settings`)
          await page.getByRole('button', { name: 'Delete my account' }).click()
          await page.getByText('Delete your account?').waitFor({ timeout: 10000 })
          await settle(page, { extra: 300 })
        },
      },
      {
        slug: 'not-found-404',
        device,
        theme: 'light',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/a-page-that-does-not-exist`)
          await page.getByText('404 — Page not found').waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      // ---- empty states, photographed on a brand-new account -------------
      {
        slug: 'empty-following-feed',
        device,
        theme: 'light',
        as: NEWCOMER,
        run: async (page) => {
          await page.goto(`${WEB}/?feed=following`)
          await page.getByText('Your following feed is quiet').waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'empty-bookmarks',
        device,
        theme: 'light',
        as: NEWCOMER,
        run: async (page) => {
          await page.goto(`${WEB}/bookmarks`)
          await page.getByText('No bookmarks yet').waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'empty-notifications',
        device,
        theme: 'light',
        as: NEWCOMER,
        run: async (page) => {
          await page.goto(`${WEB}/notifications`)
          await page.getByText('Nothing here yet').waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'empty-own-profile',
        device,
        theme: 'light',
        as: NEWCOMER,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${NEWCOMER}`)
          await page.getByText("You haven't posted yet").waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      // ---- dark theme ----------------------------------------------------
      {
        slug: 'feed-dark',
        device,
        theme: 'dark',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/`)
          await page.locator('article').nth(2).waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'post-detail-dark',
        device,
        theme: 'dark',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/post/${feedPost}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await page.waitForTimeout(900)
          await settle(page)
        },
      },
      {
        slug: 'profile-own-dark',
        device,
        theme: 'dark',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/profile/${HERO}`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'notifications-dark',
        device,
        theme: 'dark',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/notifications`)
          await page.locator('li button').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'search-hashtag-dark',
        device,
        theme: 'dark',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/search?q=%23sre`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'settings-dark',
        device,
        theme: 'dark',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/settings`)
          await page.getByText('Danger zone').waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      {
        slug: 'bookmarks-dark',
        device,
        theme: 'dark',
        as: HERO,
        run: async (page) => {
          await page.goto(`${WEB}/bookmarks`)
          await page.locator('article').first().waitFor({ timeout: 20000 })
          await settle(page)
        },
      },
      ...(wide
        ? [
            {
              slug: 'login-dark',
              device,
              theme: 'dark',
              as: null,
              run: async (page) => {
                await page.goto(`${WEB}/login`)
                await page.getByRole('button', { name: 'Log in' }).waitFor()
                await settle(page)
              },
            },
            {
              slug: 'api-docs-swagger',
              device,
              theme: 'light',
              as: null,
              run: async (page) => {
                await page.goto(`${API}/api/docs/`)
                await page.getByText('Network API').first().waitFor({ timeout: 25000 })
                await page.waitForTimeout(1500)
                await settle(page)
              },
            },
            {
              slug: 'api-docs-redoc',
              device,
              theme: 'light',
              as: null,
              run: async (page) => {
                await page.goto(`${API}/api/redoc/`)
                await page.getByText('Network API').first().waitFor({ timeout: 25000 })
                await page.waitForTimeout(2500)
                await settle(page)
              },
            },
          ]
        : []),
    ]
  }

  const desktop = [...auth(DESKTOP), ...app(DESKTOP)].map((shot) => ({ ...shot, device: D }))
  const mobileSlugs = new Set([
    'login',
    'register',
    'feed',
    'feed-following',
    'composer-with-image',
    'post-detail-comments',
    'comment-reply-composer',
    'quote-modal',
    'profile-own',
    'profile-media-grid',
    'profile-other-person',
    'profile-followers-modal',
    'notifications',
    'bookmarks',
    'search-idle-trending',
    'search-people',
    'search-hashtag',
    'account-menu',
    'settings',
    'not-found-404',
    'empty-following-feed',
    'empty-notifications',
    'feed-dark',
    'profile-own-dark',
    'notifications-dark',
  ])
  const mobile = [...auth(MOBILE), ...app(MOBILE)]
    .filter((shot) => mobileSlugs.has(shot.slug))
    .map((shot) => ({ ...shot, device: M }))

  return [...desktop, ...mobile]
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  log(`web ${WEB}  api ${API}`)
  await fs.mkdir(OUT, { recursive: true })

  const sessions = {}
  for (const username of [HERO, NEWCOMER]) {
    sessions[username] = await tokensFor(username)
  }
  const heroToken = sessions[HERO].access

  // Discover real ids so the deep-link shots point at content that exists.
  const own = await apiJson(`/posts/?author=${HERO}`, heroToken)
  const withComments =
    own.results.find((post) => post.comments_count > 0 && !post.repost_of) ?? own.results[0]
  const withImage = own.results.find((post) => post.image) ?? withComments
  const comments = await apiJson(`/posts/${withComments.id}/comments/`, heroToken)
  const ids = {
    ownPostWithComments: withComments.id,
    ownImagePost: withImage.id,
    commentToHighlight: comments.results?.[0]?.id ?? null,
  }
  log('ids', JSON.stringify(ids))

  const shots = buildShots(ids)
  const width = String(shots.length).length
  const browser = await chromium.launch()
  const failures = []
  let index = 0

  for (const shot of shots) {
    index += 1
    const number = String(index).padStart(Math.max(2, width), '0')
    const kind = shot.device === MOBILE ? 'mobile' : 'desktop'
    const file = `${number}-${shot.slug}-${kind}.png`
    const context = await makeContext(browser, {
      device: shot.device,
      theme: shot.theme,
      auth: shot.as ? sessions[shot.as] : null,
    })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))

    try {
      if (shot.manualShot) {
        // The skeleton shot needs the screenshot taken while a request is in
        // flight, so it is handled here rather than inside the entry.
        await page.route('**/api/v1/posts/**', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 6000))
          await route.continue()
        })
        await page.goto(`${WEB}/`, { waitUntil: 'commit' })
        await page
          .locator('[role="status"][aria-label="Loading posts"]')
          .waitFor({ timeout: 15000 })
        await page.addStyleTag({ content: KILL_MOTION }).catch(() => {})
        await page.waitForTimeout(700)
        await shoot(page, file)
      } else {
        await shot.run(page)
        await shoot(page, file)
      }
      if (consoleErrors.length) {
        log(`    ! console errors on ${file}: ${consoleErrors.slice(0, 3).join(' | ')}`)
      }
    } catch (error) {
      log(`  x FAILED ${file}: ${error.message.split('\n')[0]}`)
      failures.push({ file, error: error.message.split('\n')[0], consoleErrors })
      // Keep a copy of whatever was on screen so the failure can be judged.
      await page
        .screenshot({ path: path.join(OUT, `FAILED-${file}`) })
        .catch(() => {})
    } finally {
      await context.close()
    }
  }

  await browser.close()
  await fs.writeFile(
    path.join(OUT, '_capture-report.json'),
    JSON.stringify({ total: shots.length, failures }, null, 2),
  )
  log(`\ndone: ${shots.length - failures.length}/${shots.length} captured`)
  if (failures.length) {
    log('failures:')
    for (const failure of failures) log(`  ${failure.file} -> ${failure.error}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
