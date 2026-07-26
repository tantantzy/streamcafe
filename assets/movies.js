import { supabase, isConfigured } from "./supabase.js";
import { card } from "./cards.js";

const grid = document.querySelector("#moviesCatalog");
const message = document.querySelector("#moviesMessage");
const filter = document.querySelector("#movieCategoryFilter");
let movies = [];

function render() {
  const value = filter.value;
  const items = value ? movies.filter(p => p.category === value) : movies;
  message.textContent = items.length ? "" : "No movies found.";
  grid.innerHTML = items.map(card).join("");
}

async function load() {
  if (!isConfigured) return message.textContent = "Supabase is not configured.";

  const { data, error } = await supabase
    .from("video_posts")
    .select("*")
    .eq("published", true)
    .eq("content_type", "movie")
    .order("created_at", { ascending: false });

  if (error) return message.textContent = error.message;

  movies = data || [];

  [...new Set(movies.map(p => p.category).filter(Boolean))].sort().forEach(category => {
    filter.insertAdjacentHTML("beforeend", `<option value="${category}">${category}</option>`);
  });

  render();
}

filter.addEventListener("change", render);
load();
