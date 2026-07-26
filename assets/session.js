import { supabase, isConfigured } from "./supabase.js?v=8.0";

export async function getSessionUser() {
  if (!isConfigured) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("Session lookup failed:", error);
    return null;
  }
  return data.session?.user || null;
}

export async function getProfile(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data || null;
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
