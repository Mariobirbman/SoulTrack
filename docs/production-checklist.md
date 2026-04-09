# Production checklist (SoleTrack)

This is a practical list of the minimum things to do so the app works reliably for real users.

## 1) App basics
- Make sure the title/description look correct (browser tab + link previews).
- Test on mobile width (navigation, forms, readable text).
- Confirm all images load in a **production build** (not just `npm run dev`).

## 2) Firebase setup
- Follow `docs/firebase-setup.md`.
- In Firebase Console:
  - Enable Authentication providers you use (Email/Password, Google).
  - Create Firestore database.
- In local dev, create `soletrack/.env.local` from `soletrack/.env.example`.

## 3) Security rules
- Review `firestore.rules` (users should only read/write their own data).
- Verify the app still works when logged out (public pages).

## 4) Build + deploy
From the repo root:
```sh
firebase deploy
```

This repo is configured to build automatically before deploy via `firebase.json`:
- `npm --prefix soletrack run build`

## 5) “Get users” basics
- Add a short 1–2 sentence value prop on the home page.
- Add 1 clear primary CTA (“Get started”) and a secondary CTA (“Browse products”).
- Share the hosted URL with:
  - classmates / sneaker groups / friends
  - 1–2 short demo videos (phone screen recording)
  - a simple feedback form link (Google Form)
