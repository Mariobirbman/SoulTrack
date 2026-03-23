<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import StickyScrollGallery from '@/components/StickyScrollGallery.vue'

const images = [
  '/src/assets/Hero Image.png',
  '/src/assets/HeroImage2newusethis.png',
]

const currentIndex = ref(0)
const fading = ref(false)

const heroStyle = computed(() => ({
  backgroundImage: `url('${images[currentIndex.value]}')`,
  opacity: fading.value ? '0' : '1',
}))

let timer: ReturnType<typeof setInterval>
onMounted(() => {
  timer = setInterval(() => {
    fading.value = true
    setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % images.length
      fading.value = false
    }, 600)
  }, 4000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <section class="hero" :style="heroStyle">
    <div class="hero_Content container">
      <header class="homeHeader">
        <router-link class="homeHeader__link" to="/login">Login / Register</router-link>
      </header>

      <h1 class="homeTitle"><strong>SoleTrack</strong></h1>
      <p class="homeSubtitle">Track your sales, find products, and grow your side hustle.</p>

      <div class="homeCtas">
        <router-link class="btn primary" to="/login">Get started</router-link>
        <router-link class="btn" to="/browse">Browse products</router-link>
      </div>

      <form class="homeSearch" @submit.prevent>
        <label class="homeSearch__label" for="searchInput" >Search</label>
        <div class="homeSearch__row">
          <input id="searchInput" class="homeSearch__input" type="text" placeholder="Search..." />
          <button class="homeSearch__button primary" type="submit">Search</button>
        </div>
      </form>
    </div>
  </section>

  <StickyScrollGallery />
</template>

<style scoped>
.hero {
  min-height: 70vh;
  height: auto;
  padding: 56px 0 24px;
}

.hero_Content {
  width: 100%;
  gap: 14px;
}

.homeHeader {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.homeHeader__link {
  color: var(--text);
  text-decoration: none;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
}

.homeTitle {
  margin: 0;
  font-size: clamp(36px, 6vw, 56px);
  letter-spacing: -0.02em;
}

.homeSubtitle {
  margin: 0;
  color: var(--muted);
  text-align: center;
  max-width: 60ch;
}

.homeCtas {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  text-decoration: none;
  font-weight: 600;
}

.btn.primary {
  background: var(--accent);
  border-color: transparent;
  color: #0b1205;
}

.homeSearch {
  width: 100%;
  max-width: 560px;
  margin-top: 10px;
}

.homeSearch__label {
  display: block;
  margin-bottom: 6px;
  text-align: center;
}

.homeSearch__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.homeSearch__input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
}

.homeSearch__button {
  padding: 10px 14px;
  border-radius: 10px;
}

.homeBody {
  padding: 16px 16px 32px;
}

.homeFooter {
  margin-top: 18px;
}

/* Welcome section with animated circles background */
.welcomeSection {
  position: relative;
  overflow: hidden;
  background: var(--bg);
}

.circles {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
}

.circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(156, 255, 0, 0.12);
  animation: pulse 6s ease-in-out infinite;
}

.circle--1 {
  width: 200px;
  height: 200px;
  animation-delay: 0s;
  border-color: rgba(156, 255, 0, 0.25);
}

.circle--2 {
  width: 380px;
  height: 380px;
  animation-delay: 0.8s;
  border-color: rgba(156, 255, 0, 0.18);
}

.circle--3 {
  width: 560px;
  height: 560px;
  animation-delay: 1.6s;
  border-color: rgba(156, 255, 0, 0.12);
}

.circle--4 {
  width: 740px;
  height: 740px;
  animation-delay: 2.4s;
  border-color: rgba(156, 255, 0, 0.07);
}

.circle--5 {
  width: 920px;
  height: 920px;
  animation-delay: 3.2s;
  border-color: rgba(156, 255, 0, 0.04);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

/* Keep cards and title above the circles */
.welcomeTitle,
.welcomeContainer {
  position: relative;
  z-index: 1;
}

@media (max-width: 520px) {
  .homeSearch__row {
    grid-template-columns: 1fr;
  }
}
</style>
