<script setup lang="ts">
const items = [
  { name: 'AIR JORDAN 1 CHICAGO', price: '$289' },
  { name: 'NIKE DUNK LOW PANDA', price: '$145' },
  { name: 'YEEZY BOOST 350 V2 ZEBRA', price: '$320' },
  { name: 'JORDAN 4 MILITARY BLUE', price: '$410' },
  { name: 'NIKE AIR MAX 90 INFRARED', price: '$110' },
  { name: 'NEW BALANCE 550 WHITE/GREEN', price: '$130' },
  { name: 'AIR JORDAN 3 FIRE RED', price: '$375' },
  { name: 'NIKE SB DUNK LIMITED', price: '$850' },
  { name: 'FORUM LOW × BAD BUNNY', price: '$290' },
]
</script>

<template>
  <div class="ticker-wrap" aria-hidden="true">
    <div class="ticker-track">
      <!-- Triplicated so the loop is always seamless regardless of viewport width -->
      <span class="ticker-set" v-for="n in 3" :key="n">
        <span v-for="item in items" :key="`${n}-${item.name}`" class="ticker-item">
          <span class="ticker-name">{{ item.name }}</span>
          <span class="ticker-price">{{ item.price }}</span>
          <span class="ticker-sep" aria-hidden="true">◆</span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.ticker-wrap {
  overflow: hidden;
  background: var(--accent);
  padding: 11px 0;
  position: relative;
  z-index: 10;
}

/* Fade edges for a premium feel */
.ticker-wrap::before,
.ticker-wrap::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 80px;
  z-index: 2;
  pointer-events: none;
}
.ticker-wrap::before {
  left: 0;
  background: linear-gradient(to right, var(--accent), transparent);
}
.ticker-wrap::after {
  right: 0;
  background: linear-gradient(to left, var(--accent), transparent);
}

.ticker-track {
  display: flex;
  width: max-content;
  /* 33.333% = one full set; animating by that amount creates seamless loop */
  animation: soletrack-ticker 50s linear infinite;
}

.ticker-wrap:hover .ticker-track {
  animation-play-state: paused;
}

.ticker-set {
  display: flex;
  flex-shrink: 0;
}

.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  white-space: nowrap;
}

.ticker-name {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #0b1205;
}

.ticker-price {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(11, 18, 5, 0.65);
}

.ticker-sep {
  font-size: 0.5rem;
  color: rgba(11, 18, 5, 0.4);
}

@keyframes soletrack-ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-33.333%); }
}

@media (prefers-reduced-motion: reduce) {
  .ticker-track { animation: none; }
}
</style>
