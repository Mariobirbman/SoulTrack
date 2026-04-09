<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import Lenis from 'lenis'

let lenis: Lenis | null = null
let rafId: number

onMounted(() => {
  lenis = new Lenis()
  function raf(time: number) {
    lenis!.raf(time)
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  lenis?.destroy()
})

const shoe1 = '/images/shoes/pexels-jonathanborba-12031204.jpg'
const shoe2 = '/images/shoes/pexels-mohammad-khan-3488802-5470890.jpg'
const shoe3 = '/images/shoes/pexels-delot-15467344.jpg'
const shoe4 = '/images/shoes/pexels-perfect-lens-15939920.jpg'
const shoe5 = '/images/shoes/pexels-shyam-mishra-203327-13691725.jpg'
const shoe6 = '/images/shoes/pexels-ahmad-saeed-143458323-10373341.jpg'

const leftImages = [shoe1, shoe4, shoe2, shoe5, shoe3]
const middleImages = [shoe6, shoe2, shoe4]
const rightImages = [shoe5, shoe3, shoe6, shoe1, shoe2]
</script>

<template>
  <div class="gallery-wrapper">
    <!-- sticky intro -->
    <section class="gallery-hero">
      <div class="gallery-hero__grid-bg"></div>
      <h2 class="gallery-hero__title">
        The Freshest Kicks<br />
        All in One Place
      </h2>
      <div class="gallery-hero__squares">

        <div class="square">
          <div class="square__icon-wrap">
            <!-- Trending up chart icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div class="square__stat">30K+ Orders</div>
          <h2>Track Sales</h2>
          <p>Monitor profit &amp; loss across all your listings in real time. Know your margins on every flip.</p>
          <router-link to="/analytics">View Catalog →</router-link>
        </div>

        <div class="square">
          <div class="square__icon-wrap">
            <!-- Tag / product icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </div>
          <div class="square__stat">9 Brands</div>
          <h2>Find Products</h2>
          <p>Browse curated listings from verified vendors. Jordans, Yeezys, Dunks — all in one place.</p>
          <router-link to="/browse">Browse Now →</router-link>
        </div>

        <div class="square">
          <div class="square__icon-wrap">
            <!-- Store / building icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="square__stat">6 Verified</div>
          <h2>Top Vendors</h2>
          <p>Connect with authenticated suppliers. Source direct, cut out the middleman, grow your business.</p>
          <router-link to="/vendors">Meet Vendors →</router-link>
        </div>

      </div>
    </section>

    <!-- scroll gallery -->
    <section class="gallery-scroll">
      <div class="gallery-grid">
        <!-- left col — scrolls normally -->
        <div class="gallery-col gallery-col--scroll">
          <figure v-for="(src, i) in leftImages" :key="i" class="gallery-figure">
            <img :src="src" alt="sneaker" class="gallery-img" />
          </figure>
        </div>

        <!-- middle col — sticky -->
        <div class="gallery-col gallery-col--sticky">
          <figure v-for="(src, i) in middleImages" :key="i" class="gallery-figure gallery-figure--fill">
            <img :src="src" alt="sneaker" class="gallery-img" />
          </figure>
        </div>

        <!-- right col — scrolls normally -->
        <div class="gallery-col gallery-col--scroll">
          <figure v-for="(src, i) in rightImages" :key="i" class="gallery-figure">
            <img :src="src" alt="sneaker" class="gallery-img" />
          </figure>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gallery-wrapper {
  background: var(--bg);
  color: var(--text);
}

/* Fixed hero — always visible while gallery scrolls below */
.gallery-hero {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: var(--bg);
  display: grid;
  place-items: center;
  z-index: 2;
}

.gallery-hero__grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(100, 200, 100, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(100, 200, 100, 0.06) 1px, transparent 1px);
  background-size: 54px 54px;
  -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%);
}

.gallery-hero__title {
  position: relative;
  z-index: 1;
  font-size: clamp(2rem, 6vw, 4.5rem);
  font-weight: 700;
  text-align: center;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--text);
}

/* Gallery scrolls from below the fixed hero */
.gallery-scroll {
  position: relative;
  z-index: 3;
  background: var(--bg);
  margin-top: 100vh;
}

.gallery-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 8px;
}

/* Left and right cols scroll normally */
.gallery-col--scroll {
  display: grid;
  gap: 8px;
}

/* Middle col sticks while the others scroll */
.gallery-col--sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 8px;
}

.gallery-figure {
  width: 100%;
  margin: 0;
}

.gallery-figure--fill {
  height: 100%;
}

.gallery-img {
  width: 100%;
  max-width: 100%;
  height: 70vh;
  object-fit: cover;
  object-position: center;
  border-radius: 8px;
  display: block;
  transition: transform 0.3s ease;
}

.gallery-figure--fill .gallery-img {
  height: 100%;
}

.gallery-img:hover {
  transform: scale(1.02);
}

.gallery-hero__squares {
  display: flex;
  gap: 16px;
  position: relative;
  z-index: 1;
  margin-top: 40px;
  flex-wrap: wrap;
  justify-content: center;
}

.square {
  width: 280px;
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.05) 0%, rgba(42, 51, 46, 0.9) 60%);
  border: 1px solid rgba(156, 255, 0, 0.2);
  border-radius: 20px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  backdrop-filter: blur(8px);
}

.square:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 48px rgba(156, 255, 0, 0.12);
  border-color: rgba(156, 255, 0, 0.38);
}

/* Icon circle */
.square__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(156, 255, 0, 0.1);
  border: 1px solid rgba(156, 255, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.square__icon-wrap svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
}

/* Stat badge above the title */
.square__stat {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.85;
}

.square h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.square p {
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.6;
  flex: 1;
}

.square a {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 1px solid rgba(156, 255, 0, 0.3);
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 8px;
  align-self: flex-start;
  transition: background 0.2s, border-color 0.2s;
  letter-spacing: 0.02em;
}

.square a:hover {
  background: rgba(156, 255, 0, 0.08);
  border-color: rgba(156, 255, 0, 0.5);
}
</style>
