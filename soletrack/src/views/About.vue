<template>
  <div class="about-page">

    <div class="about-hero">
      <div class="about-hero__grid"></div>
      <div class="about-hero__content">
        <h1 class="about-title">About <span class="accent">SoleTrack</span></h1>
        <p class="about-lead">Built for sneaker resellers who want more than a spreadsheet.</p>
      </div>
    </div>

    <div class="about-body">

      <div class="mission-section">
        <h2>Our Mission</h2>
        <p>
          SoleTrack was built for the sneaker community — the resellers, the collectors, and the
          side-hustlers who need one clean place to track their business. No more messy spreadsheets.
          No more forgetting what you paid. Just clear profit, clear data, and clear insights.
        </p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <span class="feature-icon">📊</span>
          <h3>Sales Tracking</h3>
          <p>Log every flip. See your buy price, sell price, profit, and platform all in one place.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">🛒</span>
          <h3>Product Browsing</h3>
          <p>Browse available kicks by brand, condition, and price. Watchlist the ones you want.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">🤝</span>
          <h3>Vendor Access</h3>
          <p>Connect with trusted vendors directly. Get the supply you need to keep flipping.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">💡</span>
          <h3>Profit Insights</h3>
          <p>Know exactly how much you've made, your best sale, and your total revenue at a glance.</p>
        </div>
      </div>

      <div class="cta-section">
        <h2>Ready to start?</h2>
        <p>Create a free account and log your first sale in under a minute.</p>
        <router-link class="btn primary" to="/login">Get started free</router-link>
      </div>

    </div>
  </div>
</template>

<style scoped>
.about-page { background: var(--bg); }

.about-hero {
  position: relative;
  min-height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px 60px;
  text-align: center;
}

.about-hero__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(100, 200, 100, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(100, 200, 100, 0.06) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%);
}

.about-hero__content { position: relative; z-index: 1; }

.about-title {
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  color: var(--text);
}

.accent { color: var(--accent); }

.about-lead {
  font-size: 1.1rem;
  color: var(--muted);
  margin: 0;
  max-width: 50ch;
}

.about-body {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.mission-section {
  margin-bottom: 56px;
  padding: 32px;
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.04) 0%, var(--card) 60%);
  border: 1px solid rgba(156, 255, 0, 0.15);
  border-left: 3px solid var(--accent);
  border-radius: 12px;
}

.mission-section h2 { margin: 0 0 12px; color: var(--text); }
.mission-section p { margin: 0; color: var(--muted); line-height: 1.7; font-size: 1rem; }

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 56px;
}

.feature-card {
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.05) 0%, var(--card) 60%);
  border: 1px solid rgba(156, 255, 0, 0.15);
  border-top: 2px solid var(--accent);
  border-radius: 16px;
  padding: 28px 24px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(156, 255, 0, 0.1);
}

.feature-icon { font-size: 2rem; display: block; margin-bottom: 12px; }

.feature-card h3 { margin: 0 0 8px; color: var(--text); font-size: 1rem; }
.feature-card p { margin: 0; color: var(--muted); font-size: 0.9rem; line-height: 1.5; }

.cta-section {
  text-align: center;
  padding: 48px 24px;
  border: 1px solid rgba(156, 255, 0, 0.15);
  border-radius: 16px;
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.05) 0%, var(--card) 60%);
}

.cta-section h2 { margin: 0 0 8px; color: var(--text); font-size: 1.6rem; }
.cta-section p { margin: 0 0 24px; color: var(--muted); }

.btn {
  display: inline-flex; align-items: center; padding: 12px 24px;
  border-radius: 10px; border: 1px solid var(--border);
  background: transparent; color: var(--text);
  font-weight: 600; font-size: 1rem; text-decoration: none;
  transition: opacity 0.2s;
}

.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }
.btn.primary:hover { opacity: 0.88; }
</style>
