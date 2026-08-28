import { listHistory } from "./firebase.js?v=10.2";
import { escapeHtml } from "./cards.js?v=8.0";
import { requireUser } from "./session.js?v=10.1";

const user = await requireUser();
const grid = document.querySelector("#historyGrid");
const message = document.querySelector("#historyMessage");

function historyCard(row) {
  const post = row.video_posts;
  const rawDuration = Number(row.duration_seconds || 0);
  const rawProgress = Number(row.progress_seconds || 0);
  const progress = rawDuration > 0 ? Math.min(100, Math.round((rawProgress / rawDuration) * 100)) : 0;
  const statusLabel = rawDuration > 0 ? (progress >= 95 ? "COMPLETED" : `${progress}% WATCHED`) : "RECENTLY VIEWED";
  return `<a class="video-card history-card" href="./watch.html?id=${encodeURIComponent(post.id)}">
    <div class="poster"><img src="${escapeHtml(post.poster_url || "")}" alt="${escapeHtml(post.title)} poster" loading="lazy">
    <span class="play-icon">▶</span><div class="progress-track"><span style="width:${progress}%"></span></div></div>
    <div class="video-card-content"><p class="eyebrow">${statusLabel}</p>
    <h3>${escapeHtml(post.series_title || post.title)}</h3><span>${escapeHtml(post.title)}</span></div></a>`;
}

if (user) {
  try {
    const rows = await listHistory(user.uid, 40);
    message.textContent = rows.length ? `${rows.length} recently watched` : "No watch history yet.";
    grid.innerHTML = rows.map(historyCard).join("");
  } catch (error) {
    message.textContent = error.message;
  }
}
