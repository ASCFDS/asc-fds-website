import {
  onRequestGet,
  onRequestOptions,
  onRequestPost
} from "../functions/api/contact.js";

const blockedStaticPaths = new Set([
  "/.dev.vars.example",
  "/.gitignore",
  "/SECURITY_SETUP.md",
  "/_headers",
  "/wrangler.jsonc"
]);

const prettyStaticPaths = new Map([
  ["/spende", "/spende/index.html"],
  ["/spende/", "/spende/index.html"]
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      return handleContactRequest(request, env, ctx);
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ error: "not_found" }, 404);
    }

    if (isBlockedStaticPath(url.pathname)) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    const prettyPath = prettyStaticPaths.get(url.pathname);
    if (prettyPath) {
      url.pathname = prettyPath;
      return env.ASSETS.fetch(new Request(url, request));
    }

    return env.ASSETS.fetch(request);
  }
};

function handleContactRequest(request, env, ctx) {
  const context = { request, env, ctx };

  if (request.method === "GET") {
    return onRequestGet(context);
  }

  if (request.method === "POST") {
    return onRequestPost(context);
  }

  if (request.method === "OPTIONS") {
    return onRequestOptions(context);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, {
    Allow: "GET, POST, OPTIONS"
  });
}

function isBlockedStaticPath(pathname) {
  return (
    blockedStaticPaths.has(pathname) ||
    pathname.startsWith("/functions/") ||
    pathname.startsWith("/src/")
  );
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}
