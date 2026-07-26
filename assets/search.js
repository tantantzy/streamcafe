import { supabase, isConfigured } from "./supabase.js?v=8.0";
import { getSessionUser } from "./session.js?v=8.0";
import { card } from "./cards.js?v=6.3";

const searchInput =
  document.querySelector("#searchInput") ||
  document.querySelector('input[type="search"]') ||
  document.querySelector('input[type="text"]');

const clearButton =
  document.querySelector("#clearSearch") ||
  document.querySelector("[data-clear-search]");

const resultsGrid =
  document.querySelector("#searchResults") ||
  document.querySelector("#resultsGrid") ||
  document.querySelector(".search-results-section .video-grid") ||
  document.querySelector(".video-grid");

const resultsMessage =
  document.querySelector("#searchMessage") ||
  document.querySelector("#resultsMessage") ||
  document.querySelector(".search-message") ||
  document.querySelector(".message");

let publishedPosts = [];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function seriesKey(post) {
  return normalize(post.series_title || post.title || post.id);
}

function episodeRank(post) {
  const season = Number(post.season_number || 1);
  const episode = Number(post.episode_number || 1);
  return season * 100000 + episode;
}

function pickOnePerSeries(posts) {
  const movies = [];
  const seriesMap = new Map();

  for (const post of posts) {
    if (post.content_type !== "series") {
      movies.push(post);
      continue;
    }

    const key = seriesKey(post);
    const existing = seriesMap.get(key);

    if (!existing) {
      seriesMap.set(key, post);
      continue;
    }

    const postIsEpisodeOne =
      Number(post.season_number || 1) === 1 &&
      Number(post.episode_number || 1) === 1;

    const existingIsEpisodeOne =
      Number(existing.season_number || 1) === 1 &&
      Number(existing.episode_number || 1) === 1;

    if (
      (postIsEpisodeOne && !existingIsEpisodeOne) ||
      (!postIsEpisodeOne &&
        !existingIsEpisodeOne &&
        episodeRank(post) < episodeRank(existing))
    ) {
      seriesMap.set(key, post);
    }
  }

  return [...seriesMap.values(), ...movies];
}

function matchesQuery(post, query) {
  const haystack = [
    post.title,
    post.series_title,
    post.category,
    post.description,
    post.release_year,
    post.content_type
  ]
    .map(normalize)
    .join(" ");

  return haystack.includes(query);
}

function renderSearch() {
  if (!searchInput || !resultsGrid || !resultsMessage) {
    console.error("Search page elements are missing.", {
      searchInput,
      resultsGrid,
      resultsMessage
    });
    return;
  }

  const query = normalize(searchInput.value);

  if (clearButton) {
    clearButton.hidden = !query;
  }

  if (!query) {
    resultsGrid.innerHTML = "";
    resultsMessage.textContent = "Type something to search.";
    return;
  }

  const matches = publishedPosts.filter(post => matchesQuery(post, query));
  const visibleResults = pickOnePerSeries(matches);

  if (!visibleResults.length) {
    resultsGrid.innerHTML = "";
    resultsMessage.textContent = "No results found.";
    return;
  }

  resultsMessage.textContent =
    `${visibleResults.length} result${visibleResults.length === 1 ? "" : "s"}`;

  resultsGrid.innerHTML = visibleResults.map(card).join("");
}

async function loadSearchData() {
  if (!isConfigured) {
    if (resultsMessage) {
      resultsMessage.textContent = "Supabase is not configured.";
    }
    return;
  }

  const { data, error } = await supabase
    .from("video_posts")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Search data failed to load:", error);
    if (resultsMessage) {
      resultsMessage.textContent = error.message;
    }
    return;
  }

  publishedPosts = data || [];
  renderSearch();
}

if (searchInput) {
  searchInput.addEventListener("input", renderSearch);
  searchInput.addEventListener("search", renderSearch);
}

if (clearButton) {
  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.focus();
    renderSearch();
  });
}

loadSearchData().catch(error => {
  console.error("Search page failed:", error);
  if (resultsMessage) {
    resultsMessage.textContent =
      `Unable to load search: ${error?.message || "Unknown error"}`;
  }
});


let searchAnalyticsTimer;
searchInput?.addEventListener("input", () => {
  clearTimeout(searchAnalyticsTimer);
  const query = String(searchInput.value || "").trim();
  if (query.length < 2) return;
  searchAnalyticsTimer = setTimeout(async () => {
    const user = await getSessionUser();
    await supabase.from("search_analytics").insert({
      user_id: user?.id || null,
      query,
      result_count: pickOnePerSeries(publishedPosts.filter(post => matchesQuery(post, query.toLowerCase()))).length
    });
  }, 900);
});
