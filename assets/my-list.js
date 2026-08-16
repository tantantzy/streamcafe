import { listFavorites } from "./firebase.js?v=10.2";
import { card } from "./cards.js?v=8.0";
import { requireUser } from "./session.js?v=10.2";

const user = await requireUser();
const grid = document.querySelector("#myListGrid");
const message = document.querySelector("#myListMessage");

if (user) {
  try {
    const posts = await listFavorites(user.uid);
    message.textContent = posts.length ? `${posts.length} saved title${posts.length === 1 ? "" : "s"}` : "Your list is empty.";
    grid.innerHTML = posts.map(card).join("");
  } catch (error) {
    message.textContent = error.message;
  }
}
