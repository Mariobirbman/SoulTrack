# Firebase setup (Auth + Firestore)

This project uses:
- Firebase Authentication (email/password + Google)
- Cloud Firestore for `products`, `vendors`, and per-user `sales`
 - Demo marketplace checkout via `vendorOrders` + per-order chat via `vendorOrders/{orderId}/messages`

## 1) Create Firebase project
1. Go to Firebase Console and create a project.
2. In **Project settings** -> **Your apps**, add a **Web app** and copy the config values.

## 2) Enable Auth providers
In **Authentication** -> **Sign-in method**:
- Enable **Email/Password**
- Enable **Google**

In **Authentication** -> **Settings** -> **Authorized domains**:
- Make sure your domain is listed (for local dev, `localhost` is typical).
- If you see `auth/unauthorized-domain` when using Google sign-in, add the current hostname (for example `127.0.0.1` or a custom domain you deployed to).

## 3) Create Firestore database
In **Firestore Database**:
- Create a database (production mode is fine).

## 4) Add env vars to the Vue app
Create `soletrack/.env.local` (do not commit it) using `soletrack/.env.example` as a template.

Then run:
```sh
cd soletrack
npm run dev
```

## 5) Create collections (recommended shape)

### Marketplace (vendors + listings + demo checkout)
The marketplace flow (Sell → Browse → Cart → Checkout) uses:
- `vendors/{vendorUid}` (doc id == Firebase Auth uid)
- `products/{productId}` (must include `vendorUid` + `vendorName`)
- `vendorOrders/{vendorOrderId}` (one doc per vendor at checkout time)
- `vendorOrders/{vendorOrderId}/messages/{messageId}` (per-order chat)

The easiest way to generate correct documents is to use the app UI:
- vendor: go to `/sell` and create your vendor profile + add sample listings
- buyer: go to `/browse` → add to cart → `/checkout`

### `products` (public read)
Documents should include:
- `vendorUid` (string, owner uid)
- `vendorName` (string, shop name snapshot)

Optional (recommended for listings):
- `active` (boolean)
- `createdAt` / `updatedAt` (server timestamps)

Example fields:
- `name` (string)
- `brand` (string)
- `size` (string)
- `price` (number)
- `retailPrice` (number)
- `condition` ("New" | "Used" | "DS")
- `image` (string URL/path)
- `platform` (string)
- `colorway` (string)
- `sku` (string)
- `seller` (string)
- `soldCount` (number)
- `description` (string)

### `vendors` (public read)
Document id should be the vendor's auth uid (the app writes this for you).
Example fields:
- `name` (string)
- `location` (string)
- `description` (string)
- `minOrder` (number)
 - `contactEmail` (string)

### `users/{uid}/sales` (private per user)
Created automatically from the Account page:
- `shoe` (string)
- `size` (string)
- `buyPrice` (number)
- `sellPrice` (number)
- `date` (YYYY-MM-DD string)
- `platform` (string)
- `createdAt` (server timestamp)

## 6) Security rules
This repo includes `firestore.rules` at the repo root:
- `products` and `vendors` are public read, client write is vendor-owned (auth uid).
- `vendorOrders` are readable by the buyer and the vendor; they are write-once demo orders.
- `users/{uid}` and `users/{uid}/sales` are user-private.

If you deploy rules, make sure you understand and review them first.

## Deploying (optional)
This repo includes `firebase.json` at the repo root so you can deploy:
- Firestore rules from `firestore.rules`
- Hosting from `soletrack/dist` (SPA rewrite to `/index.html`)

Typical flow:
```sh
firebase login
firebase projects:list
firebase deploy --project YOUR_FIREBASE_PROJECT_ID --only firestore:rules,hosting
```

## Seeding demo data (products + vendors)
If you want the Firestore-backed pages to show real data immediately, run the seeder:
```sh
cd soletrack
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccount.json
node scripts/seed-firestore.mjs
```

Options:
- `--only=products` or `--only=vendors`
- `--dry-run`

### Seeding a chunk of the CSV dataset into Firestore
This imports a subset of the 30,000 orders into Firestore collections:
- `orders/{order_id}` (order rows)
- `shoes/{shoe_id}` (aggregated by brand/model/category/gender/color)

Example (seed 2,000 orders):
```sh
cd soletrack
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccount.json
npm run seed:firestore -- --orders=2000
```

Options:
- `--orders=5000` (choose how big the chunk is)
- `--only=orders` or `--only=shoes`
- `--csv=public/data/global_sports_footwear_sales_2018_2026.csv` (custom path)
