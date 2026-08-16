# StreamCafe: Supabase → Firebase Migration Guide

This edition replaces Supabase with:

- Firebase Authentication
- Cloud Firestore
- Cloudinary (optional poster upload)
- Netlify remains your website host

## Step 1 — Create Firebase

1. Go to Firebase Console.
2. Create a project.
3. You can leave Google Analytics disabled.
4. Open Project Overview.
5. Click the **Web** icon.
6. Register a web app named `StreamCafe`.
7. Copy the Firebase configuration object.

Firebase supports browser-module SDK imports, which this package uses.

## Step 2 — Create Firestore

1. Firebase Console → **Build / Databases & Storage → Firestore Database**.
2. Click **Create database**.
3. Choose **Standard edition**.
4. Choose a region near your users.
5. Start in **Production mode**.

## Step 3 — Install the security rules

Open:

`firebase/firestore.rules`

Copy everything.

Firebase Console → Firestore → **Rules** → paste → **Publish**.

Do not leave Firestore in test mode.

## Step 4 — Enable Email/Password Authentication

Firebase Console → **Authentication** → Get started → **Sign-in method**.

Enable:

`Email/Password`

Save.

## Step 5 — Add your Netlify domain

Firebase Console → Authentication → **Settings → Authorized domains**.

Add your current domain, for example:

`steamcafepro.netlify.app`

Also add any future custom domain.

## Step 6 — Configure StreamCafe

Copy:

`assets/firebase-config.example.js`

Rename the copy to:

`assets/firebase-config.js`

Paste the Firebase values into `FIREBASE_CONFIG`.

Example:

```js
export const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

The Firebase web configuration is expected to be present in frontend code.
Do NOT put service-account private keys or server secrets in this file.

## Step 7 — Create your administrator

1. Upload this Firebase build to Netlify.
2. Open `auth.html`.
3. Create your account.
4. Firebase Console → Firestore → `user_profiles`.
5. Open the document whose ID is your Firebase UID.
6. Change:

`role: "user"`

to:

`role: "admin"`

7. Save.

Now open `admin.html`.

## Step 8 — Poster uploads (two choices)

### Choice A — easiest: paste poster URLs

You can paste a public image URL in the new **Poster URL** field.
No extra storage service is required.

### Choice B — Cloudinary free account

1. Create a Cloudinary account.
2. Copy your **Cloud name**.
3. Cloudinary Console → Settings → Upload → Upload presets.
4. Add an upload preset.
5. Set it to **Unsigned**.
6. Limit accepted formats to JPG, PNG, and WebP.
7. If available, set a maximum file size and destination folder.
8. Copy the preset name.

Then edit `assets/firebase-config.js`:

```js
export const CLOUDINARY_CLOUD_NAME = "your-cloud-name";
export const CLOUDINARY_UPLOAD_PRESET = "your-unsigned-preset";
```

Never put a Cloudinary API secret in frontend JavaScript.

## Step 9 — Move your old video posts

If Supabase lets you restore the paused project temporarily:

1. Supabase → Table Editor → `video_posts`.
2. Export as CSV.
3. Open `tools/csv-to-json.html` locally in Chrome.
4. Paste the CSV.
5. Click **Convert**.
6. Copy the resulting JSON.
7. Deploy the `tools` folder with the site temporarily.
8. Sign in to StreamCafe as Firebase admin.
9. Open:

`/tools/import-video-posts.html`

10. Paste the JSON.
11. Click **Import video posts**.
12. After migration succeeds, remove the `tools` folder from your public deployment.

The importer preserves your old video post IDs when they exist, so existing
`watch.html?id=...` links can continue working.

## Step 10 — Users, favorites, and history

Firebase cannot reuse your old Supabase users' passwords directly from this
frontend migration.

For a small StreamCafe installation, the simplest path is:

1. Ask users to create new Firebase accounts.
2. Re-create your own administrator account.
3. Favorites/history start fresh.

If you eventually need a large user migration, use a secure server-side
migration with Firebase Admin SDK rather than exposing credentials in the browser.

## Step 11 — Deploy to Netlify

Replace the files in your Netlify-connected GitHub repository with this build.

Keep:

`assets/firebase-config.js`

in the repository because Firebase's public web config is not a server secret.
Never commit private service-account keys.

Push to GitHub and let Netlify redeploy.

Then hard refresh:

`Ctrl + Shift + R`

## Free-plan notes

Cloud Firestore's no-cost quota currently includes 50,000 document reads and
20,000 document writes per day. On the Spark plan, if you exceed a product's
no-cost quota, that product can be shut off for the remainder of the month.

Firebase Cloud Storage now requires the Blaze plan for web use, which is why
this edition uses Cloudinary or manual poster URLs instead.

## Collections used

- `video_posts`
- `user_profiles`
- `user_favorites`
- `watch_history`
- `video_analytics`


## Poster upload update (v10.2)

Cloudinary is no longer required.

In Admin:

1. Choose a JPG, PNG, or WebP poster.
2. Click **Upload poster**.
3. StreamCafe resizes the image to a maximum of 1280 × 720.
4. It converts/compresses it to WebP.
5. The optimized image is stored with the Firestore content document.

For best results, use landscape images and keep original uploads below 10 MB.

Because Firestore documents have a size limit, StreamCafe targets an optimized
poster size below about 700 KB.
