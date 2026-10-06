document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.querySelector("[data-contact-form]");
  if (!contactForm) return;

  const status = contactForm.querySelector("[data-form-status]");
  const submitButton = contactForm.querySelector("button[type='submit']");
  const turnstileTarget = contactForm.querySelector("[data-turnstile-widget]");
  const browserRateLimitKey = "ascContactFormSubmissions";
  const browserRateLimitWindow = 60 * 1000;
  const browserRateLimitMax = 3;
  let isSubmitting = false;
  let turnstileWidgetId = null;
  let turnstileIsReady = !turnstileTarget;

  const setStatus = (message, state) => {
    if (!status) return;

    status.textContent = message;
    status.className = state ? `form-status ${state}` : "form-status";
  };

  const setSubmitDisabled = (disabled) => {
    if (submitButton) {
      submitButton.disabled = disabled;
    }
  };

  const loadTurnstile = async () => {
    if (!turnstileTarget) return;

    setSubmitDisabled(true);

    try {
      const siteKey =
        turnstileTarget.dataset.sitekey || (await fetchTurnstileSiteKey());
      const turnstile = await waitForTurnstile();

      turnstileWidgetId = turnstile.render(turnstileTarget, {
        sitekey: siteKey,
        action: "contact",
        theme: "light",
        size: "flexible",
        callback: () => {
          turnstileIsReady = true;
          setSubmitDisabled(false);
        },
        "expired-callback": () => {
          turnstileIsReady = false;
          setSubmitDisabled(true);
          setStatus(
            "Bitte die Sicherheitsprüfung erneut abschließen.",
            "is-error",
          );
        },
        "error-callback": () => {
          turnstileIsReady = false;
          setSubmitDisabled(true);
          setStatus(
            "Die Sicherheitsprüfung konnte nicht geladen werden. Bitte später erneut versuchen.",
            "is-error",
          );
        },
      });
    } catch (error) {
      turnstileIsReady = false;
      setSubmitDisabled(true);
      setStatus(
        "Die Sicherheitsprüfung konnte nicht geladen werden. Bitte direkt an info@asc-fds.de schreiben.",
        "is-error",
      );
    }
  };

  const resetTurnstile = () => {
    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
      turnstileIsReady = false;
      setSubmitDisabled(true);
    }
  };

  loadTurnstile();

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting || !contactForm.reportValidity()) return;

    const formData = new FormData(contactForm);

    if (formData.get("_honey") || formData.get("website")) {
      contactForm.reset();
      setStatus(
        "Vielen Dank. Die Nachricht wurde erfolgreich versendet.",
        "is-success",
      );
      return;
    }

    if (
      isBrowserRateLimited(
        browserRateLimitKey,
        browserRateLimitWindow,
        browserRateLimitMax,
      )
    ) {
      setStatus(
        "Bitte warte kurz, bevor du eine weitere Nachricht sendest.",
        "is-error",
      );
      return;
    }

    if (!turnstileIsReady || !formData.get("cf-turnstile-response")) {
      setStatus("Bitte die Sicherheitsprüfung abschließen.", "is-error");
      return;
    }

    isSubmitting = true;
    setStatus("Nachricht wird gesendet...", "is-pending");
    setSubmitDisabled(true);

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        const error = await readResponseError(response);
        throw new Error(error || "Request failed");
      }

      const result = await response.json();
      if (result.ok !== true) throw new Error("Invalid delivery response");
      rememberBrowserSubmission(browserRateLimitKey, browserRateLimitWindow);
      setStatus(
        "Vielen Dank. Die Nachricht wurde erfolgreich versendet.",
        "is-success",
      );
      contactForm.reset();
    } catch (error) {
      const rateLimitMessage =
        error.message === "rate_limited"
          ? "Bitte warte kurz, bevor du eine weitere Nachricht sendest."
          : "Das Senden hat leider nicht funktioniert. Bitte versucht es erneut oder schreibt direkt an info@asc-fds.de.";

      setStatus(rateLimitMessage, "is-error");
    } finally {
      isSubmitting = false;
      resetTurnstile();
    }
  });
});

async function fetchTurnstileSiteKey() {
  const response = await fetch("/api/contact", {
    headers: {
      Accept: "application/json",
    },
    credentials: "same-origin",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error("Turnstile configuration failed");
  }

  const config = await response.json();

  if (!config.siteKey) {
    throw new Error("Missing Turnstile site key");
  }

  return config.siteKey;
}

function waitForTurnstile() {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      if (window.turnstile && typeof window.turnstile.render === "function") {
        // The deferred, explicit API is available now; ready() rejects deferred scripts.
        resolve(window.turnstile);
        return;
      }

      attempts += 1;

      if (attempts > 50) {
        reject(new Error("Turnstile script unavailable"));
        return;
      }

      window.setTimeout(check, 100);
    };

    check();
  });
}

async function readResponseError(response) {
  try {
    const payload = await response.json();
    return payload.error;
  } catch (error) {
    return "";
  }
}

function getBrowserSubmissions(storageKey, windowMs) {
  try {
    const now = Date.now();
    const timestamps = JSON.parse(
      window.localStorage.getItem(storageKey) || "[]",
    );
    return timestamps.filter((timestamp) => now - timestamp < windowMs);
  } catch (error) {
    return [];
  }
}

function isBrowserRateLimited(storageKey, windowMs, maxSubmissions) {
  return getBrowserSubmissions(storageKey, windowMs).length >= maxSubmissions;
}

function rememberBrowserSubmission(storageKey, windowMs) {
  try {
    const timestamps = getBrowserSubmissions(storageKey, windowMs);
    timestamps.push(Date.now());
    window.localStorage.setItem(storageKey, JSON.stringify(timestamps));
  } catch (error) {
    // localStorage can be unavailable in private or restricted browsing contexts.
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  document.documentElement.classList.add("js");
  const close = () => {
    nav?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "Navigation öffnen");
  };
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Navigation schließen" : "Navigation öffnen",
    );
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav?.classList.contains("open")) {
      close();
      toggle.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav")) close();
  });
  nav?.addEventListener("click", (e) => {
    if (e.target.closest("a")) close();
  });
  nav?.addEventListener("focusout", () =>
    setTimeout(() => {
      if (!document.activeElement.closest(".nav")) close();
    }, 0),
  );
  window.matchMedia?.('(min-width: 981px)').addEventListener?.('change', close);
  document.querySelectorAll('[data-print]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => window.print());
  });
  const header = document.querySelector(".site-header");
  const scroll = () => header?.classList.toggle("is-scrolled", scrollY > 40);
  window.addEventListener("scroll", scroll, { passive: true });
  scroll();
  document
    .querySelectorAll("[data-current-year]")
    .forEach((n) => (n.textContent = new Date().getFullYear()));
  if (
    new URLSearchParams(location.search).get("anliegen") === "probetraining"
  ) {
    const subject = document.getElementById("betreff");
    if (subject) subject.value = "Probetraining";
  }
  if (
    new URLSearchParams(location.search).get("anliegen") === "mitgliedschaft"
  ) {
    const subject = document.getElementById("betreff");
    if (subject) subject.value = "Mitgliedschaft";
  }
  document.querySelectorAll(".external-content").forEach((panel) => {
    const load = panel.querySelector("[data-external-load]"),
      revoke = panel.querySelector("[data-external-revoke]"),
      slot = panel.querySelector("[data-external-slot]"),
      status = panel.querySelector("[data-external-status]");
    const template = slot.querySelector("template")?.content.cloneNode(true);
    let attempt = 0;
    load.addEventListener("click", () => {
      if (load.disabled) return;
      const current = ++attempt;
      let settled = false;
      load.disabled = true;
      slot.setAttribute("aria-busy", "true");
      status.textContent = "Inhalt wird geladen …";
      revoke.hidden = false;
      const finish = (error = false) => {
        if (settled || current !== attempt) return;
        settled = true;
        clearTimeout(timeout);
        slot.setAttribute("aria-busy", "false");
        if (error) {
          slot.replaceChildren();
          panel.classList.remove("is-active");
          status.textContent = "Der Dienst konnte nicht geladen werden. Bitte erneut versuchen oder den Kontakt zum Verein nutzen.";
          load.textContent = "Erneut laden und zustimmen";
          load.disabled = false;
          load.hidden = false;
          // Keep the reload control available: provider scripts may have started.
        } else {
          status.textContent = panel.dataset.external === "maps"
            ? "Karte aktiviert. Falls sie nicht angezeigt wird, nutze den Routenlink oberhalb."
            : "Externer Dienst aktiviert. Falls kein Inhalt erscheint, kontaktiere uns bitte.";
          load.hidden = true;
          // Hiding the activation button must not lose keyboard focus.
          if (document.activeElement === load) revoke.focus({ preventScroll: true });
        }
      };
      const timeout = setTimeout(() => finish(true), 15000);
      if (panel.dataset.external === "maps") {
        const frame = document.createElement("iframe");
        frame.title = "Google Maps: Schützenhaus Erlenweg 29/1, Freudenstadt";
        frame.src = "https://www.google.com/maps?q=Erlenweg%2029%2F1%2C%2072250%20Freudenstadt&z=15&output=embed";
        frame.width = "100%";
        frame.height = "320";
        frame.referrerPolicy = "no-referrer";
        frame.onload = () => finish();
        frame.onerror = () => finish(true);
        slot.replaceChildren(frame);
        const hadFocus = document.activeElement === load;
        panel.classList.add("is-active");
        if (hadFocus) revoke.focus({ preventScroll: true });
      } else {
        slot.replaceChildren(template.cloneNode(true));
        const script = document.createElement("script");
        script.src = panel.dataset.external === "donation"
          ? "https://www.viele-schaffen-mehr.de/projects/vsm/dist/js/widget.js"
          : "https://admin.campai.com/lib/web-form.js";
        if (panel.dataset.external === "donation") script.dataset.script = "cf-project-widget";
        script.onload = () => {
          if (settled || current !== attempt) return;
          try {
            if (panel.dataset.external === "donation" && typeof window.loadWidget === "function") window.loadWidget();
            finish();
          } catch { finish(true); }
        };
        script.onerror = () => finish(true);
        slot.append(script);
      }
    });
    revoke.addEventListener("click", () => {
      location.reload();
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
  document.querySelectorAll("[data-result-end]").forEach((row) => {
    const badge = row.querySelector(".result-badge");
    if (row.dataset.resultStatus !== "available")
      badge.textContent =
        row.dataset.resultEnd >= today
          ? "Bevorstehend"
          : row.dataset.resultStatus === "report-pending"
            ? "Bericht folgt"
            : "Abgeschlossen";
  });
});
