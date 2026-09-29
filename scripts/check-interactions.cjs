const BASE = process.env.ASC_QA_BASE_URL || "http://127.0.0.1:8766";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("fs");
require("../assets/js/event-model.js");
const manual = require("../assets/data/events.json");
const expected = globalThis.ASCEvents.split(manual);
const resultCount = require("../assets/data/results.json").length;
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  const checks = [];
  let posted = false,
    mode = "success",
    live = [];
  const external = [];
  await p.route("https://**/*", async (route) => {
    const url = route.request().url();
    external.push(url);
    if (url.includes("/publicEvents"))
      return route.fulfill({ json: { events: live } });
    if (url.includes("turnstile/v0/api.js"))
      return route.fulfill({
        contentType: "application/javascript",
        body: `window.turnstile={ready:cb=>cb(),render:(el,options)=>{const i=document.createElement('input');i.name='cf-turnstile-response';i.type='hidden';i.value='test';el.append(i);options.callback();return 1;},reset:()=>{}};`,
      });
    if (url.includes("widget.js") || url.includes("web-form.js"))
      return route.fulfill({ contentType: "application/javascript", body: "" });
    return route.fulfill({ body: "", contentType: "text/html" });
  });
  await p.route("**/api/contact", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { siteKey: "test" } });
    posted = true;
    return route.fulfill({
      status: mode === "success" ? 200 : 503,
      json: mode === "success" ? { ok: true } : { error: "unavailable" },
    });
  });
  await p.goto(BASE + "/index.html");
  assert.equal(await p.locator("#events-list").count(), 0);
  assert.equal(
    external.some((url) => url.includes("/publicEvents")),
    false,
  );
  checks.push("Homepage retains original content and makes no event request");
  await p.locator(".nav-toggle").click();
  assert.equal(
    await p.locator(".nav-toggle").getAttribute("aria-expanded"),
    "true",
  );
  await p.keyboard.press("Escape");
  assert.equal(
    await p.locator(".nav-toggle").getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(
    await p
      .locator(".nav-toggle")
      .evaluate((n) => document.activeElement === n),
    true,
  );
  checks.push("Mobile menu opens, Escape closes, focus returns");
  live = [
    {
      title: "<img src=x onerror=alert(1)>",
      startDate: "2099-01-01",
      endDate: "2099-01-01",
      hasTime: false,
      category: "Wettkampf",
    },
  ];
  await p.goto(BASE + "/events_sportbetrieb.html");
  await p.waitForFunction(
    count => document.querySelectorAll("#events-list article").length === count,
    expected.upcoming.length + 1,
  );
  assert.equal(await p.locator("#events-list img").count(), 0);
  checks.push("API text on the event page is safely escaped");
  await p.goto(BASE + "/events_sportbetrieb.html");
  await p.waitForFunction(
    count => document.querySelectorAll("#events-list article").length === count,
    expected.upcoming.length + 1,
  );
  assert.equal(await p.locator("#events-archive article").count(), expected.past.length);
  await p.locator("#event-category").selectOption("Wettkampf");
  assert.equal(await p.locator("#events-list article").count(), 1);
  checks.push("Archive, category filter and live event merge work");
  for (const [path, provider, pattern] of [
    ["kontakt.html", "maps", "www.google.com/maps"],
    ["mitglied-werden.html", "membership", "admin.campai.com"],
    ["spende/index.html", "donation", "viele-schaffen-mehr.de"],
  ]) {
    external.length = 0;
    await p.goto(BASE + "/" + path);
    assert.equal(
      external.some((u) => u.includes(pattern)),
      false,
    );
    await p.locator(`[data-external=${provider}] [data-external-load]`).click();
    await p.waitForTimeout(200);
    assert.equal(
      external.some((u) => u.includes(pattern)),
      true,
    );
    await p
      .locator(`[data-external=${provider}] [data-external-revoke]`)
      .click();
    await p.waitForLoadState();
    assert.equal(
      await p
        .locator(`[data-external=${provider}] [data-external-load]`)
        .isVisible(),
      true,
    );
    checks.push(
      `${provider}: no provider request before consent; activation and withdrawal work`,
    );
  }
  await p.goto(BASE + "/kontakt.html?anliegen=probetraining#anfrage");
  assert.equal(await p.locator("#betreff").inputValue(), "Probetraining");
  await p.locator("#name").fill("Test");
  await p.locator("#email").fill("test@example.com");
  await p.locator("#nachricht").fill("Test request retained");
  await p.locator("#datenschutz").check();
  mode = "error";
  await p.locator("button[type=submit]").click();
  await p.waitForFunction(() =>
    document
      .querySelector("[data-form-status]")
      .textContent.includes("nicht funktioniert"),
  );
  assert.equal(
    await p.locator("#nachricht").inputValue(),
    "Test request retained",
  );
  assert.equal(posted, true);
  checks.push("Trial subject preselected; server error preserves input");
  await p.reload();
  await p.locator("#name").fill("Test");
  await p.locator("#email").fill("test@example.com");
  await p.locator("#nachricht").fill("Mock success");
  await p.locator("#datenschutz").check();
  mode = "success";
  await p.locator("button[type=submit]").click();
  await p.waitForFunction(() =>
    document
      .querySelector("[data-form-status]")
      .textContent.includes("erfolgreich"),
  );
  assert.equal(await p.locator("#name").inputValue(), "");
  checks.push("Mock successful submission clears form; no real mail sent");
  const nojs = await b.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 800 },
  });
  const n = await nojs.newPage();
  await n.goto(BASE + "/events_sportbetrieb.html");
  assert.equal(await n.locator(".site-nav").isVisible(), true);
  assert.equal(await n.locator("#events-list article").count(), expected.upcoming.length);
  assert.equal(await n.locator(".results-table tbody tr").count(), resultCount);
  checks.push(
    "No JavaScript: navigation, upcoming events, archive and results are accessible",
  );
  await nojs.close();
  await b.close();
  fs.writeFileSync(
    "/private/tmp/asc-website-qa-functional-results.json",
    JSON.stringify(checks, null, 2),
  );
  console.log(checks.join("\n"));
})();
