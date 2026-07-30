import { supabase, isConfigured } from "./supabase.js";

const $ = selector => document.querySelector(selector);
const postForm = $("#postForm");
const posterFile = $("#posterFile");
const posterUrl = $("#posterUrl");
const posterPreview = $("#posterPreview");
let posts = [];

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function toggleSeriesFields() {
  const seriesFields = $("#seriesFields");
  const contentType = $("#contentType");
  if (seriesFields && contentType) {
    seriesFields.hidden = contentType.value !== "series";
  }
}

async function getAdmin() {
  if (!isConfigured) return null;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase.rpc("is_admin");
  if (error || data !== true) return null;
  return user;
}

function showSection(sectionName, { remember = true } = {}) {
  document.querySelectorAll(".admin-exact-nav [data-admin-section]").forEach(button => {
    button.classList.toggle("active", button.dataset.adminSection === sectionName);
  });

  document.querySelectorAll(".admin-section-panel[data-admin-panel]").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.adminPanel === sectionName);
  });

  if (remember) sessionStorage.setItem("streamcafe-admin-section", sectionName);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindNavigation() {
  document.querySelectorAll(".admin-exact-nav [data-admin-section]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      showSection(button.dataset.adminSection);
    });
  });

  const logoutButton = $("#logoutButton");
  logoutButton?.addEventListener("click", async event => {
    event.preventDefault();
    logoutButton.disabled = true;
    logoutButton.textContent = "Signing out…";

    const { error } = await supabase.auth.signOut();
    if (error) {
      logoutButton.disabled = false;
      logoutButton.textContent = "Sign Out";
      alert(error.message);
      return;
    }

    sessionStorage.removeItem("streamcafe-admin-section");
    location.href = "./auth.html?returnTo=./admin.html";
  });
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function postMatchesExistingSearch(post, query) {
  if (!query) return true;

  const searchable = [
    post.title,
    post.series_title,
    post.category,
    post.release_year,
    post.content_type === "series" ? "series episode tv series" : "movie",
    post.published ? "published" : "draft",
    post.season_number ? `season ${post.season_number}` : "",
    post.episode_number ? `episode ${post.episode_number}` : ""
  ]
    .map(normalizeSearchValue)
    .join(" ");

  return searchable.includes(query);
}

function renderPosts() {
  const list = $("#postsList");
  const searchInput = $("#existingContentSearch");
  const clearButton = $("#clearExistingContentSearch");
  if (!list) return;

  const query = normalizeSearchValue(searchInput?.value);
  const visiblePosts = posts.filter(post => postMatchesExistingSearch(post, query));

  if (clearButton) clearButton.hidden = !query;

  if (!posts.length) {
    setText("#postsMessage", "No content yet.");
  } else if (!visiblePosts.length) {
    setText("#postsMessage", `No content matches "${searchInput.value.trim()}".`);
  } else {
    setText(
      "#postsMessage",
      query
        ? `${visiblePosts.length} of ${posts.length} item${posts.length === 1 ? "" : "s"}`
        : `${posts.length} item${posts.length === 1 ? "" : "s"}`
    );
  }

  list.innerHTML = visiblePosts.map(post => `
    <article class="admin-post">
      <img src="${esc(post.poster_url)}" alt="" loading="lazy">
      <div>
        <div class="admin-post-heading">
          <h3>${esc(post.title)}</h3>
          <span class="${post.published ? "published" : "draft"}">${post.published ? "Published" : "Draft"}</span>
        </div>
        <p>${
          post.content_type === "series"
            ? `Series · ${esc(post.series_title || "")}${
                post.season_number || post.episode_number
                  ? ` · S${esc(post.season_number || 1)} E${esc(post.episode_number || 1)}`
                  : ""
              }`
            : `Movie${post.release_year ? ` · ${esc(post.release_year)}` : ""}`
        }</p>
        <div class="admin-post-actions">
          <button class="text-button" type="button" data-edit="${post.id}">Edit</button>
          <button class="text-button danger" type="button" data-delete="${post.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-edit]").forEach(button => {
    button.addEventListener("click", () => editPost(button.dataset.edit));
  });

  list.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => deletePost(button.dataset.delete));
  });
}

async function loadPosts() {
  setText("#postsMessage", "Loading content…");

  const { data, error } = await supabase
    .from("video_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    setText("#postsMessage", error.message);
    return;
  }

  posts = data || [];
  renderPosts();
}

function editPost(id) {
  const post = posts.find(item => item.id === id);
  if (!post) return;

  $("#postId").value = post.id;
  $("#contentType").value = post.content_type || "movie";
  $("#category").value = post.category || "";
  $("#title").value = post.title || "";
  $("#description").value = post.description || "";
  $("#releaseYear").value = post.release_year || "";
  $("#featured").checked = Boolean(post.featured);
  $("#seriesTitle").value = post.series_title || "";
  $("#seasonNumber").value = post.season_number || "";
  $("#episodeNumber").value = post.episode_number || "";
  posterUrl.value = post.poster_url || "";
  posterPreview.src = post.poster_url || "";
  posterPreview.hidden = !post.poster_url;
  $("#videoUrl").value = post.video_url || "";
  $("#published").checked = Boolean(post.published);
  $("#cancelEditButton").hidden = false;
  setText("#formTitle", "Edit content");
  toggleSeriesFields();
  showSection("create");
}

function resetForm() {
  postForm?.reset();
  $("#postId").value = "";
  posterUrl.value = "";
  posterPreview.removeAttribute("src");
  posterPreview.hidden = true;
  $("#cancelEditButton").hidden = true;
  $("#seriesFields").hidden = true;
  $("#published").checked = true;
  setText("#formTitle", "Create content");
  setText("#formMessage", "");
  setText("#uploadMessage", "");
}

async function deletePost(id) {
  const post = posts.find(item => item.id === id);
  if (!post || !confirm(`Delete "${post.title}"?`)) return;

  const { error } = await supabase.from("video_posts").delete().eq("id", id);
  if (error) {
    setText("#postsMessage", error.message);
    return;
  }
  await loadPosts();
}

async function uploadPoster() {
  const file = posterFile?.files?.[0];
  if (!file) {
    setText("#uploadMessage", "Choose an image first.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setText("#uploadMessage", "Maximum size is 5 MB.");
    return;
  }

  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) {
    setText("#uploadMessage", "Use JPG, PNG, or WebP.");
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    setText("#uploadMessage", "Please sign in again.");
    return;
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  setText("#uploadMessage", "Uploading…");

  const { error } = await supabase.storage.from("posters").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600"
  });

  if (error) {
    setText("#uploadMessage", error.message);
    return;
  }

  const { data } = supabase.storage.from("posters").getPublicUrl(path);
  posterUrl.value = data.publicUrl;
  posterPreview.src = data.publicUrl;
  posterPreview.hidden = false;
  setText("#uploadMessage", "Poster uploaded.");
}

async function savePost(event) {
  event.preventDefault();
  setText("#formMessage", "");

  if (!posterUrl.value) {
    setText("#formMessage", "Upload a poster first.");
    return;
  }

  const contentType = $("#contentType").value;
  if (contentType === "series" && !$("#seriesTitle").value.trim()) {
    setText("#formMessage", "Enter a series title.");
    return;
  }

  const payload = {
    content_type: contentType,
    category: $("#category").value.trim() || "Video",
    title: $("#title").value.trim(),
    description: $("#description").value.trim(),
    release_year: Number($("#releaseYear").value) || null,
    featured: $("#featured").checked,
    series_title: contentType === "series" ? $("#seriesTitle").value.trim() : null,
    season_number: contentType === "series" ? Number($("#seasonNumber").value) || 1 : null,
    episode_number: contentType === "series" ? Number($("#episodeNumber").value) || 1 : null,
    poster_url: posterUrl.value,
    video_url: $("#videoUrl").value.trim(),
    published: $("#published").checked
  };

  const id = $("#postId").value;
  const result = id
    ? await supabase.from("video_posts").update(payload).eq("id", id)
    : await supabase.from("video_posts").insert(payload);

  if (result.error) {
    setText("#formMessage", result.error.message);
    return;
  }

  setText("#formMessage", "Saved successfully.");
  resetForm();
  await loadPosts();
}

async function loadAnalytics() {
  const message = $("#analyticsMessage");
  if (!message) return;
  message.textContent = "Loading analytics…";

  const [summaryResult, videosResult, searchesResult] = await Promise.all([
    supabase.rpc("admin_analytics_summary"),
    supabase.rpc("admin_top_videos", { row_limit: 8 }),
    supabase.rpc("admin_top_searches", { row_limit: 8 })
  ]);

  const error = summaryResult.error || videosResult.error || searchesResult.error;
  if (error) {
    message.textContent = error.message;
    return;
  }

  const summary = summaryResult.data || {};
  setText("#metricUsers", Number(summary.total_users || 0).toLocaleString());
  setText("#metricViews", Number(summary.total_views || 0).toLocaleString());
  setText("#metricPlays", Number(summary.total_plays || 0).toLocaleString());
  setText("#metricCompletes", Number(summary.total_completes || 0).toLocaleString());
  setText("#metricFavorites", Number(summary.total_favorites || 0).toLocaleString());
  setText("#metricSearches", Number(summary.total_searches || 0).toLocaleString());

  $("#topVideos").innerHTML = (videosResult.data || []).map((row, index) => `
    <div class="analytics-row"><span>${index + 1}. ${esc(row.title || "Untitled")}</span>
    <strong>${Number(row.play_count || 0).toLocaleString()} plays</strong></div>
  `).join("") || '<p class="message">No play data yet.</p>';

  $("#topSearches").innerHTML = (searchesResult.data || []).map((row, index) => `
    <div class="analytics-row"><span>${index + 1}. ${esc(row.query)}</span>
    <strong>${Number(row.search_count || 0).toLocaleString()}</strong></div>
  `).join("") || '<p class="message">No search data yet.</p>';

  message.textContent = "";
}

function bindControls() {
  $("#contentType")?.addEventListener("change", toggleSeriesFields);
  posterFile?.addEventListener("change", () => {
    const file = posterFile.files?.[0];
    if (!file) {
      posterPreview.hidden = true;
      return;
    }
    posterPreview.src = URL.createObjectURL(file);
    posterPreview.hidden = false;
  });
  $("#uploadPosterButton")?.addEventListener("click", uploadPoster);
  postForm?.addEventListener("submit", savePost);
  $("#cancelEditButton")?.addEventListener("click", resetForm);
  $("#refreshButton")?.addEventListener("click", loadPosts);
  $("#refreshAnalyticsButton")?.addEventListener("click", loadAnalytics);

  const existingSearch = $("#existingContentSearch");
  const clearExistingSearch = $("#clearExistingContentSearch");

  existingSearch?.addEventListener("input", renderPosts);
  existingSearch?.addEventListener("search", renderPosts);

  clearExistingSearch?.addEventListener("click", () => {
    existingSearch.value = "";
    existingSearch.focus();
    renderPosts();
  });
}

async function init() {
  if (!isConfigured) {
    alert("Supabase is not configured.");
    return;
  }

  const admin = await getAdmin();
  if (!admin) {
    location.href = `./auth.html?returnTo=${encodeURIComponent("./admin.html")}`;
    return;
  }

  setText("#signedInAs", `Signed in as ${admin.email || "admin"}`);
  bindNavigation();
  bindControls();

  const saved = sessionStorage.getItem("streamcafe-admin-section") || "create";
  showSection(["dashboard", "create", "existing"].includes(saved) ? saved : "create", { remember: false });

  await Promise.all([loadPosts(), loadAnalytics()]);
}

init().catch(error => {
  console.error(error);
  alert(`Unable to load admin: ${error.message}`);
});
