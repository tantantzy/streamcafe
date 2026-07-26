# StreamCafe Pro v8 — Phase 1 to Phase 3

Developed by **TanTanTzy**.

## Phase 1: User Accounts

- Sign up, sign in, sign out
- Email confirmation support
- Password reset email
- User profile with display name and avatar URL
- Account-aware navigation
- Protected My List, History, and Profile pages
- Supabase Auth and Row Level Security

## Phase 2: User Library and Watch Sync

- Favorites stored in Supabase
- My List page
- Watch history stored per user
- Continue Watching section on the homepage
- Resume playback for direct HTML5 videos
- Progress bars on the History page
- Cross-device synchronization when signed in

Google Drive embeds cannot expose precise playback time to the parent website,
so they record plays but cannot provide accurate resume progress.

## Phase 3: Analytics

- Video views
- Video plays
- Completions
- Shares
- Reports and external-source opens
- Search query analytics
- Admin summary cards
- Most-watched titles
- Popular searches

## Installation

1. Create a Supabase project.
2. Open the SQL Editor and run `supabase/setup.sql`.
3. Create an Auth user for your administrator.
4. Copy that user's UUID from Authentication > Users.
5. Run:

```sql
insert into public.admins(user_id)
values ('YOUR-ADMIN-USER-UUID');
```

6. Copy `assets/config.example.js` to `assets/config.js`.
7. Enter your Supabase project URL and publishable key.
8. In Supabase Authentication URL Configuration, add your GitHub Pages URL:
   - Site URL: `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`
   - Redirect URLs: include the same base URL and `profile.html`
9. Upload the project to GitHub Pages.

## Selling the template

Do not include copyrighted videos, posters, logos, or screenshots in the
commercial package. Use original, public-domain, or properly licensed demo
content. Never include private keys or service-role keys.

## Limitations

This is a static frontend with Supabase as the backend. Payment subscriptions
are not included in Phase 1–3 because secure payment webhooks require a
server-side or serverless component.


## v8.0.1 History fix

- Every signed-in video visit now creates or refreshes a watch-history entry.
- Google Drive embeds now appear in History as `Recently Viewed`.
- Direct HTML5 videos continue to save exact progress and resume position.
- Existing progress is preserved when revisiting a Google Drive embed.


## v8.1.1 Admin menu

The admin page now has three working sections:

- Dashboard: analytics and performance summary
- Create Content: create or edit a movie or series episode
- Existing Content: view, edit, refresh, and delete published or draft content

The selected section is remembered during the current browser session.


## v8.2 Compact admin layout

- Reduced header and menu height.
- Compressed analytics cards and lists.
- Changed Create Content to a two-column desktop form.
- Reduced input, button, and panel spacing.
- Added a scrollable Existing Content list on desktop.
- Preserved a single-column mobile layout.


## v8.3 Mobile experience

- Added a mobile-only hamburger navigation menu.
- Navigation opens as an animated slide-in drawer.
- Reduced the homepage featured-carousel height.
- Reduced carousel heading and button sizes on phones.
- Changed homepage content sections into horizontal swipe rows.
- Reduced spacing and card sizes to shorten the homepage.
- Kept Series, Movies, and Search as compact two-column mobile grids.
- Simplified the mobile footer.
- Desktop and admin layouts remain unchanged.


## v8.3.1 Mobile menu click fix

- Corrected the stacking order of the mobile drawer and dark overlay.
- Menu links are now above the overlay and clickable.
- Added a defensive mobile navigation handler for browsers that swallow
  clicks while the drawer closes.
- No desktop, admin, card, or homepage layout changes.


## v8.5 Simple admin interface

- Reverted the admin page to a neutral charcoal design.
- Removed colorful gradients and decorative styling.
- Kept compact tabs, analytics, Create Content, and Existing Content.
- Public pages and mobile navigation were not changed.


## v8.6 Centered admin panels

- Centered and narrowed only the Create Content workspace.
- Centered and narrowed only the Existing Content workspace.
- Kept the Manage Content header, sign-out button, tabs, colors, and overall
  admin design unchanged.
- Kept laptop, tablet, and mobile layouts full-width.


## v8.7 Fitted CMS editor

- Reorganized Create Content into a CMS-style two-column layout.
- Main content fields are on the left.
- Publishing options and poster upload are in a right sidebar.
- Removed horizontal overflow and fixed-width field problems.
- Existing Content remains centered and fitted.
- Manage Content header, tabs, colors, and public website remain unchanged.


## v8.8 Reference-style admin

- Added a compact top bar with Manage Content and text navigation.
- Matched the reference layout with a centered two-column editor.
- Kept publishing controls and poster upload in a narrow right sidebar.
- Simplified spacing, typography, borders, and controls.
- Dashboard and Existing Content remain available through the top navigation.
- Public pages and mobile website navigation remain unchanged.


## v8.9 Refined reference admin

- Increased the Manage Content title size.
- Tightened the header and text navigation.
- Widened the main editor and narrowed the right sidebar.
- Moved Poster controls into the Publish sidebar.
- Matched the latest reference spacing and proportions more closely.
- Public pages remain unchanged.


## v9.0 Exact admin reference rebuild

- Rebuilt admin.html cleanly from scratch.
- Matches the supplied reference layout.
- Contains one editor card and one publish/poster sidebar.
- Removed duplicated Publish and Poster panels.
- Removed extra empty vertical space.
- Preserved Dashboard, Create Content, Existing Content, and Sign Out.
- Preserved existing admin JavaScript IDs and functionality.
- Public website pages remain unchanged.


## Admin v2

- Dashboard, Create Content, and Existing Content now switch directly.
- Sign Out now uses Supabase Auth directly and reliably.
- Removed the hidden compatibility navigation.
- Preserved the exact approved admin layout.
- Improved file-input fit inside the Poster sidebar.
- Added a subtle active-menu indicator.
