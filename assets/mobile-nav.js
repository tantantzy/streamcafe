const MOBILE_BREAKPOINT = 760;

function initializeMobileNavigation() {
  const header = document.querySelector(".header, .reference-header");
  const nav = header?.querySelector(".main-nav, .reference-nav");

  if (!header || !nav || header.querySelector(".mobile-menu-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "mobile-menu-button";
  button.setAttribute("aria-label", "Open navigation menu");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  const overlay = document.createElement("button");
  overlay.type = "button";
  overlay.className = "mobile-menu-overlay";
  overlay.setAttribute("aria-label", "Close navigation menu");

  header.appendChild(button);
  document.body.appendChild(overlay);
  nav.classList.add("mobile-navigation-panel");

  const closeMenu = () => {
    document.body.classList.remove("mobile-menu-open");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open navigation menu");
  };

  const openMenu = () => {
    document.body.classList.add("mobile-menu-open");
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", "Close navigation menu");
  };

  button.addEventListener("click", () => {
    document.body.classList.contains("mobile-menu-open")
      ? closeMenu()
      : openMenu();
  });

  overlay.addEventListener("click", closeMenu);

  nav.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (!link) return;

    event.stopPropagation();
    closeMenu();

    // Let normal navigation continue. This timeout avoids some mobile
    // browsers swallowing the click while the drawer is closing.
    const destination = link.href;
    if (destination) {
      event.preventDefault();
      window.setTimeout(() => {
        window.location.href = destination;
      }, 60);
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > MOBILE_BREAKPOINT) closeMenu();
  });
}

initializeMobileNavigation();
