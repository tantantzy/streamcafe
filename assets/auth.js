import { supabase, isConfigured } from "./supabase.js?v=8.0";
import { getSessionUser, safeReturnUrl } from "./session.js?v=8.0";

const $ = selector => document.querySelector(selector);
const message = $("#authMessage");
const loginForm = $("#loginForm");
const signupForm = $("#signupForm");
const resetForm = $("#resetForm");
const returnTo = safeReturnUrl(new URLSearchParams(location.search).get("returnTo"));

function show(form) {
  loginForm.hidden = form !== "login";
  signupForm.hidden = form !== "signup";
  resetForm.hidden = form !== "reset";
  $("#showLogin").classList.toggle("active", form === "login");
  $("#showSignup").classList.toggle("active", form === "signup");
  message.textContent = "";
}

$("#showLogin").onclick = () => show("login");
$("#showSignup").onclick = () => show("signup");
$("#showReset").onclick = () => show("reset");
$("#backToLogin").onclick = () => show("login");

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "Signing in…";
  const { error } = await supabase.auth.signInWithPassword({
    email: $("#loginEmail").value.trim(),
    password: $("#loginPassword").value
  });
  if (error) {
    message.textContent = error.message;
    return;
  }
  location.href = returnTo;
});

signupForm.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "Creating account…";
  const displayName = $("#signupName").value.trim();
  const { data, error } = await supabase.auth.signUp({
    email: $("#signupEmail").value.trim(),
    password: $("#signupPassword").value,
    options: { data: { display_name: displayName } }
  });
  if (error) {
    message.textContent = error.message;
    return;
  }

  if (data.user) {
    await supabase.from("user_profiles").upsert({
      user_id: data.user.id,
      display_name: displayName
    });
  }

  message.textContent = data.session
    ? "Account created. Redirecting…"
    : "Account created. Check your email to confirm your account.";

  if (data.session) location.href = returnTo;
});

resetForm.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "Sending reset email…";
  const redirectTo = new URL("./profile.html", location.href).href;
  const { error } = await supabase.auth.resetPasswordForEmail(
    $("#resetEmail").value.trim(),
    { redirectTo }
  );
  message.textContent = error ? error.message : "Password reset email sent.";
});

(async () => {
  if (!isConfigured) {
    message.textContent = "Supabase is not configured.";
    document.querySelectorAll("input,button").forEach(el => el.disabled = true);
    return;
  }
  if (await getSessionUser()) location.href = returnTo;
})();
