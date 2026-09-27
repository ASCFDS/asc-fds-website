const BASE = process.env.ASC_QA_BASE_URL || "http://127.0.0.1:8766";
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("fs");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const findings = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://**/*", (route) => route.abort());
    for (const path of [
      "index.html",
      "ueber-uns.html",
      "events_sportbetrieb.html",
      "kontakt.html",
      "mitglied-werden.html",
      "spende/index.html",
      "spende.html",
      "impressum.html",
      "datenschutz.html",
    ]) {
      await page.goto(BASE + "/" + path);
      await page
        .locator("img[loading=lazy]")
        .evaluateAll((imgs) => imgs.forEach((i) => (i.loading = "eager")));
      await page.waitForFunction(() =>
        [...document.images].every((i) => i.complete),
      );
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      const broken = await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src),
        );
      let axe = [];
      if (width === 390 || width === 1440)
        axe = (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            html: n.html,
            summary: n.failureSummary,
          })),
        }));
      findings.push({ width, path, overflow, broken, axe });
      if (path === "index.html" && (width === 390 || width === 1440))
        await page.screenshot({
          path: `/private/tmp/asc-website-qa-home-${width}.png`,
          fullPage: true,
        });
    }
    await context.close();
    findings.push({ width, errors });
  }
  fs.writeFileSync(
    "/private/tmp/asc-website-qa-results.json",
    JSON.stringify(findings, null, 2),
  );
  console.log(
    JSON.stringify(
      findings.filter(
        (f) =>
          f.axe?.length ||
          f.broken?.length ||
          f.overflow?.scroll > f.width ||
          f.errors?.length,
      ),
      null,
      2,
    ),
  );
  if (findings.some(f => f.axe?.length || f.broken?.length || f.overflow?.scroll > f.width || f.errors?.length)) process.exitCode = 1;
  await browser.close();
})();
