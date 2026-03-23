<template>
  <div class="notfound-page">
    <div class="notfound-grid"></div>
    <div class="notfound-content">
      <h1 class="notfound-code">404</h1>
      <h2 class="notfound-title">Page Not Found</h2>
      <p class="notfound-sub">Looks like this page dropped and someone already copped it.</p>
      <div class="notfound-actions">
        <router-link class="btn primary" to="/">Back to Home</router-link>
        <router-link class="btn" to="/browse">Browse Products</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notfound-page {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  text-align: center;
  padding: 40px 24px;
}
.notfound-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(100, 200, 100, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(100, 200, 100, 0.06) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, #000 50%, transparent 100%);
}
.notfound-content { position: relative; z-index: 1; }
.notfound-code {
  font-size: clamp(6rem, 20vw, 12rem);
  font-weight: 900;
  margin: 0;
  line-height: 1;
  background: linear-gradient(135deg, var(--accent), var(--text));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.04em;
}
.notfound-title { font-size: clamp(1.2rem, 3vw, 1.8rem); margin: 8px 0 12px; color: var(--text); font-weight: 700; }
.notfound-sub { color: var(--muted); margin: 0 0 32px; font-size: 1rem; }
.notfound-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn {
  display: inline-flex; align-items: center; padding: 10px 20px;
  border-radius: 10px; border: 1px solid var(--border);
  background: transparent; color: var(--text);
  font-weight: 600; font-size: 0.95rem; text-decoration: none; transition: opacity 0.2s;
}
.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }
.btn:hover { opacity: 0.85; }
</style>
