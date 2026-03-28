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
          <h2>Sales</h2>
          <p>Track your sales</p>
          <p>Know your profit and loss</p>
          <router-link to="/login">Get started</router-link>
        </div>
        <div class="square">
          <h2>Products</h2>
          <p>Find Products</p>
          <p>Track your products and inventory</p>
          <router-link to="/login">Get started</router-link>
        </div>
        <div class="square">
          <h2>Vendors</h2>
          <p>Connect with Vendors</p>
          <p>Track your vendors and orders</p>
          <router-link to="/login">Get started</router-link>
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
  gap: 20px;
  position: relative;
  z-index: 1;
  margin-top: 32px;
  flex-wrap: wrap;
  justify-content: center;
}

.square {
  width: 300px;
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.06) 0%, var(--card) 60%);
  border: 1px solid rgba(156, 255, 0, 0.25);
  border-top: 2px solid var(--accent);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.square:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(156, 255, 0, 0.12);
}

.square h2 {
  margin: 0;
  font-size: 1.6rem;
  color: var(--text);
  font-weight: 700;
}

.square p {
  margin: 0;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.5;
}

.square a {
  margin-top: 16px;
  display: inline-block;
  background: var(--accent);
  color: #0b1205;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  align-self: flex-start;
  transition: opacity 0.2s ease;
}

.square a:hover {
  opacity: 0.85;
}
</style>
