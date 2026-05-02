<script setup lang="ts">
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
  <section class="gallery-section">
    <div class="container gallery-intro">
      <div class="gallery-copy">
        <h2>The marketplace at a glance.</h2>
        <p>
          Explore listings, spot price movement, and connect with vetted vendors without
          losing the thread of the homepage.
        </p>
      </div>

      <div class="gallery-actions">
        <router-link to="/browse" class="gallery-link gallery-link--primary">Browse products</router-link>
        <router-link to="/analytics" class="gallery-link">View analytics</router-link>
      </div>
    </div>

    <div class="container gallery-cards">
      <article class="square">
        <div class="square__icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        <div class="square__stat">30K+ Orders</div>
        <h3>Track sales</h3>
        <p>Follow price movement, compare margins, and keep a clean view of what is moving.</p>
        <router-link to="/analytics">Open analytics</router-link>
      </article>

      <article class="square">
        <div class="square__icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        </div>
        <div class="square__stat">9 Brands</div>
        <h3>Find products</h3>
        <p>Search current listings from verified vendors and jump straight to the pairs that matter.</p>
        <router-link to="/browse">Browse now</router-link>
      </article>

      <article class="square">
        <div class="square__icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div class="square__stat">6 Verified</div>
        <h3>Meet vendors</h3>
        <p>See who is listing, where they are based, and how to move into the next step quickly.</p>
        <router-link to="/vendors">View vendors</router-link>
      </article>
    </div>

    <div class="container gallery-grid">
      <div class="gallery-col">
        <figure v-for="(src, i) in leftImages" :key="`left-${i}`" class="gallery-figure">
          <img :src="src" alt="SoleTrack listing preview" class="gallery-img" />
        </figure>
      </div>

      <div class="gallery-col gallery-col--featured">
        <figure v-for="(src, i) in middleImages" :key="`middle-${i}`" class="gallery-figure gallery-figure--featured">
          <img :src="src" alt="SoleTrack marketplace feature preview" class="gallery-img" />
        </figure>
      </div>

      <div class="gallery-col">
        <figure v-for="(src, i) in rightImages" :key="`right-${i}`" class="gallery-figure">
          <img :src="src" alt="SoleTrack vendor preview" class="gallery-img" />
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gallery-section {
  background: var(--bg);
  color: var(--text);
  padding: 28px 0 88px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.07);
}

.gallery-intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.gallery-copy {
  max-width: 560px;
}

.gallery-copy h2 {
  margin: 0 0 10px;
  font-size: clamp(1.9rem, 4vw, 3rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.gallery-copy p {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
  font-size: 0.98rem;
  max-width: 48ch;
}

.gallery-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.gallery-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  color: var(--text);
  background: rgba(var(--accent-rgb), 0.04);
  font-weight: 700;
  text-decoration: none;
}

.gallery-link:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.34);
}

.gallery-link--primary {
  color: #0b1205;
  background: var(--accent);
  border-color: transparent;
}

.gallery-link--primary:hover {
  opacity: 0.9;
}

.gallery-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 22px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.gallery-col {
  display: grid;
  gap: 10px;
}

.gallery-col--featured {
  align-self: start;
}

.gallery-figure {
  width: 100%;
  margin: 0;
}

.gallery-img {
  width: 100%;
  max-width: 100%;
  height: 24rem;
  object-fit: cover;
  object-position: center;
  border-radius: 12px;
  display: block;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.gallery-figure--featured .gallery-img {
  height: 31rem;
}

.square {
  min-width: 0;
  background: rgba(13, 22, 16, 0.88);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 12px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.square__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
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

.square__stat {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.85;
}

.square h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.square p {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.65;
  flex: 1;
}

.square a {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 8px;
  align-self: flex-start;
}

.square a:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.5);
}

@media (max-width: 960px) {
  .gallery-intro {
    flex-direction: column;
    align-items: start;
  }

  .gallery-actions {
    justify-content: flex-start;
  }

  .gallery-cards,
  .gallery-grid {
    grid-template-columns: 1fr;
  }

  .gallery-col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .gallery-figure--featured .gallery-img,
  .gallery-img {
    height: 16rem;
  }
}

@media (max-width: 640px) {
  .gallery-section {
    padding: 10px 0 56px;
  }

  .gallery-copy h2 {
    font-size: 1.8rem;
  }

  .gallery-copy p {
    font-size: 0.92rem;
  }

  .gallery-actions {
    flex-direction: column;
    width: 100%;
  }

  .gallery-col {
    grid-template-columns: 1fr;
  }

  .gallery-link,
  .square a {
    width: 100%;
  }

  .gallery-cards {
    gap: 14px;
  }

  .square {
    padding: 18px;
  }
}
</style>
