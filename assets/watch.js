import { supabase, isConfigured } from "./supabase.js?v=8.0";
import { normalizeVideoUrl } from "./video-links.js?v=8.0";
import { escapeHtml } from "./cards.js?v=8.0";
import { getSessionUser } from "./session.js?v=8.0";

const id = new URLSearchParams(location.search).get("id");
const message = document.querySelector("#watchMessage");
const content = document.querySelector("#watchContent");
const videoPlayer = document.querySelector("#videoPlayer");
const drivePlayer = document.querySelector("#drivePlayer");
const loading = document.querySelector("#playerLoading");
const errorState = document.querySelector("#playerError");
const externalButton = document.querySelector("#openExternalButton");
const toast = document.querySelector("#toast");
let currentPost = null;
let currentUser = null;
let progressTimer = null;

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(window.streamCafeToastTimer);
  window.streamCafeToastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

async function trackEvent(eventType, metadata = {}) {
  if (!currentPost) return;
  const payload = {
    video_post_id: currentPost.id,
    user_id: currentUser?.id || null,
    event_type: eventType,
    metadata
  };
  const { error } = await supabase.from("video_analytics").insert(payload);
  if (error) console.warn("Analytics event failed:", error.message);
}


async function recordHistoryVisit() {
  if (!currentUser || !currentPost) return;

  const { data: existing, error: readError } = await supabase
    .from("watch_history")
    .select("progress_seconds,duration_seconds,completed")
    .eq("user_id", currentUser.id)
    .eq("video_post_id", currentPost.id)
    .maybeSingle();

  if (readError) {
    console.warn("Unable to read watch history:", readError.message);
    return;
  }

  const { error } = await supabase
    .from("watch_history")
    .upsert({
      user_id: currentUser.id,
      video_post_id: currentPost.id,
      progress_seconds: Number(existing?.progress_seconds || 0),
      duration_seconds: Number(existing?.duration_seconds || 0),
      completed: Boolean(existing?.completed),
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id,video_post_id"
    });

  if (error) {
    console.warn("Unable to save watch history:", error.message);
  }
}

async function saveProgress(force = false) {
  if (!currentUser || !currentPost || videoPlayer.hidden) return;
  const progress = Math.floor(videoPlayer.currentTime || 0);
  const duration = Math.floor(videoPlayer.duration || 0);
  if (!force && progress < 3) return;
  await supabase.from("watch_history").upsert({
    user_id: currentUser.id,
    video_post_id: currentPost.id,
    progress_seconds: progress,
    duration_seconds: duration,
    completed: duration > 0 && progress / duration >= .95,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id,video_post_id" });
}

async function setupPlayer(post) {
  const source = normalizeVideoUrl(post.video_url);
  videoPlayer.pause(); videoPlayer.removeAttribute("src"); videoPlayer.hidden = true;
  drivePlayer.src = "about:blank"; drivePlayer.hidden = true;
  loading.hidden = false; errorState.hidden = true;
  externalButton.href = source.externalUrl;
  document.querySelector("#downloadButton").href = source.externalUrl;

  if (source.type === "google-drive") {
    drivePlayer.src = source.embedUrl; drivePlayer.hidden = false;
    drivePlayer.addEventListener("load", async () => {
      loading.hidden = true;
      await recordHistoryVisit();
      trackEvent("play");
    }, { once:true });
    setTimeout(() => { if (!loading.hidden) { loading.hidden = true; errorState.hidden = false; } }, 15000);
    return;
  }

  videoPlayer.src = source.embedUrl; videoPlayer.poster = post.poster_url; videoPlayer.hidden = false;
  videoPlayer.addEventListener("loadedmetadata", async () => {
    if (currentUser) {
      const { data } = await supabase.from("watch_history").select("progress_seconds")
        .eq("user_id", currentUser.id).eq("video_post_id", post.id).maybeSingle();
      if (data?.progress_seconds > 5 && data.progress_seconds < videoPlayer.duration - 10) {
        videoPlayer.currentTime = data.progress_seconds;
        showToast(`Resumed at ${Math.floor(data.progress_seconds / 60)} min`);
      }
    }
  }, { once:true });
  videoPlayer.addEventListener("play", async () => {
    loading.hidden = true;
    await recordHistoryVisit();
    trackEvent("play");
    clearInterval(progressTimer);
    progressTimer = setInterval(saveProgress, 15000);
  });
  videoPlayer.addEventListener("pause", () => { clearInterval(progressTimer); saveProgress(true); });
  videoPlayer.addEventListener("ended", () => { clearInterval(progressTimer); saveProgress(true); trackEvent("complete"); });
  videoPlayer.addEventListener("canplay", () => loading.hidden = true, { once:true });
  videoPlayer.addEventListener("error", () => { loading.hidden = true; errorState.hidden = false; }, { once:true });
  videoPlayer.load();
}

function renderEpisodes(episodes, current) {
  const section = document.querySelector("#episodesSection");
  const grid = document.querySelector("#episodesGrid");
  if (episodes.length <= 1) { section.hidden = true; return; }
  section.hidden = false;
  document.querySelector("#episodeTotal").textContent = `Total ${episodes.length}`;
  grid.innerHTML = episodes.slice().sort((a,b) =>
    Number(b.season_number||1)-Number(a.season_number||1) ||
    Number(b.episode_number||1)-Number(a.episode_number||1)
  ).map(episode => `<a class="reference-episode-button ${episode.id===current.id?"active":""}"
    href="./watch.html?id=${encodeURIComponent(episode.id)}" title="${escapeHtml(episode.title)}">
    ${episode.episode_number || ""}</a>`).join("");
}

async function refreshFavoriteState() {
  const button = document.querySelector("#favoriteButton");
  if (!currentUser || !currentPost) { button.classList.remove("active"); return; }
  const { data } = await supabase.from("user_favorites").select("video_post_id")
    .eq("user_id", currentUser.id).eq("video_post_id", currentPost.id).maybeSingle();
  button.classList.toggle("active", Boolean(data));
}

function bindActions() {
  document.querySelector("#favoriteButton").addEventListener("click", async () => {
    if (!currentPost) return;
    if (!currentUser) {
      location.href = `./auth.html?returnTo=${encodeURIComponent(location.href)}`;
      return;
    }
    const button = document.querySelector("#favoriteButton");
    const active = button.classList.contains("active");
    const result = active
      ? await supabase.from("user_favorites").delete().eq("user_id", currentUser.id).eq("video_post_id", currentPost.id)
      : await supabase.from("user_favorites").insert({ user_id:currentUser.id, video_post_id:currentPost.id });
    if (result.error) showToast(result.error.message);
    else { button.classList.toggle("active", !active); showToast(active ? "Removed from My List" : "Added to My List"); }
  });
  document.querySelector("#shareButton").addEventListener("click", async () => {
    try {
      if (navigator.share) await navigator.share({ title:currentPost?.title || document.title, url:location.href });
      else { await navigator.clipboard.writeText(location.href); showToast("Link copied"); }
      trackEvent("share");
    } catch {}
  });
  document.querySelector("#reportButton").addEventListener("click", async () => {
    await trackEvent("report");
    showToast("Report received. Thank you.");
  });
  document.querySelector("#downloadButton").addEventListener("click", () => trackEvent("open_source"));
}

async function load() {
  if (!isConfigured) { message.textContent = "Supabase is not configured."; return; }
  if (!id) { message.textContent = "No video selected."; return; }
  currentUser = await getSessionUser();
  const { data:current, error } = await supabase.from("video_posts").select("*")
    .eq("id", id).eq("published", true).maybeSingle();
  if (error || !current) { message.textContent = error?.message || "Video not found."; return; }
  currentPost = current;
  await recordHistoryVisit();
  document.title = `${current.title} — StreamCafe`;
  document.querySelector("#watchTitle").textContent =
    current.content_type === "series" && current.release_year
      ? `${current.series_title || current.title} (${current.release_year})` : current.title;
  document.querySelector("#watchDate").textContent = current.release_year ? String(current.release_year) : "";
  const badge = document.querySelector("#watchEpisodeBadge");
  if (current.content_type === "series") { badge.hidden=false; badge.textContent=`S${current.season_number||1} · E${current.episode_number||1}`; }
  else badge.hidden=true;
  document.querySelector("#watchDescription").textContent = current.description || "No description available.";
  content.hidden=false; message.textContent="";
  await refreshFavoriteState();
  await setupPlayer(current);
  await trackEvent("view", { referrer: document.referrer || null });
  let episodes=[];
  if (current.content_type==="series" && current.series_title) {
    const { data } = await supabase.from("video_posts").select("*").eq("published",true)
      .eq("content_type","series").eq("series_title",current.series_title)
      .order("season_number").order("episode_number");
    episodes=data||[];
  }
  renderEpisodes(episodes,current);
}
bindActions();
load().catch(error => { console.error(error); message.textContent=`Unable to load this page: ${error.message}`; });
window.addEventListener("beforeunload", () => saveProgress(true));
