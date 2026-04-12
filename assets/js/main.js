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

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) return;

    if (status) {
      status.textContent = "Nachricht wird gesendet...";
      status.className = "form-status is-pending";
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: new FormData(contactForm)
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      if (status) {
        status.textContent = "Vielen Dank. Die Nachricht wurde erfolgreich versendet.";
        status.className = "form-status is-success";
      }

      contactForm.reset();
    } catch (error) {
      if (status) {
        status.textContent = "Das Senden hat leider nicht funktioniert. Bitte versucht es erneut oder schreibt direkt an info@asc-fds.de.";
        status.className = "form-status is-error";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
});
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
