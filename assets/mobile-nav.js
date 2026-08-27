document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector("header.header, header.reference-header");
  if (!header) return;

  // 1. Ensure mobile elements exist in DOM
  let nav = header.querySelector("nav");
  if (nav && !nav.classList.contains("mobile-navigation-panel")) {
    nav.classList.add("mobile-navigation-panel");
  }

  let menuButton = header.querySelector(".mobile-menu-button");
  if (!menuButton) {
    menuButton = document.createElement("button");
    menuButton.className = "mobile-menu-button";
    menuButton.setAttribute("aria-label", "Toggle navigation menu");
    menuButton.innerHTML = "<span></span><span></span><span></span>";
    header.appendChild(menuButton);
  }

  let overlay = document.querySelector(".mobile-menu-overlay");
  if (!overlay) {
    overlay = document.createElement("button");
    overlay.className = "mobile-menu-overlay";
    overlay.setAttribute("aria-label", "Close navigation menu");
    document.body.appendChild(overlay);
  }

  // 2. Toggle Functions
  const openMenu = () => {
    document.body.classList.add("mobile-menu-open");
    menuButton.setAttribute("aria-expanded", "true");
  };

  const closeMenu = () => {
    document.body.classList.remove("mobile-menu-open");
    menuButton.setAttribute("aria-expanded", "false");
  };

  const toggleMenu = () => {
    if (document.body.classList.contains("mobile-menu-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // 3. Event Listeners
  menuButton.addEventListener("click", toggleMenu);
  overlay.addEventListener("click", closeMenu);

  // Close menu when clicking links inside nav
  if (nav) {
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  // Close menu on Escape key press
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("mobile-menu-open")) {
      closeMenu();
    }
  });
});