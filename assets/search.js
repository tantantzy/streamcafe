import { isConfigured, listPublishedPosts, trackEvent } from "./firebase.js?v=10.1";
import { getSessionUser } from "./session.js?v=10.1";
import { card } from "./cards.js?v=8.0";

const searchInput = document.querySelector("#searchInput") || document.querySelector('input[type="search"]') || document.querySelector('input[type="text"]');
const clearButton = document.querySelector("#clearSearch") || document.querySelector("[data-clear-search]");
const resultsGrid = document.querySelector("#searchResults") || document.querySelector("#resultsGrid") || document.querySelector(".search-results-section .video-grid") || document.querySelector(".video-grid");
const resultsMessage = document.querySelector("#searchMessage") || document.querySelector("#resultsMessage") || document.querySelector(".search-message") || document.querySelector(".message");
let publishedPosts = [];

const normalize = value => String(value || "").trim().toLowerCase();
const seriesKey = post => normalize(post.series_title || post.title || post.id);
const episodeRank = post => Number(post.season_number || 1) * 100000 + Number(post.episode_number || 1);

function pickOnePerSeries(posts) {
  const movies = [], seriesMap = new Map();
  for (const post of posts) {
    if (post.content_type !== "series") { movies.push(post); continue; }
    const key = seriesKey(post), existing = seriesMap.get(key);
    if (!existing) { seriesMap.set(key, post); continue; }
    const postFirst = Number(post.season_number||1) === 1 && Number(post.episode_number||1) === 1;
    const existingFirst = Number(existing.season_number||1) === 1 && Number(existing.episode_number||1) === 1;
    if ((postFirst && !existingFirst) || (!postFirst && !existingFirst && episodeRank(post) < episodeRank(existing))) seriesMap.set(key, post);
  }
  return [...seriesMap.values(), ...movies];
}

function matchesQuery(post, query) {
  return [post.title, post.series_title, post.category, post.description, post.release_year, post.content_type]
    .map(normalize).join(" ").includes(query);
}

function renderSearch() {
  const query = normalize(searchInput?.value);
  if (clearButton) clearButton.hidden = !query;
  if (!query) {
    resultsGrid.innerHTML = "";
    resultsMessage.textContent = "Type something to search.";
    return;
  }
  const visible = pickOnePerSeries(publishedPosts.filter(post => matchesQuery(post, query)));
  resultsMessage.textContent = visible.length ? `${visible.length} result${visible.length === 1 ? "" : "s"}` : "No results found.";
  resultsGrid.innerHTML = visible.map(card).join("");
}

async function loadSearchData() {
  if (!isConfigured) return resultsMessage.textContent = "Firebase is not configured.";
  try {
    publishedPosts = await listPublishedPosts();
    renderSearch();
  } catch (error) {
    resultsMessage.textContent = error.message;
  }
}

searchInput?.addEventListener("input", renderSearch);
searchInput?.addEventListener("search", renderSearch);
clearButton?.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  renderSearch();
});

let searchAnalyticsTimer;
searchInput?.addEventListener("input", () => {
  clearTimeout(searchAnalyticsTimer);
  const term = String(searchInput.value || "").trim();
  if (term.length < 2) return;
  searchAnalyticsTimer = setTimeout(async () => {
    const user = await getSessionUser();
    const count = pickOnePerSeries(publishedPosts.filter(post => matchesQuery(post, term.toLowerCase()))).length;
    try {
      await trackEvent("search", { userId: user?.uid || null, metadata: { query: term, result_count: count } });
    } catch {}
  }, 900);
});

loadSearchData();
