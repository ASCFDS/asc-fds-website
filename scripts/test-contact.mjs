import assert from "node:assert/strict";
import { onRequestPost, onRequestGet } from "../functions/api/contact.js";
const env = {
  TURNSTILE_SITE_KEY: "public-test-key",
  TURNSTILE_SECRET_KEY: "test-only",
  FORMSUBMIT_ENDPOINT: "https://mail.example.test/contact",
};
let index = 0,
  forwarded = 0,
  delivery = "ok",
  verify = true;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (String(url).includes("siteverify")) {
    if (verify === "invalid") return new Response("<html>Error</html>");
    return Response.json({ success: verify });
  }
  forwarded++;
  if (delivery === "network") throw new Error("Network unavailable");
  if (delivery === "rejected") return Response.json({ success: false });
  if (delivery === "empty") return Response.json({});
  if (delivery === "invalid") return new Response("<html>Error</html>");
  return Response.json({ success: "true" });
};
async function request(extra = {}, opts = {}) {
  const data = new FormData();
  const fields = {
    name: "Test",
    email: "test@example.com",
    betreff: "Probetraining",
    nachricht: "Test message",
    datenschutz: "on",
    "cf-turnstile-response": "test",
    ...extra,
  };
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  const encoded = new Response(data);
  const body = await encoded.arrayBuffer();
  return new Request("https://www.asc-fds.de/api/contact", {
    method: "POST",
    headers: {
      "content-type": encoded.headers.get("content-type"),
      origin: opts.origin || "https://www.asc-fds.de",
      "CF-Connecting-IP": opts.ip || `test-${index++}`,
    },
    body,
  });
}
try {
  assert.equal((await onRequestGet({ env: {} })).status, 503);
  assert.deepEqual(await (await onRequestGet({ env })).json(), {
    siteKey: env.TURNSTILE_SITE_KEY,
  });
  const run = async (r) => onRequestPost({ request: await r, env });
  assert.equal(
    (await run(request({}, { origin: "https://other.example" }))).status,
    403,
  );
  assert.equal((await run(request({ email: "invalid" }))).status, 400);
  assert.equal(
    (await run(request({ "cf-turnstile-response": "" }))).status,
    400,
  );
  const before = forwarded;
  assert.equal((await run(request({ _honey: "bot" }))).status, 200);
  assert.equal(forwarded, before);
  assert.equal(
    (await run(request({ nachricht: "x".repeat(30000) }))).status,
    413,
  );
  verify = false;
  assert.equal((await run(request())).status, 400);
  verify = "invalid";
  assert.equal((await run(request())).status, 400);
  verify = true;
  assert.equal((await run(request())).status, 200);
  for (const mode of ["network", "rejected", "invalid", "empty"]) {
    delivery = mode;
    assert.equal((await run(request())).status, 502);
  }
  delivery = "ok";
  for (let i = 0; i < 3; i++)
    assert.equal(
      (await run(request({}, { ip: "same-test-client" }))).status,
      200,
    );
  assert.equal(
    (await run(request({}, { ip: "same-test-client" }))).status,
    429,
  );
  console.log(
    "Contact regression checks passed: configuration, origin, validation, honeypot, body limit, captcha, delivery failure and rate limit. No actual mail sent.",
  );
} finally {
  globalThis.fetch = originalFetch;
}
