import { isConfigured, listPublishedPosts, listHistory } from "./firebase.js?v=10.1";
import { card, escapeHtml } from "./cards.js?v=8.0";
import { getSessionUser } from "./session.js?v=10.1";

const latestGrid = document.querySelector("#latestGrid");
const seriesGrid = document.querySelector("#seriesGrid");
const moviesGrid = document.querySelector("#moviesGrid");
const message = document.querySelector("#latestMessage");
const slides = document.querySelector("#featuredSlides");
const dots = document.querySelector("#featuredDots");
let featured = [], active = 0, timer;

function representativeSeries(posts) {
  const map = new Map();
  for (const post of posts.filter(item => item.content_type === "series")) {
    const key = (post.series_title || post.title || post.id).trim().toLowerCase();
    const existing = map.get(key);
    const isFirst = Number(post.season_number || 1) === 1 && Number(post.episode_number || 1) === 1;
    const existingFirst = existing && Number(existing.season_number || 1) === 1 && Number(existing.episode_number || 1) === 1;
    const rank = Number(post.season_number || 1) * 10000 + Number(post.episode_number || 1);
    const existingRank = existing ? Number(existing.season_number || 1) * 10000 + Number(existing.episode_number || 1) : Infinity;
    if (!existing || (isFirst && !existingFirst) || (!existingFirst && rank < existingRank)) map.set(key, post);
  }
  return [...map.values()];
}

function renderCarousel() {
  slides.innerHTML = featured.map((post, index) => `
    <article class="featured-slide ${index === active ? "active" : ""}"
      style="background-image:linear-gradient(90deg,rgba(8,10,17,.92),rgba(8,10,17,.2)),url('${escapeHtml(post.poster_url || "")}')">
      <div class="featured-copy"><p class="eyebrow">FEATURED ${index + 1} OF ${featured.length}</p>
      <h1>${escapeHtml(post.series_title || post.title)}</h1>
      <div class="hero-actions"><a class="button" href="./watch.html?id=${encodeURIComponent(post.id)}">Watch now</a>
      <a class="button secondary" href="#latest">Browse catalog</a></div></div></article>`).join("");
  dots.innerHTML = featured.map((_, index) =>
    `<button class="${index === active ? "active" : ""}" data-i="${index}" aria-label="Featured ${index + 1}"></button>`
  ).join("");
}
function show(index) { if (!featured.length) return; active = (index + featured.length) % featured.length; renderCarousel(); restart(); }
function restart() { clearInterval(timer); if (featured.length > 1) timer = setInterval(() => show(active + 1), 6500); }
document.querySelector("#featuredPrev").onclick = () => show(active - 1);
document.querySelector("#featuredNext").onclick = () => show(active + 1);
dots.onclick = event => { const button = event.target.closest("button"); if (button) show(Number(button.dataset.i)); };

async function loadContinueWatching() {
  const user = await getSessionUser();
  if (!user) return;
  const rows = await listHistory(user.uid, 8);
  const posts = rows.filter(row => Number(row.progress_seconds || 0) > 0).map(row => row.video_posts);
  if (posts.length) {
    document.querySelector("#continueSection").hidden = false;
    document.querySelector("#continueGrid").innerHTML = posts.map(card).join("");
  }
}

async function load() {
  if (!isConfigured) { message.textContent = "Firebase is not configured."; return; }
  try {
    const posts = await listPublishedPosts();
    const movies = posts.filter(post => post.content_type === "movie");
    const series = representativeSeries(posts);
    const home = [...movies, ...series].sort((a,b) => String(b.created_at||"").localeCompare(String(a.created_at||"")));
    featured = [...home.filter(post => post.featured), ...home.filter(post => !post.featured)].slice(0,3);
    if (featured.length) renderCarousel();
    else slides.innerHTML = '<div class="featured-copy"><h1>No content yet</h1></div>';
    restart();
    message.textContent = home.length ? "" : "No published content.";
    latestGrid.innerHTML = home.slice(0,8).map(card).join("");
    seriesGrid.innerHTML = series.slice(0,8).map(card).join("");
    moviesGrid.innerHTML = movies.slice(0,8).map(card).join("");
    await loadContinueWatching();
  } catch (error) {
    message.textContent = error.message;
  }
}
load();
