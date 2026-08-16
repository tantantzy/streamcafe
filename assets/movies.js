import { isConfigured, listPublishedPosts } from "./firebase.js?v=10.2";
import { card } from "./cards.js?v=8.0";

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
  if (!isConfigured) return message.textContent = "Firebase is not configured.";
  try {
    movies = (await listPublishedPosts()).filter(post => post.content_type === "movie");
    [...new Set(movies.map(p => p.category).filter(Boolean))].sort().forEach(category => {
      filter.insertAdjacentHTML("beforeend", `<option value="${category}">${category}</option>`);
    });
    render();
  } catch (error) {
    message.textContent = error.message;
  }
}
filter.addEventListener("change", render);
load();
