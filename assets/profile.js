import { supabase } from "./supabase.js?v=8.0";
import { requireUser, getProfile } from "./session.js?v=8.0";
const $ = s => document.querySelector(s);
const user = await requireUser();
if (user) {
  $("#accountEmail").textContent = user.email || "";
  const profile = await getProfile(user.id);
  $("#displayName").value = profile?.display_name || user.user_metadata?.display_name || "";
  $("#avatarUrl").value = profile?.avatar_url || "";

  $("#profileForm").addEventListener("submit", async event => {
    event.preventDefault();
    $("#profileMessage").textContent = "Saving…";
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: user.id,
      display_name: $("#displayName").value.trim(),
      avatar_url: $("#avatarUrl").value.trim() || null,
      updated_at: new Date().toISOString()
    });
    $("#profileMessage").textContent = error ? error.message : "Profile saved.";
  });

  $("#signOutButton").onclick = async () => {
    await supabase.auth.signOut();
    location.href = "./index.html";
  };
}