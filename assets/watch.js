import {
  isConfigured,
  getPost,
  listPublishedPosts,
  getHistory,
  saveHistory,
  isFavorite,
  addFavorite,
  removeFavorite,
  trackEvent
} from "./firebase.js?v=10.3";
import { normalizeVideoUrl } from "./video-links.js?v=8.0";
import { escapeHtml } from "./cards.js?v=8.0";
import { getSessionUser } from "./session.js?v=10.3";

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

async function recordHistoryVisit() {
  if (!currentUser || !currentPost) return;
  await saveHistory(currentUser.uid, currentPost.id);
}

async function saveProgress(force = false) {
  if (!currentUser || !currentPost || videoPlayer.hidden) return;
  const progress = Math.floor(videoPlayer.currentTime || 0);
  const duration = Math.floor(videoPlayer.duration || 0);
  if (!force && progress < 3) return;
  await saveHistory(currentUser.uid, currentPost.id, {
    progress_seconds: progress,
    duration_seconds: duration,
    completed: duration > 0 && progress / duration >= .95
  });
}

async function setupPlayer(post) {
  const source = normalizeVideoUrl(post.video_url);
  videoPlayer.pause();
  videoPlayer.removeAttribute("src");
  videoPlayer.hidden = true;
  drivePlayer.src = "about:blank";
  drivePlayer.hidden = true;
  loading.hidden = false;
  errorState.hidden = true;
  externalButton.href = source.externalUrl;
  document.querySelector("#downloadButton").href = source.externalUrl;

  if (source.type === "google-drive") {
    drivePlayer.src = source.embedUrl;
    drivePlayer.hidden = false;
    drivePlayer.addEventListener("load", async () => {
      loading.hidden = true;
      await recordHistoryVisit();
      await trackEvent("play", { postId: post.id, userId: currentUser?.uid || null });
    }, { once: true });
    setTimeout(() => {
      if (!loading.hidden) { loading.hidden = true; errorState.hidden = false; }
    }, 15000);
    return;
  }

  videoPlayer.src = source.embedUrl;
  videoPlayer.poster = post.poster_url || "";
  videoPlayer.hidden = false;

  videoPlayer.addEventListener("loadedmetadata", async () => {
    if (!currentUser) return;
    const history = await getHistory(currentUser.uid, post.id);
    if (history?.progress_seconds > 5 && history.progress_seconds < videoPlayer.duration - 10) {
      videoPlayer.currentTime = history.progress_seconds;
      showToast(`Resumed at ${Math.floor(history.progress_seconds / 60)} min`);
    }
  }, { once: true });

  videoPlayer.addEventListener("play", async () => {
    loading.hidden = true;
    await recordHistoryVisit();
    await trackEvent("play", { postId: post.id, userId: currentUser?.uid || null });
    clearInterval(progressTimer);
    progressTimer = setInterval(saveProgress, 15000);
  });

  videoPlayer.addEventListener("pause", () => {
    clearInterval(progressTimer);
    saveProgress(true);
  });
  videoPlayer.addEventListener("ended", () => {
    clearInterval(progressTimer);
    saveProgress(true);
    trackEvent("complete", { postId: post.id, userId: currentUser?.uid || null });
  });
  videoPlayer.addEventListener("canplay", () => loading.hidden = true, { once: true });
  videoPlayer.addEventListener("error", () => { loading.hidden = true; errorState.hidden = false; }, { once: true });
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
  button.classList.toggle("active", await isFavorite(currentUser.uid, currentPost.id));
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
    try {
      if (active) await removeFavorite(currentUser.uid, currentPost.id);
      else await addFavorite(currentUser.uid, currentPost.id);
      button.classList.toggle("active", !active);
      showToast(active ? "Removed from My List" : "Added to My List");
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelector("#shareButton").addEventListener("click", async () => {
    try {
      if (navigator.share) await navigator.share({ title: currentPost?.title || document.title, url: location.href });
      else { await navigator.clipboard.writeText(location.href); showToast("Link copied"); }
      await trackEvent("share", { postId: currentPost?.id, userId: currentUser?.uid || null });
    } catch {}
  });

  document.querySelector("#reportButton").addEventListener("click", async () => {
    await trackEvent("report", { postId: currentPost?.id, userId: currentUser?.uid || null });
    showToast("Report received. Thank you.");
  });

  document.querySelector("#downloadButton").addEventListener("click", () =>
    trackEvent("open_source", { postId: currentPost?.id, userId: currentUser?.uid || null })
  );
}

async function load() {
  if (!isConfigured) { message.textContent = "Firebase is not configured."; return; }
  if (!id) { message.textContent = "No video selected."; return; }

  currentUser = await getSessionUser();

  try {
    const current = await getPost(id);
    if (!current || !current.published) {
      message.textContent = "Video not found.";
      return;
    }
    currentPost = current;
    await recordHistoryVisit();
    document.title = `${current.title} — StreamCafe`;
    document.querySelector("#watchTitle").textContent =
      current.content_type === "series" && current.release_year
        ? `${current.series_title || current.title} (${current.release_year})`
        : current.title;
    document.querySelector("#watchDate").textContent = current.release_year ? String(current.release_year) : "";
    const badge = document.querySelector("#watchEpisodeBadge");
    if (current.content_type === "series") {
      badge.hidden = false;
      badge.textContent = `S${current.season_number || 1} · E${current.episode_number || 1}`;
    } else badge.hidden = true;

    document.querySelector("#watchDescription").textContent = current.description || "No description available.";
    content.hidden = false;
    message.textContent = "";
    await refreshFavoriteState();
    await setupPlayer(current);
    await trackEvent("view", {
      postId: current.id,
      userId: currentUser?.uid || null,
      metadata: { referrer: document.referrer || null }
    });

    let episodes = [];
    if (current.content_type === "series" && current.series_title) {
      episodes = (await listPublishedPosts()).filter(post =>
        post.content_type === "series" &&
        String(post.series_title || "").toLowerCase() === String(current.series_title).toLowerCase()
      );
    }
    renderEpisodes(episodes, current);
  } catch (error) {
    console.error(error);
    message.textContent = `Unable to load this page: ${error.message}`;
  }
}

bindActions();
load();
window.addEventListener("beforeunload", () => saveProgress(true));
