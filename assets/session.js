import { auth, isConfigured, waitForAuth, getProfile as firebaseGetProfile } from "./firebase.js?v=10.0";

export async function getSessionUser() {
  if (!isConfigured) return null;
  return await waitForAuth();
}

export async function getProfile(userId) {
  return await firebaseGetProfile(userId);
}

export async function requireUser(returnTo = location.href) {
  const user = await getSessionUser();
  if (user) return user;
  location.href = `./auth.html?returnTo=${encodeURIComponent(returnTo)}`;
  return null;
}

export async function renderAccountNavigation() {
  const links = [...document.querySelectorAll("[data-account-link]")];
  if (!links.length) return;
  const user = await getSessionUser();
  for (const link of links) {
    if (user) {
      link.href = "./profile.html";
      link.textContent = "My Account";
      link.title = user.email || "My Account";
    } else {
      link.href = "./auth.html";
      link.textContent = "Sign in";
      link.title = "Sign in";
    }
  }
}

export function safeReturnUrl(raw) {
  if (!raw) return "./index.html";
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) return "./index.html";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "./index.html";
  }
}

renderAccountNavigation();
