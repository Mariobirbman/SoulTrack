# Dataset: global_sports_footwear_sales_2018_2026.csv

This repo includes the dataset at:
- `soletrack/public/data/global_sports_footwear_sales_2018_2026.csv`

The app loads it client-side on:
- `/analytics` (see `soletrack/src/views/Analytics.vue`)

## What the dataset contains
30,000 order rows with columns like:
- `order_id`, `order_date`
- `brand`, `model_name`, `category`, `gender`, `size`, `color`
- pricing + sales: `base_price_usd`, `discount_percent`, `final_price_usd`, `units_sold`, `revenue_usd`
- `payment_method`, `sales_channel`, `country`, `customer_income_level`, `customer_rating`

## Stock photos
The CSV does **not** include image URLs/stock photos.

For the “Shoes” tab, the UI generates **placeholder images** (SVG data URIs) so the grid still looks like a real catalog.

If you want real photos, you’ll need to add an `image` field yourself (for example by:
- mapping `brand/category` to your existing photos in `soletrack/src/assets/Photo of shoes/`
- storing hosted URLs in Firestore and rendering them in the UI)

