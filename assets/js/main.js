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
