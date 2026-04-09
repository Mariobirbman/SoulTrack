<script setup lang="ts">
import { computed } from 'vue'
import { demoMode, firebaseConfigured } from '@/lib/firebase'

const show = computed(() => !firebaseConfigured)
</script>

<template>
  <div v-if="show" class="banner" role="status">
    <template v-if="demoMode">
      <strong>Demo mode enabled.</strong>
      Your account/vendor data is stored only in this browser.
    </template>
    <template v-else>
      <strong>Firebase not configured.</strong>
      Add <code>soletrack/.env.local</code> to enable login + database.
      <span class="sep">•</span>
      See <code>docs/firebase-setup.md</code>.
    </template>
  </div>
</template>

<style scoped>
.banner {
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 10px 16px;
  background: rgba(255, 200, 0, 0.08);
  border-bottom: 1px solid rgba(255, 200, 0, 0.18);
  color: var(--text);
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.sep { margin: 0 8px; color: rgba(255,255,255,0.35); }
</style>
