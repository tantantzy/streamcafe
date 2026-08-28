import { auth, isConfigured, saveProfile, waitForAuth } from "./firebase.js?v=10.2";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { safeReturnUrl } from "./session.js?v=10.1";

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
  try {
    await signInWithEmailAndPassword(
      auth,
      $("#loginEmail").value.trim(),
      $("#loginPassword").value
    );
    location.href = returnTo;
  } catch (error) {
    message.textContent = error.message;
  }
});

signupForm.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "Creating account…";
  try {
    const displayName = $("#signupName").value.trim();
    const credential = await createUserWithEmailAndPassword(
      auth,
      $("#signupEmail").value.trim(),
      $("#signupPassword").value
    );
    await saveProfile(credential.user.uid, {
      display_name: displayName,
      avatar_url: null
    }, { creating: true });
    await sendEmailVerification(credential.user);
    message.textContent = "Account created. Verification email sent. Redirecting…";
    setTimeout(() => location.href = returnTo, 900);
  } catch (error) {
    message.textContent = error.message;
  }
});

resetForm.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "Sending reset email…";
  try {
    await sendPasswordResetEmail(auth, $("#resetEmail").value.trim());
    message.textContent = "Password reset email sent.";
  } catch (error) {
    message.textContent = error.message;
  }
});

(async () => {
  if (!isConfigured) {
    message.textContent = "Firebase is not configured.";
    document.querySelectorAll("input,button").forEach(el => el.disabled = true);
    return;
  }
  if (await waitForAuth()) location.href = returnTo;
})();
