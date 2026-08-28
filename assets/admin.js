import {
  auth,
  isConfigured,
  waitForAuth,
  isAdmin,
  listAllPosts,
  savePost,
  removePost,
  adminAnalytics
} from "./firebase.js?v=10.2";
import { signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const $ = selector => document.querySelector(selector);
const postForm = $("#postForm");
const posterFile = $("#posterFile");
const posterUrl = $("#posterUrl");
const posterPreview = $("#posterPreview");
let posts = [];

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[character]);
}
function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}
function toggleSeriesFields() {
  if ($("#seriesFields") && $("#contentType")) {
    $("#seriesFields").hidden = $("#contentType").value !== "series";
  }
}
function showSection(name, { remember = true } = {}) {
  document.querySelectorAll(".admin-exact-nav [data-admin-section]").forEach(button =>
    button.classList.toggle("active", button.dataset.adminSection === name)
  );
  document.querySelectorAll(".admin-section-panel[data-admin-panel]").forEach(panel =>
    panel.classList.toggle("active", panel.dataset.adminPanel === name)
  );
  if (remember) sessionStorage.setItem("streamcafe-admin-section", name);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function bindNavigation() {
  document.querySelectorAll(".admin-exact-nav [data-admin-section]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      showSection(button.dataset.adminSection);
    });
  });
  $("#logoutButton")?.addEventListener("click", async event => {
    event.preventDefault();
    await signOut(auth);
    sessionStorage.removeItem("streamcafe-admin-section");
    location.href = "./auth.html?returnTo=./admin.html";
  });
}
function normalize(value) { return String(value || "").trim().toLowerCase(); }
function postMatches(post, query) {
  if (!query) return true;
  return [
    post.title, post.series_title, post.category, post.release_year,
    post.content_type === "series" ? "series episode tv series" : "movie",
    post.published ? "published" : "draft",
    post.season_number ? `season ${post.season_number}` : "",
    post.episode_number ? `episode ${post.episode_number}` : ""
  ].map(normalize).join(" ").includes(query);
}
function renderPosts() {
  const list = $("#postsList");
  const input = $("#existingContentSearch");
  const clear = $("#clearExistingContentSearch");
  if (!list) return;
  const query = normalize(input?.value);
  const visible = posts.filter(post => postMatches(post, query));
  if (clear) clear.hidden = !query;
  if (!posts.length) setText("#postsMessage", "No content yet.");
  else if (!visible.length) setText("#postsMessage", `No content matches "${input.value.trim()}".`);
  else setText("#postsMessage", query ? `${visible.length} of ${posts.length} items` : `${posts.length} item${posts.length===1?"":"s"}`);

  list.innerHTML = visible.map(post => `
    <article class="admin-post">
      <img src="${esc(post.poster_url || "")}" alt="" loading="lazy">
      <div>
        <div class="admin-post-heading">
          <h3>${esc(post.title)}</h3>
          <span class="${post.published ? "published" : "draft"}">${post.published ? "Published" : "Draft"}</span>
        </div>
        <p>${post.content_type === "series"
          ? `Series · ${esc(post.series_title || "")} · S${esc(post.season_number || 1)} E${esc(post.episode_number || 1)}`
          : `Movie${post.release_year ? ` · ${esc(post.release_year)}` : ""}`}</p>
        <div class="admin-post-actions">
          <button class="text-button" type="button" data-edit="${post.id}">Edit</button>
          <button class="text-button danger" type="button" data-delete="${post.id}">Delete</button>
        </div>
      </div>
    </article>`).join("");

  list.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => editPost(button.dataset.edit)));
  list.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => deletePost(button.dataset.delete)));
}
async function loadPosts() {
  setText("#postsMessage", "Loading content…");
  try {
    posts = await listAllPosts();
    renderPosts();
  } catch (error) {
    setText("#postsMessage", error.message);
  }
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
  postForm.reset();
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
  try {
    await removePost(id);
    await loadPosts();
  } catch (error) {
    setText("#postsMessage", error.message);
  }
}

async function optimizePoster(file) {
  if (!file) {
    throw new Error("Choose an image first.");
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use JPG, PNG, or WebP.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Maximum source image size is 5 MB.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read the selected image."));
      img.src = objectUrl;
    });

    const maxWidth = 1280;
    const maxHeight = 720;
    const scale = Math.min(
      1,
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight
    );

    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Your browser cannot process this image.");
    }

    context.drawImage(image, 0, 0, width, height);

    // Keep well below Firestore's 1 MiB document limit after base64 overhead.
    const targetBytes = 380 * 1024;
    const qualities = [0.78, 0.68, 0.58, 0.48, 0.38, 0.30];

    for (const quality of qualities) {
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, "image/webp", quality);
      });

      if (!blob) continue;

      if (blob.size <= targetBytes) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Unable to process the poster."));
          reader.readAsDataURL(blob);
        });

        return {
          dataUrl,
          width,
          height,
          size: blob.size
        };
      }
    }

    throw new Error("Image is too complex to fit safely. Try a smaller poster.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadPoster() {
  const file = posterFile?.files?.[0];

  setText("#uploadMessage", "Optimizing image…");

  const button = $("#uploadPosterButton");
  if (button) button.disabled = true;

  try {
    const optimized = await optimizePoster(file);

    posterUrl.value = optimized.dataUrl;
    posterPreview.src = optimized.dataUrl;
    posterPreview.hidden = false;

    setText(
      "#uploadMessage",
      `Poster ready (${optimized.width}×${optimized.height}, ${Math.round(optimized.size / 1024)} KB).`
    );
  } catch (error) {
    posterUrl.value = "";
    setText("#uploadMessage", error.message);
  } finally {
    if (button) button.disabled = false;
  }
}
async function savePostForm(event) {
  event.preventDefault();
  setText("#formMessage", "");
  if (!posterUrl.value) return setText("#formMessage", "Choose a poster and click Upload poster first.");

  const type = $("#contentType").value;
  if (type === "series" && !$("#seriesTitle").value.trim()) return setText("#formMessage", "Enter a series title.");

  const payload = {
    content_type: type,
    category: $("#category").value.trim() || "Video",
    title: $("#title").value.trim(),
    description: $("#description").value.trim(),
    release_year: Number($("#releaseYear").value) || null,
    featured: $("#featured").checked,
    series_title: type === "series" ? $("#seriesTitle").value.trim() : null,
    season_number: type === "series" ? Number($("#seasonNumber").value) || 1 : null,
    episode_number: type === "series" ? Number($("#episodeNumber").value) || 1 : null,
    poster_url: posterUrl.value,
    video_url: $("#videoUrl").value.trim(),
    published: $("#published").checked
  };

  try {
    await savePost(payload, $("#postId").value);
    setText("#formMessage", "Saved successfully.");
    resetForm();
    await loadPosts();
  } catch (error) {
    setText("#formMessage", error.message);
  }
}
async function loadAnalytics() {
  const message = $("#analyticsMessage");
  if (!message) return;
  message.textContent = "Loading analytics…";
  try {
    const result = await adminAnalytics();
    const s = result.summary;
    setText("#metricUsers", Number(s.total_users||0).toLocaleString());
    setText("#metricViews", Number(s.total_views||0).toLocaleString());
    setText("#metricPlays", Number(s.total_plays||0).toLocaleString());
    setText("#metricCompletes", Number(s.total_completes||0).toLocaleString());
    setText("#metricFavorites", Number(s.total_favorites||0).toLocaleString());
    setText("#metricSearches", Number(s.total_searches||0).toLocaleString());

    $("#topVideos").innerHTML = result.topVideos.map((row,index) =>
      `<div class="analytics-row"><span>${index+1}. ${esc(row.title)}</span><strong>${Number(row.play_count).toLocaleString()} plays</strong></div>`
    ).join("") || '<p class="message">No play data yet.</p>';

    $("#topSearches").innerHTML = result.topSearches.map((row,index) =>
      `<div class="analytics-row"><span>${index+1}. ${esc(row.query)}</span><strong>${Number(row.search_count).toLocaleString()}</strong></div>`
    ).join("") || '<p class="message">No search data yet.</p>';
    message.textContent = "";
  } catch (error) {
    message.textContent = error.message;
  }
}
function bindControls() {
  $("#contentType")?.addEventListener("change", toggleSeriesFields);
  posterFile?.addEventListener("change", () => {
    const file = posterFile.files?.[0];

    posterUrl.value = "";

    if (!file) {
      posterPreview.hidden = true;
      setText("#uploadMessage", "");
      return;
    }

    posterPreview.src = URL.createObjectURL(file);
    posterPreview.hidden = false;
    setText("#uploadMessage", "Image selected. Click Upload poster.");
  });
  $("#uploadPosterButton")?.addEventListener("click", uploadPoster);
  postForm?.addEventListener("submit", savePostForm);
  $("#cancelEditButton")?.addEventListener("click", resetForm);
  $("#refreshButton")?.addEventListener("click", loadPosts);
  $("#refreshAnalyticsButton")?.addEventListener("click", loadAnalytics);
  $("#existingContentSearch")?.addEventListener("input", renderPosts);
  $("#existingContentSearch")?.addEventListener("search", renderPosts);
  $("#clearExistingContentSearch")?.addEventListener("click", () => {
    $("#existingContentSearch").value = "";
    $("#existingContentSearch").focus();
    renderPosts();
  });
}
async function init() {
  if (!isConfigured) return alert("Firebase is not configured.");
  const user = await waitForAuth();
  if (!user || !(await isAdmin(user))) {
    location.href = `./auth.html?returnTo=${encodeURIComponent("./admin.html")}`;
    return;
  }
  setText("#signedInAs", `Signed in as ${user.email || "admin"}`);
  bindNavigation();
  bindControls();
  const saved = sessionStorage.getItem("streamcafe-admin-section") || "create";
  showSection(["dashboard","create","existing"].includes(saved) ? saved : "create", { remember:false });
  await Promise.all([loadPosts(), loadAnalytics()]);
}
init().catch(error => {
  console.error(error);
  alert(`Unable to load admin: ${error.message}`);
});
