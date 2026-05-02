<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import StickyScrollGallery from '@/components/StickyScrollGallery.vue'
import MarqueeTicker from '@/components/MarqueeTicker.vue'
import heroImage1 from '@/assets/hero-1.webp'
import heroImage2 from '@/assets/hero-2.webp'

const router = useRouter()
const searchText = ref('')
const images = [heroImage1, heroImage2]
const currentIndex = ref(0)
const fading = ref(false)

const heroBg = computed(() => images[currentIndex.value])
const overlayClass = computed(() => (fading.value ? 'hero-bg fading' : 'hero-bg'))

let timer: ReturnType<typeof setInterval>
let fadeTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  timer = setInterval(() => {
    fading.value = true
    fadeTimer = setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % images.length
      fading.value = false
      fadeTimer = null
    }, 700)
  }, 5000)
})

onUnmounted(() => {
  clearInterval(timer)
  if (fadeTimer) clearTimeout(fadeTimer)
})

function submitSearch() {
  const q = searchText.value.trim()
  router.push({ path: '/browse', query: q ? { q } : {} })
}
</script>

<template>
  <!-- ─── Hero ─────────────────────────────────────────────── -->
  <section class="hero">
    <!-- Background image with cross-fade -->
    <div :class="overlayClass" :style="{ backgroundImage: `url('${heroBg}')` }"></div>
    <!-- Dark gradient overlay — bottom-heavy so text is always legible -->
    <div class="hero-overlay"></div>

    <div class="hero-content container">
      <!-- Eyebrow label -->
      <div class="eyebrow">
        <span class="eyebrow-dot"></span>
        LIVE SNEAKER MARKETPLACE
      </div>

      <!-- Headline -->
      <h1 class="hero-title">
        Buy, Sell &amp; Track<br />
        <span class="title-accent">Rare Kicks.</span>
      </h1>

      <p class="hero-sub">
        The peer-to-peer sneaker platform built for resellers.
        List in 60 seconds, connect with buyers, track every deal.
      </p>

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat">
          <span class="stat-num">2,400+</span>
          <span class="stat-label">Listings</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-num">6</span>
          <span class="stat-label">Verified Vendors</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-num">9</span>
          <span class="stat-label">Brands</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-num">$0</span>
          <span class="stat-label">Commission</span>
        </div>
      </div>

      <!-- Search -->
      <form class="hero-search" @submit.prevent="submitSearch">
        <input
          v-model="searchText"
          type="text"
          placeholder="Search Jordan 1, Dunk Low, Yeezy 350…"
          aria-label="Search sneakers"
        />
        <button class="search-btn" type="submit">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="8.5" cy="8.5" r="5.5"/>
            <line x1="13" y1="13" x2="18" y2="18"/>
          </svg>
          Search
        </button>
      </form>

      <!-- CTAs -->
      <div class="hero-ctas">
        <router-link class="cta-primary" to="/browse">Browse Marketplace</router-link>
        <router-link class="cta-ghost" to="/sell">Start Selling →</router-link>
      </div>
    </div>

    <!-- Scroll hint -->
    <div class="scroll-hint" aria-hidden="true">
      <div class="scroll-hint__line"></div>
      <span>scroll</span>
    </div>
  </section>

  <!-- ─── Ticker ────────────────────────────────────────────── -->
  <MarqueeTicker />

  <!-- ─── Feature strip ─────────────────────────────────────── -->
  <section class="features">
    <div class="container features-grid">
      <div class="feature">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <h3>Instant Checkout</h3>
        <p>Place an order in seconds. Pick your preferred pickup time and the vendor handles the rest.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        <h3>Market Analytics</h3>
        <p>See real-time price trends, brand breakdowns, and monthly listing data — all free, no paywall.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        </div>
        <h3>Sell in 60 Seconds</h3>
        <p>Create your vendor profile, list a pair, and start connecting with buyers the same day.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3>Verified Vendors</h3>
        <p>Seller listings go live immediately, with transparent profiles and order history for confidence.</p>
      </div>
    </div>
  </section>

  <!-- ─── Scroll gallery ───────────────────────────────────── -->
  <StickyScrollGallery />
</template>

<style scoped>
/* ── Hero ─────────────────────────────────────────────────── */
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: flex-end;
  padding-bottom: 80px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 30%;
  transition: opacity 0.7s ease;
  z-index: 0;
}
.hero-bg.fading { opacity: 0; }

/* Multi-layer overlay: strong bottom-up dark + subtle vignette */
.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(to top,  rgba(7, 13, 9, 0.97) 0%,  rgba(7, 13, 9, 0.72) 40%, rgba(7, 13, 9, 0.30) 70%, rgba(7, 13, 9, 0.18) 100%),
    linear-gradient(to right, rgba(7, 13, 9, 0.35) 0%, transparent 60%);
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  max-width: 680px;
}

/* Eyebrow */
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--accent);
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.06);
  padding: 5px 12px;
  border-radius: 999px;
  margin-bottom: 22px;
}
.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: blink 1.6s ease-in-out infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Headline */
.hero-title {
  margin: 0 0 18px;
  font-size: clamp(2.6rem, 6.5vw, 5rem);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: var(--text);
}
.title-accent {
  color: var(--accent);
  display: block;
}

/* Subtitle */
.hero-sub {
  margin: 0 0 28px;
  color: var(--muted);
  font-size: clamp(0.95rem, 1.5vw, 1.1rem);
  line-height: 1.65;
  max-width: 52ch;
}

/* Stats row */
.stats-row {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
  row-gap: 12px;
  margin-bottom: 28px;
  padding: 14px 18px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  border-radius: 14px;
  background: rgba(7, 13, 9, 0.7);
  backdrop-filter: blur(10px);
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 20px;
}
.stat:first-child { padding-left: 0; }
.stat-num {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.02em;
}
.stat-label {
  font-size: 0.72rem;
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
}
.stat-sep {
  width: 1px;
  height: 32px;
  background: rgba(var(--accent-rgb), 0.12);
  flex-shrink: 0;
}

/* Search */
.hero-search {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0;
  width: 100%;
  max-width: 540px;
  margin-bottom: 24px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(13, 22, 16, 0.9);
  backdrop-filter: blur(12px);
}
.hero-search input {
  padding: 14px 16px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 0.95rem;
  outline: none;
  min-width: 0;
}
.hero-search input::placeholder { color: var(--muted); }
.search-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  background: var(--accent);
  color: #0b1205;
  font-weight: 900;
  font-size: 0.88rem;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  border-radius: 0;
  transition: opacity 0.15s;
}
.search-btn:hover { opacity: 0.88; }
.search-btn svg { width: 16px; height: 16px; }

/* CTAs */
.hero-ctas {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.cta-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 28px;
  border-radius: 12px;
  background: var(--accent);
  color: #0b1205;
  font-weight: 900;
  font-size: 0.95rem;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.15s;
  letter-spacing: 0.01em;
}
.cta-primary:hover { opacity: 0.88; transform: translateY(-1px); }

.cta-ghost {
  display: inline-flex;
  align-items: center;
  padding: 13px 22px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.04);
  color: var(--text);
  font-weight: 700;
  font-size: 0.95rem;
  text-decoration: none;
  transition: border-color 0.2s, background 0.2s;
}
.cta-ghost:hover {
  border-color: rgba(var(--accent-rgb), 0.5);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--text);
}

/* Scroll hint */
.scroll-hint {
  position: absolute;
  bottom: 28px;
  right: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 2;
}
.scroll-hint__line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, var(--accent), transparent);
  animation: scroll-line 1.8s ease-in-out infinite;
}
@keyframes scroll-line {
  0% { transform: scaleY(0); transform-origin: top; }
  50% { transform: scaleY(1); transform-origin: top; }
  51% { transform-origin: bottom; }
  100% { transform: scaleY(0); transform-origin: bottom; }
}
.scroll-hint span {
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  color: var(--muted);
  writing-mode: vertical-rl;
  text-transform: uppercase;
}

/* ── Feature strip ───────────────────────────────────────── */
.features {
  padding: 64px 0 72px;
  background: var(--bg);
  border-top: 1px solid rgba(var(--accent-rgb), 0.07);
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}
.feature {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.07);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.feature-icon svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
}
.feature h3 {
  margin: 0;
  font-size: 0.97rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.01em;
}
.feature p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.65;
}

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 900px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .hero { align-items: flex-start; padding-top: 100px; padding-bottom: 60px; }
  .hero-title { font-size: clamp(2.2rem, 10vw, 3rem); }
  .stats-row { gap: 0; padding: 10px 14px; }
  .stat { padding: 0 12px; }
  .stat-num { font-size: 1.1rem; }
  .hero-search { grid-template-columns: 1fr; border-radius: 12px; }
  .search-btn { border-radius: 0 0 12px 12px; justify-content: center; }
  .hero-ctas { flex-direction: column; align-items: stretch; }
  .cta-primary, .cta-ghost { text-align: center; justify-content: center; }
  .scroll-hint { display: none; }
  .features { padding: 40px 0 48px; }
  .features-grid { grid-template-columns: 1fr; gap: 28px; }
}
</style>
