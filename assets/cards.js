export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
}

export function card(post) {
  const meta = post.content_type === "series"
    ? `${escapeHtml(post.series_title || "Series")} · S${post.season_number || 1}E${post.episode_number || 1}`
    : `${post.release_year || ""}`;

  return `
    <a class="video-card" href="./watch.html?id=${encodeURIComponent(post.id)}">
      <div class="poster">
        <img src="${escapeHtml(post.poster_url)}" alt="${escapeHtml(post.title)} poster" loading="lazy" decoding="async"
          onerror="this.style.display='none';this.closest('.poster').classList.add('image-error')">
        <div class="poster-fallback"><span>▶</span><small>Poster unavailable</small></div>
        <span class="play-icon">▶</span>
      </div>
      <div class="video-card-content">
        <p class="eyebrow">${escapeHtml(post.category || "VIDEO")}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <span>${meta}</span>
      </div>
    </a>
  `;
}
