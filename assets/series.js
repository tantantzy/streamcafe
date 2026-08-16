import { isConfigured, listPublishedPosts } from "./firebase.js?v=10.0";
import { card } from "./cards.js?v=8.0";

const grid = document.querySelector("#seriesCatalog");
const message = document.querySelector("#seriesMessage");
const filter = document.querySelector("#seriesCategoryFilter");
let series = [];

function render() {
  const value = filter.value;
  const items = value ? series.filter(p => p.category === value) : series;
  message.textContent = items.length ? "" : "No series found.";
  grid.innerHTML = items.map(card).join("");
}

async function load() {
  if (!isConfigured) return message.textContent = "Firebase is not configured.";
  try {
    const data = (await listPublishedPosts()).filter(post => post.content_type === "series");
    const map = new Map();
    data.forEach(post => {
      const key = (post.series_title || post.title || post.id).toLowerCase();
      const existing = map.get(key);
      const rank = Number(post.season_number || 1) * 100000 + Number(post.episode_number || 1);
      const currentRank = existing ? Number(existing.season_number || 1) * 100000 + Number(existing.episode_number || 1) : Infinity;
      if (!existing || rank < currentRank) map.set(key, post);
    });
    series = [...map.values()];
    [...new Set(series.map(p => p.category).filter(Boolean))].sort().forEach(category => {
      filter.insertAdjacentHTML("beforeend", `<option value="${category}">${category}</option>`);
    });
    render();
  } catch (error) {
    message.textContent = error.message;
  }
}
filter.addEventListener("change", render);
load();
