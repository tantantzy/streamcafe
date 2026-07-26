import { supabase, isConfigured } from "./supabase.js";
import { card } from "./cards.js";

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
  if (!isConfigured) return message.textContent = "Supabase is not configured.";

  const { data, error } = await supabase
    .from("video_posts")
    .select("*")
    .eq("published", true)
    .eq("content_type", "series")
    .order("created_at", { ascending: false });

  if (error) return message.textContent = error.message;

  const map = new Map();
  (data || []).forEach(post => {
    if (!map.has(post.series_title)) map.set(post.series_title, post);
  });

  series = [...map.values()];

  [...new Set(series.map(p => p.category).filter(Boolean))].sort().forEach(category => {
    filter.insertAdjacentHTML("beforeend", `<option value="${category}">${category}</option>`);
  });

  render();
}

filter.addEventListener("change", render);
load();
