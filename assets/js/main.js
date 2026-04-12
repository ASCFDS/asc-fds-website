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
