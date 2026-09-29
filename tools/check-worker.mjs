import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

// Run against a local OpenNext preview, never a live contact endpoint.
const origin = new URL(process.env.WORKER_TEST_ORIGIN ?? "http://127.0.0.1:8787");
assert.equal(origin.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname));
assert.equal(origin.pathname, "/");
assert.equal(origin.search, "");
assert.equal(origin.hash, "");
assert.equal(origin.username + origin.password, "");

const request = (path, options = {}) => fetch(new URL(path, origin), {
  ...options,
  redirect: "manual",
  signal: AbortSignal.timeout(10_000),
});

let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await request("/es");
    await response.body?.cancel();
    if (response.status === 200) { ready = true; break; }
  } catch { /* The preview process may still be starting. */ }
  await delay(1_000);
}
assert.ok(ready, `OpenNext preview did not become ready at ${origin.origin}`);

// The six destinations in each published language (English is the default).
const DESTINATIONS = {
  en: ["about", "education", "projects", "creativity", "experiments", "contact"],
  es: ["sobre-mi", "formacion", "proyectos", "creatividad", "experimentos", "contacto"],
};

const manifest = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
const routes = new Set(["/en", "/es", ...Object.entries(manifest.routes)
  .filter(([path, entry]) => /^\/(en|es)\//.test(path) && entry.routeType === "page")
  .map(([path]) => path)]);
for (const [locale, paths] of Object.entries(DESTINATIONS)) {
  for (const path of paths) {
    assert.ok(routes.has(`/${locale}/${path}`), `Published destination is missing from the build: /${locale}/${path}`);
  }
}

for (const path of routes) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path}: expected prerendered HTML, got ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  const html = await response.text();
  assert.match(html, /<main[\s>]/, `${path}: semantic content is missing`);
  assert.match(html, /<h1[\s>]/, `${path}: a readable heading is missing`);
  console.log(`PASS ${path}`);
}

let homeHtml = "";
for (const [locale, paths] of Object.entries(DESTINATIONS)) {
  const html = await (await request(`/${locale}`)).text();
  assert.match(html, new RegExp(`<html lang="${locale}"`), `/${locale}: wrong document language`);
  for (const destination of paths) {
    assert.ok(html.includes(`href="/${locale}/${destination}"`), `/${locale} home is missing ${destination}`);
  }
  homeHtml ||= html;
}
const firstScript = /<script[^>]+src="([^"]*\/_next\/static\/[^\"]+\.js)"/.exec(homeHtml)?.[1];
assert.ok(firstScript, "Home does not reference a versioned JavaScript chunk");
const chunk = await request(firstScript);
assert.equal(chunk.status, 200, "Versioned JavaScript chunk is unavailable");
assert.match(chunk.headers.get("cache-control") ?? "", /immutable/);
await chunk.body?.cancel();
const cv = await request("/cv/jonas-javier-cv-es.pdf");
assert.equal(cv.status, 200, "Published Spanish CV is missing");
assert.match(cv.headers.get("content-type") ?? "", /application\/pdf/);
await cv.body?.cancel();

for (const path of ["/es/no-existe", "/es/desarrollo", "/es/laboratorio", "/es/proyectos/no-existe", "/en/proyectos", "/es/privacy"]) {
  const response = await request(path);
  assert.equal(response.status, 404, `${path}: retired/unknown route must stay 404`);
  await response.body?.cancel();
}
const root = await request("/");
assert.ok([307, 308].includes(root.status), "root must redirect without rendering another page");
assert.equal(new URL(root.headers.get("location"), origin).pathname, "/en");
await root.body?.cancel();

const contactConfig = await request("/api/contact");
// A candidate without private bindings legitimately returns 503; the endpoint
// must still run dynamically and never cache its public configuration.
assert.ok([200, 503].includes(contactConfig.status));
assert.match(contactConfig.headers.get("cache-control") ?? "", /no-store/);
await contactConfig.body?.cancel();

// Deliberately invalid input: exercises the real Worker without delivering mail.
const invalid = await request("/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
assert.equal(invalid.status, 400);
assert.equal((await invalid.json()).code, "validation");
console.log(`Worker smoke passed: ${routes.size} HTML routes in two languages, redirect, six 404s, dynamic contact config and invalid input.`);
