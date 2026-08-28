# StreamCafe Firebase Edition v1

This build migrates StreamCafe from Supabase to Firebase.

Backend:
- Firebase Authentication
- Cloud Firestore

Poster images:
- Paste any public poster URL, or
- Configure a Cloudinary unsigned upload preset

Hosting:
- Keep using Netlify.

## Start here

Read:

`FIREBASE-MIGRATION-GUIDE.md`

## Important

Before uploading the website, create:

`assets/firebase-config.js`

by copying:

`assets/firebase-config.example.js`

## Existing functionality preserved

- Home carousel
- Movies
- Series
- Search
- Watch page
- Episodes
- User sign-up/sign-in
- Password reset
- My List
- Watch history
- Continue Watching
- Profiles
- Admin v2
- Create/edit/delete content
- Existing Content search
- Dashboard analytics
- Mobile navigation

## Important media note

Only publish video and poster content you own, license, or otherwise have
permission to distribute/embed.


## StreamCafe v8.4 improvements
- Added a 60-second session cache for published catalog data to reduce repeat Firestore reads while browsing.
- Added async image decoding and CSS content-visibility for smoother large catalogs on desktop.
- Desktop catalogs now use 5–6 columns depending on viewport width.
- Desktop watch page gives the player more space and keeps the information panel compact.
- Added a thin playback-progress indicator at the bottom of direct HTML5 video players. Google Drive's embedded player remains controlled by Google and cannot be repositioned from the parent page because it is cross-origin.
