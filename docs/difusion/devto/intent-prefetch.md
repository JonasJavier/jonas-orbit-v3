---
title: "Prefetch on intent, not on sight: a <Link> wrapper for Next.js"
published: true
description: "Six destination links are always on screen on my 3D portfolio, so Next.js prefetched all six on every page load: 1.3 MB of other pages before the three.js chunk the home needed. Here's the 40-line wrapper that prefetches only when a pointer or focus stays, and the bug it caused on slow networks."
tags: nextjs, react, performance, webdev
cover_image: https://jonasjavier.dev/images/articulos/portafolio-3d/portafolio-3d-sin-js-en-1600.webp
series: Building Jonás Orbit, a 3D portfolio
---

My portfolio is a 3D map with six destinations. On the home page they sit in a
rail under the scene. On every other page they sit in the header. In both
places they are plain Next.js `<Link>`s, so the HTML works without JavaScript.

And `<Link>` prefetches every route as soon as it enters the viewport. Six
links that are always visible means six routes prefetched on every page,
always.

## The symptom

I measured it on `next start`, on the home page. 2.1 seconds after opening it,
the browser had asked for the RSC payload of all six pages: 565 KB. That
payload carries whatever those pages declare with `preload`: the sky and eight
photos of the About page, the Projects room, the Experiments window, plus four
stylesheets from other pages. In total, 1.3 MB of other pages, requested
*before* the 872 KB three.js chunk that draws the scene the visitor is actually
looking at.

The console was the second symptom. Chrome prints "preloaded but not used" for
every preload nobody consumes. I counted 1,830 of those warnings across 174 page
loads.

## Why the obvious fix didn't work

The obvious fix is "prefetch later". Wait until the scene is drawing, or six
seconds after the browser goes idle, then prefetch the six routes in the
background. The bandwidth fight goes away.

The warnings didn't. React applies the `preload` hints from the RSC payload as
soon as it receives it, and Chrome warns about every preload that isn't used,
no matter when it was requested. With the deferred prefetch I still got 14
warnings on the home page and 19 on the Education page.

So the question changed. Not *when* to prefetch six routes, but *which* route
the visitor is about to open. A preload is only "used" if a navigation follows.

## What I did

Every `<Link>` on the site goes through one wrapper, `IntentLink`. It turns off
viewport prefetch and prefetches when you point at the link, focus it or touch
it. Every file imports it under the old name, so call sites didn't change:

```tsx
import { IntentLink as Link } from "@/components/intent-link";
```

`pointerenter` also fires on touch screens, before `click`, so phones go
through the same path. And it stays progressive enhancement: the `<a href>`
navigates the same without JavaScript.

## The code

The wrapper, trimmed from `components/intent-link.tsx`:

```tsx
export function IntentLink({ href, onPointerEnter, onFocus, children, ...rest }: ComponentProps<typeof Link>) {
  const prefetch = usePrefetchOnIntent();
  const target = typeof href === "string" ? href : null;
  return (
    <Link
      href={href}
      prefetch={false}
      onPointerEnter={(event) => {
        if (target) prefetch(target);
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        if (target) prefetch(target);
        onFocus?.(event);
      }}
      {...rest}
    >
      {children}
      <RoutePending />
    </Link>
  );
}
```

And the hook, from `lib/world-prefetch.ts`:

```ts
const INTENT_DWELL_MS = 160;

function stillIntended(href: string): boolean {
  for (const link of document.querySelectorAll("a:hover, a:focus")) {
    if (link.getAttribute("href") === href) return true;
  }
  return false;
}

export function usePrefetchOnIntent() {
  const router = useRouter();
  return useCallback(
    (href: string) => {
      window.setTimeout(() => {
        if (stillIntended(href)) router.prefetch(href);
      }, INTENT_DWELL_MS);
    },
    [router],
  );
}
```

There is no timer to cancel on `pointerleave`. After 160 ms the hook just asks
the DOM whether that link is still hovered or focused. If the cursor already
left, nothing happens.

## My own mistake: hovering is not intent

The first version prefetched on the first `pointerenter`. It looked right on a
fast connection. On a slow one it made things worse.

The black hole sits in the center of the home page. A cursor crossing the map
toward another planet almost always passes over it. Each pass prefetched the
About page with its preloads: the sky and seven photos, about 390 KB. Then the
visitor clicked Contact, and Contact had to share the network with photos
nobody wanted. With DevTools' "Slow 4G" applied, Contact arrived 2.9 seconds
after the transition's flash had already faded.

That's why the 160 ms dwell exists. Intent is *staying*, not passing over. The
unit test says it in one line:

```tsx
it("pasar por encima de camino a otro sitio no precarga", () => {
  render(<IntentLink href="/es/sobre-mi">Sobre mí</IntentLink>);
  fireEvent.pointerEnter(screen.getByRole("link"));
  act(() => vi.advanceTimersByTime(500));
  expect(useRouter().prefetch).not.toHaveBeenCalled();
});
```

(The test names are in Spanish; it reads "passing over on the way somewhere
else doesn't prefetch".)

The click doesn't depend on any of this. A `<Link>` requests its route when you
press it, and on the map the 2.6-second transition prefetches the route at
takeoff.

## The trap: a click that changes nothing

Turning prefetch off has a cost you only see on a slow network. A header click
to a page that wasn't prefetched changed *nothing* on screen for one to three
seconds. It read as a frozen site.

That's the `<RoutePending />` in the wrapper. It uses `useLinkStatus` from
`next/link` and publishes a flag on `<html>` while the clicked page is pending:

```tsx
function RoutePending() {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (!pending) return;
    const root = document.documentElement;
    root.dataset.routePending = "true";
    return () => {
      delete root.dataset.routePending;
    };
  }, [pending]);
  return null;
}
```

CSS turns that flag into a thin progress line at the top, with a 250 ms delay,
so a fast navigation never shows it. The component renders nothing inside the
link: no text, no box. A test checks that the link has zero child elements.

## What isn't solved

- A tap navigates before 160 ms, so on phones the prefetch almost never fires.
  The route is requested on click. It's correct, but touch doesn't get the head
  start a mouse gets.
- `stillIntended` compares the `href` attribute as a string. A link built from
  a `UrlObject` gets `target = null` and simply never prefetches.
- The first trip from the home page still downloads the client chunk of the six
  worlds (about 50 KB compressed) only when you navigate, because the RSC
  prefetch doesn't request it. I left it on purpose. It's a candidate.

## Over to you

160 ms is a number I picked to separate "passing over" from "staying", and it
fixed the slow-network case I measured. I haven't tested it against real
visitors' cursors. How do you decide when a hover means a click is coming? A
fixed dwell, cursor velocity, something else?

You can try the map, and watch the network tab while you move over the
planets, at [jonasjavier.dev](https://jonasjavier.dev/en).

*I'm Jonás Javier Encarnación, a full-stack developer in Santo Domingo,
Dominican Republic. I wrote this post with help from an AI assistant; the code,
the bug and the decisions are from my project.*
