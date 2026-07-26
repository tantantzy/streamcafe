import { supabase } from "./supabase.js?v=8.0";
import { card } from "./cards.js?v=8.0";
import { requireUser } from "./session.js?v=8.0";
const user = await requireUser();
const grid = document.querySelector("#myListGrid");
const message = document.querySelector("#myListMessage");
if (user) {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("created_at, video_posts(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) message.textContent = error.message;
  else {
    const posts = (data || []).map(row => row.video_posts).filter(Boolean);
    message.textContent = posts.length ? `${posts.length} saved title${posts.length === 1 ? "" : "s"}` : "Your list is empty.";
    grid.innerHTML = posts.map(card).join("");
  }
}