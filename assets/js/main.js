document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const yearTargets = document.querySelectorAll("[data-current-year]");
  const currentYear = new Date().getFullYear();

  yearTargets.forEach((el) => {
    el.textContent = currentYear;
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.querySelector("[data-contact-form]");
  if (!contactForm) return;

  const status = contactForm.querySelector("[data-form-status]");
  const submitButton = contactForm.querySelector("button[type='submit']");
  const turnstileTarget = contactForm.querySelector("[data-turnstile-widget]");
  const browserRateLimitKey = "ascContactFormSubmissions";
  const browserRateLimitWindow = 60 * 1000;
  const browserRateLimitMax = 3;
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
      const siteKey = turnstileTarget.dataset.sitekey || await fetchTurnstileSiteKey();
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
          setStatus("Bitte die Sicherheitsprüfung erneut abschließen.", "is-error");
        },
        "error-callback": () => {
          turnstileIsReady = false;
          setSubmitDisabled(true);
          setStatus("Die Sicherheitsprüfung konnte nicht geladen werden. Bitte später erneut versuchen.", "is-error");
        }
      });
    } catch (error) {
      turnstileIsReady = false;
      setSubmitDisabled(true);
      setStatus("Die Sicherheitsprüfung konnte nicht geladen werden. Bitte direkt an info@asc-fds.de schreiben.", "is-error");
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

    if (!contactForm.reportValidity()) return;

    const formData = new FormData(contactForm);

    if (formData.get("_honey") || formData.get("website")) {
      contactForm.reset();
      setStatus("Vielen Dank. Die Nachricht wurde erfolgreich versendet.", "is-success");
      return;
    }

    if (isBrowserRateLimited(browserRateLimitKey, browserRateLimitWindow, browserRateLimitMax)) {
      setStatus("Bitte warte kurz, bevor du eine weitere Nachricht sendest.", "is-error");
      return;
    }

    if (!turnstileIsReady || !formData.get("cf-turnstile-response")) {
      setStatus("Bitte die Sicherheitsprüfung abschließen.", "is-error");
      return;
    }

    setStatus("Nachricht wird gesendet...", "is-pending");
    setSubmitDisabled(true);

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: formData
      });

      if (!response.ok) {
        const error = await readResponseError(response);
        throw new Error(error || "Request failed");
      }

      rememberBrowserSubmission(browserRateLimitKey, browserRateLimitWindow);
      setStatus("Vielen Dank. Die Nachricht wurde erfolgreich versendet.", "is-success");
      contactForm.reset();
    } catch (error) {
      const rateLimitMessage = error.message === "rate_limited"
        ? "Bitte warte kurz, bevor du eine weitere Nachricht sendest."
        : "Das Senden hat leider nicht funktioniert. Bitte versucht es erneut oder schreibt direkt an info@asc-fds.de.";

      setStatus(rateLimitMessage, "is-error");
    } finally {
      resetTurnstile();
    }
  });
});

async function fetchTurnstileSiteKey() {
  const response = await fetch("/api/contact", {
    headers: {
      Accept: "application/json"
    },
    credentials: "same-origin"
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
        window.turnstile.ready(() => resolve(window.turnstile));
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
    const timestamps = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
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
// Termine automatisch als "vergangen" markieren
document.addEventListener("DOMContentLoaded", () => {
  const events = document.querySelectorAll(".timeline-item[data-event-date]");
  const today = new Date();

  events.forEach((event) => {
    const dateStr = event.getAttribute("data-event-date");
    const eventDate = new Date(dateStr);

    // Uhrzeit auf 00:00 setzen für sauberen Vergleich
    eventDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    if (eventDate < today) {
      event.classList.add("is-past");
    }
  });
});
// EVENTS SORTIEREN + STATUS
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("events-list");
  if (!container) return;

  const items = Array.from(container.querySelectorAll(".timeline-item"));
  const today = new Date();
  today.setHours(0,0,0,0);

  items.forEach(item => {
    const date = new Date(item.dataset.eventDate);
    date.setHours(0,0,0,0);

    if (date < today) {
      item.classList.add("is-past");
    } else if (date.getTime() === today.getTime()) {
      item.classList.add("is-today");
    }
  });

  items.sort((a, b) => {
    const da = new Date(a.dataset.eventDate);
    const db = new Date(b.dataset.eventDate);
    return db - da;
  });

  items.forEach(item => container.appendChild(item));
});
