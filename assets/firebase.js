import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
  FIREBASE_CONFIG,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET
} from "./firebase-config.js";

export const isConfigured = Boolean(
  FIREBASE_CONFIG?.apiKey &&
  FIREBASE_CONFIG?.projectId &&
  !String(FIREBASE_CONFIG.apiKey).includes("YOUR_") &&
  !String(FIREBASE_CONFIG.projectId).includes("YOUR_")
);

export const cloudinaryConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_UPLOAD_PRESET
);

export const app = isConfigured ? initializeApp(FIREBASE_CONFIG) : null;
export const auth = isConfigured ? getAuth(app) : null;
export const db = isConfigured ? getFirestore(app) : null;

function isoNow() {
  return new Date().toISOString();
}

function snapToObject(snapshot) {
  if (!snapshot?.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

function sortNewest(items, field = "created_at") {
  return [...items].sort((a, b) =>
    String(b?.[field] || "").localeCompare(String(a?.[field] || ""))
  );
}

export async function waitForAuth() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  return await new Promise(resolve => {
    const stop = onAuthStateChanged(auth, user => {
      stop();
      resolve(user || null);
    });
  });
}

export async function getProfile(uid) {
  if (!db || !uid) return null;
  return snapToObject(await getDoc(doc(db, "user_profiles", uid)));
}

export async function saveProfile(uid, values, { creating = false } = {}) {
  if (!db || !uid) throw new Error("Firebase is not configured.");
  const current = await getProfile(uid);
  const role = current?.role || "user";
  await setDoc(doc(db, "user_profiles", uid), {
    user_id: uid,
    display_name: values.display_name || "",
    avatar_url: values.avatar_url || null,
    role,
    created_at: current?.created_at || isoNow(),
    updated_at: isoNow()
  }, { merge: true });
}

export async function isAdmin(user = null) {
  const target = user || await waitForAuth();
  if (!target) return false;
  const profile = await getProfile(target.uid);
  return profile?.role === "admin";
}

const PUBLISHED_CACHE_KEY = "streamcafe:published-posts:v1";
const PUBLISHED_CACHE_TTL = 60 * 1000;

function readPublishedCache() {
  try {
    const raw = sessionStorage.getItem(PUBLISHED_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || Date.now() - Number(cached.timestamp || 0) > PUBLISHED_CACHE_TTL) return null;
    return Array.isArray(cached.posts) ? cached.posts : null;
  } catch {
    return null;
  }
}

function writePublishedCache(posts) {
  try {
    sessionStorage.setItem(PUBLISHED_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      posts
    }));
  } catch {
    // Storage can be disabled/full; browsing still works without the cache.
  }
}

export async function listPublishedPosts({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readPublishedCache();
    if (cached) return cached;
  }

  const q = query(collection(db, "video_posts"), where("published", "==", true));
  const snap = await getDocs(q);
  const posts = sortNewest(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  writePublishedCache(posts);
  return posts;
}

export async function listAllPosts() {
  const snap = await getDocs(collection(db, "video_posts"));
  return sortNewest(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function getPost(id) {
  if (!id) return null;
  return snapToObject(await getDoc(doc(db, "video_posts", id)));
}

export async function savePost(payload, id = "") {
  const clean = {
    ...payload,
    updated_at: isoNow()
  };
  if (id) {
    await setDoc(doc(db, "video_posts", id), clean, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, "video_posts"), {
    ...clean,
    created_at: isoNow()
  });
  return ref.id;
}

export async function removePost(id) {
  await deleteDoc(doc(db, "video_posts", id));
}

export function favoriteDocumentId(uid, postId) {
  return `${uid}_${postId}`;
}

export async function isFavorite(uid, postId) {
  if (!uid || !postId) return false;
  return Boolean(
    await getDoc(doc(db, "user_favorites", favoriteDocumentId(uid, postId)))
  .then(s => s.exists()));
}

export async function addFavorite(uid, postId) {
  await setDoc(doc(db, "user_favorites", favoriteDocumentId(uid, postId)), {
    user_id: uid,
    video_post_id: postId,
    created_at: isoNow()
  });
}

export async function removeFavorite(uid, postId) {
  await deleteDoc(doc(db, "user_favorites", favoriteDocumentId(uid, postId)));
}

export async function listFavorites(uid) {
  const q = query(collection(db, "user_favorites"), where("user_id", "==", uid));
  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a,b) => String(b.created_at||"").localeCompare(String(a.created_at||"")));
  const posts = await Promise.all(rows.map(row => getPost(row.video_post_id)));
  return posts.filter(Boolean);
}

export function historyDocumentId(uid, postId) {
  return `${uid}_${postId}`;
}

export async function getHistory(uid, postId) {
  if (!uid || !postId) return null;
  return snapToObject(await getDoc(doc(db, "watch_history", historyDocumentId(uid, postId))));
}

export async function saveHistory(uid, postId, values = {}) {
  const current = await getHistory(uid, postId);
  await setDoc(doc(db, "watch_history", historyDocumentId(uid, postId)), {
    user_id: uid,
    video_post_id: postId,
    progress_seconds: Number(values.progress_seconds ?? current?.progress_seconds ?? 0),
    duration_seconds: Number(values.duration_seconds ?? current?.duration_seconds ?? 0),
    completed: Boolean(values.completed ?? current?.completed ?? false),
    created_at: current?.created_at || isoNow(),
    updated_at: isoNow()
  }, { merge: true });
}

export async function listHistory(uid, limitCount = 40) {
  const q = query(collection(db, "watch_history"), where("user_id", "==", uid));
  const snap = await getDocs(q);
  const rows = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a,b) => String(b.updated_at||"").localeCompare(String(a.updated_at||"")))
    .slice(0, limitCount);

  const posts = await Promise.all(rows.map(row => getPost(row.video_post_id)));
  return rows.map((row, index) => ({ ...row, video_posts: posts[index] }))
    .filter(row => row.video_posts);
}

export async function trackEvent(eventType, {
  postId = null,
  userId = null,
  metadata = {}
} = {}) {
  if (!db) return;
  await addDoc(collection(db, "video_analytics"), {
    event_type: eventType,
    video_post_id: postId,
    user_id: userId,
    metadata,
    created_at: isoNow()
  });
}

export async function adminAnalytics() {
  const [profilesSnap, favoriteSnap, analyticsSnap, postsSnap] = await Promise.all([
    getDocs(collection(db, "user_profiles")),
    getDocs(collection(db, "user_favorites")),
    getDocs(collection(db, "video_analytics")),
    getDocs(collection(db, "video_posts"))
  ]);

  const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const titleById = new Map(posts.map(p => [p.id, p.title || p.series_title || "Untitled"]));
  const events = analyticsSnap.docs.map(d => d.data());

  const playCounts = new Map();
  const searchCounts = new Map();

  let views = 0;
  let plays = 0;
  let completes = 0;
  let searches = 0;

  for (const event of events) {
    if (event.event_type === "view") views++;
    if (event.event_type === "play") {
      plays++;
      if (event.video_post_id) {
        playCounts.set(
          event.video_post_id,
          (playCounts.get(event.video_post_id) || 0) + 1
        );
      }
    }
    if (event.event_type === "complete") completes++;
    if (event.event_type === "search") {
      searches++;
      const term = String(event.metadata?.query || "").trim().toLowerCase();
      if (term) searchCounts.set(term, (searchCounts.get(term) || 0) + 1);
    }
  }

  return {
    summary: {
      total_users: profilesSnap.size,
      total_views: views,
      total_plays: plays,
      total_completes: completes,
      total_favorites: favoriteSnap.size,
      total_searches: searches
    },
    topVideos: [...playCounts.entries()]
      .map(([id, count]) => ({ title: titleById.get(id) || "Untitled", play_count: count }))
      .sort((a,b) => b.play_count - a.play_count)
      .slice(0, 8),
    topSearches: [...searchCounts.entries()]
      .map(([term, count]) => ({ query: term, search_count: count }))
      .sort((a,b) => b.search_count - a.search_count)
      .slice(0, 8)
  };
}

export async function uploadPosterToCloudinary(file) {
  if (!cloudinaryConfigured) {
    throw new Error("Cloudinary is not configured. Paste a poster URL instead.");
  }
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  body.append("folder", "streamcafe-posters");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`,
    { method: "POST", body }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || "Poster upload failed.");
  }
  return result.secure_url;
}
