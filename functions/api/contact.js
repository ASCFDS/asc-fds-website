const CONTACT_ENDPOINT = "https://formsubmit.co/ajax/info@asc-fds.de";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const MAX_BODY_BYTES = 24 * 1024;
const ipSubmissions = new Map();

const securityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "X-Robots-Tag": "noindex"
};

const jsonHeaders = {
  ...securityHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders
  });
}

export async function onRequestGet({ env }) {
  if (!isContactConfigured(env)) {
    return jsonResponse({ error: "turnstile_not_configured" }, 503);
  }

  return jsonResponse({ siteKey: env.TURNSTILE_SITE_KEY });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      ...securityHeaders,
      Allow: "GET, POST, OPTIONS"
    }
  });
}

export async function onRequestPost({ request, env }) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return jsonResponse({ error: "invalid_origin" }, 403);
  }

  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "payload_too_large" }, 413);
  }

  if (!isContactConfigured(env)) {
    return jsonResponse({ error: "turnstile_not_configured" }, 503);
  }

  const clientIp = getClientIp(request);

  if (isRateLimited(clientIp)) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  let formData;

  try {
    formData = await request.formData();
  } catch (error) {
    return jsonResponse({ error: "invalid_form_data" }, 400);
  }

  if (isHoneypotFilled(formData)) {
    return jsonResponse({ ok: true });
  }

  const fields = normalizeFields(formData);
  const validationError = validateFields(fields);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  const turnstileToken = stringValue(formData.get("cf-turnstile-response"));

  if (!turnstileToken) {
    return jsonResponse({ error: "missing_turnstile_token" }, 400);
  }

  const turnstileResult = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, clientIp);

  if (!turnstileResult.success) {
    return jsonResponse({ error: "turnstile_failed" }, 400);
  }

  const forwardData = new FormData();
  forwardData.set("_subject", "Neue Nachricht über die ASC-Website");
  forwardData.set("_template", "table");
  forwardData.set("name", fields.name);
  forwardData.set("email", fields.email);
  forwardData.set("telefon", fields.telefon || "-");
  forwardData.set("betreff", fields.betreff);
  forwardData.set("nachricht", fields.nachricht);
  forwardData.set("datenschutz", "akzeptiert");

  const endpoint = env.FORMSUBMIT_ENDPOINT || CONTACT_ENDPOINT;
  const formSubmitResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json"
    },
    body: forwardData
  });

  if (!formSubmitResponse.ok) {
    return jsonResponse({ error: "mail_delivery_failed" }, 502);
  }

  return jsonResponse({ ok: true });
}

function isContactConfigured(env) {
  return Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (ipSubmissions.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipSubmissions.set(ip, recent);
    return true;
  }

  recent.push(now);
  ipSubmissions.set(ip, recent);
  pruneRateLimitMap(now);
  return false;
}

function pruneRateLimitMap(now) {
  if (ipSubmissions.size < 1000) return;

  for (const [ip, timestamps] of ipSubmissions) {
    const recent = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

    if (recent.length) {
      ipSubmissions.set(ip, recent);
    } else {
      ipSubmissions.delete(ip);
    }
  }
}

function isHoneypotFilled(formData) {
  return Boolean(stringValue(formData.get("_honey")) || stringValue(formData.get("website")));
}

function normalizeFields(formData) {
  return {
    name: cleanText(formData.get("name"), 120),
    email: cleanEmail(formData.get("email")),
    telefon: cleanText(formData.get("telefon"), 60),
    betreff: cleanText(formData.get("betreff"), 160),
    nachricht: cleanText(formData.get("nachricht"), 4000),
    datenschutz: stringValue(formData.get("datenschutz"))
  };
}

function validateFields(fields) {
  if (!fields.name || !fields.email || !fields.betreff || !fields.nachricht || !fields.datenschutz) {
    return "missing_required_fields";
  }

  if (hasHeaderInjection(fields.name) || hasHeaderInjection(fields.email) || hasHeaderInjection(fields.betreff)) {
    return "invalid_header_value";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return "invalid_email";
  }

  return null;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanText(value, maxLength) {
  return stringValue(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLength)
    .trim();
}

function cleanEmail(value) {
  return stringValue(value).slice(0, 254).trim();
}

function hasHeaderInjection(value) {
  return /[\r\n]/.test(value);
}

async function verifyTurnstile(token, secret, remoteIp) {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp
      })
    });

    if (!response.ok) {
      return { success: false };
    }

    return response.json();
  } catch (error) {
    return { success: false };
  }
}
