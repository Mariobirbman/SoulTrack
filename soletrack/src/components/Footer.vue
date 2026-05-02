<template>
  <footer class="site-footer">
    <div class="footer-inner">

      <!-- Brand column -->
      <div class="footer-brand">
        <router-link to="/" class="footer-logo">
          <span class="footer-logo__name">SoleTrack</span>
        </router-link>
        <p class="footer-tagline">
          The sneaker resale platform built for flippers, collectors, and side-hustlers.
        </p>
        <p class="footer-copy">&copy; 2026 SoleTrack. All rights reserved.</p>
      </div>

      <!-- Marketplace links -->
      <nav class="footer-nav" aria-label="Marketplace">
        <p class="footer-nav__heading">Marketplace</p>
        <ul>
          <li><router-link to="/browse">Browse Products</router-link></li>
          <li><router-link to="/vendors">Trusted Vendors</router-link></li>
          <li><router-link to="/analytics">Shoe Catalog</router-link></li>
          <li><router-link to="/cart">Cart</router-link></li>
        </ul>
      </nav>

      <!-- Account links -->
      <nav class="footer-nav" aria-label="Account">
        <p class="footer-nav__heading">Account</p>
        <ul>
          <li><router-link to="/login">Login / Register</router-link></li>
          <li><router-link to="/account">My Account</router-link></li>
          <li><router-link to="/sell">Sell a Shoe</router-link></li>
          <li><router-link to="/orders">My Orders</router-link></li>
        </ul>
      </nav>

      <!-- Stats column -->
      <div class="footer-stats">
        <p class="footer-nav__heading">By the numbers</p>
        <div class="footer-stat-grid">
          <div class="footer-stat">
            <span class="footer-stat__value">30K+</span>
            <span class="footer-stat__label">Orders Tracked</span>
          </div>
          <div class="footer-stat">
            <span class="footer-stat__value">6</span>
            <span class="footer-stat__label">Verified Vendors</span>
          </div>
          <div class="footer-stat">
            <span class="footer-stat__value">9</span>
            <span class="footer-stat__label">Brands Listed</span>
          </div>
          <div class="footer-stat">
            <span class="footer-stat__value">Live</span>
            <span class="footer-stat__label">Firebase DB</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom strip -->
    <div class="footer-bottom">
      <span>Built for <strong>CSC 4370/6370</strong> · Spring 2026 · Georgia State University</span>
      <span class="footer-bottom__stack">Vue 3 · Firebase · Vite</span>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: #060f07;
  border-top: 1px solid rgba(var(--accent-rgb), 0.1);
  margin-top: 0;
}

.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 56px 24px 40px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  gap: 40px;
}

/* Brand */
.footer-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  margin-bottom: 14px;
}

.footer-logo__img {
  width: 34px;
  height: 34px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
}

.footer-logo__name {
  font-weight: 900;
  font-size: 1rem;
  color: var(--text);
  letter-spacing: -0.02em;
}

.footer-tagline {
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0 0 16px;
  max-width: 28ch;
}

.footer-copy {
  color: rgba(148, 160, 143, 0.5);
  font-size: 0.78rem;
  margin: 0;
}

/* Nav columns */
.footer-nav__heading {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 14px;
}

.footer-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-nav a {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.88rem;
  transition: color 0.2s;
}

.footer-nav a:hover {
  color: var(--text);
}

/* Stats */
.footer-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.footer-stat {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.footer-stat__value {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--accent);
  letter-spacing: -0.02em;
}

.footer-stat__label {
  font-size: 0.72rem;
  color: var(--muted);
}

/* Bottom strip */
.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding: 16px 24px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: rgba(148, 160, 143, 0.6);
}

.footer-bottom strong {
  color: rgba(148, 160, 143, 0.9);
  font-weight: 700;
}

.footer-bottom__stack {
  font-size: 0.72rem;
  color: rgba(148, 160, 143, 0.4);
  letter-spacing: 0.04em;
}

/* Responsive */
@media (max-width: 900px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  .footer-brand { grid-column: 1 / -1; }
}

@media (max-width: 560px) {
  .footer-inner {
    grid-template-columns: 1fr;
    padding: 40px 16px 32px;
  }
  .footer-bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
