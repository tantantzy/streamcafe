import { auth, saveProfile } from "./firebase.js?v=10.2";
import { signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { requireUser, getProfile } from "./session.js?v=10.1";

const $ = s => document.querySelector(s);
const user = await requireUser();

if (user) {
  $("#accountEmail").textContent = user.email || "";
  const profile = await getProfile(user.uid);
  $("#displayName").value = profile?.display_name || "";
  $("#avatarUrl").value = profile?.avatar_url || "";

  $("#profileForm").addEventListener("submit", async event => {
    event.preventDefault();
    $("#profileMessage").textContent = "Saving…";
    try {
      await saveProfile(user.uid, {
        display_name: $("#displayName").value.trim(),
        avatar_url: $("#avatarUrl").value.trim() || null
      });
      $("#profileMessage").textContent = "Profile saved.";
    } catch (error) {
      $("#profileMessage").textContent = error.message;
    }
  });

  $("#signOutButton").onclick = async () => {
    await signOut(auth);
    location.href = "./index.html";
  };
}
