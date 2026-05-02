<template>
  <div class="terms-container">
    <h1>Terms of Service &amp; Privacy Policy</h1>
    <p class="last-updated">Last updated: April 14, 2026</p>

    <section>
      <h2>1. About SoulTrack</h2>
      <p>
        SoulTrack is a peer-to-peer sneaker resale marketplace that connects buyers and sellers.
        We are a platform provider — we do not own, inspect, or ship any items listed on the site.
        All transactions are between individual users.
      </p>
    </section>

    <section>
      <h2>2. Eligibility</h2>
      <p>
        You must be at least <strong>13 years old</strong> to create an account. Users under 18
        must have parental or guardian consent. By registering, you confirm that you meet these
        requirements.
      </p>
    </section>

    <section>
      <h2>3. Accounts &amp; Registration</h2>
      <ul>
        <li>You are responsible for keeping your account credentials secure.</li>
        <li>You may not share your account or use someone else's account.</li>
        <li>You agree to provide accurate information during registration.</li>
        <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
      </ul>
    </section>

    <section>
      <h2>4. Listing &amp; Selling</h2>
      <ul>
        <li>All listings must accurately describe the item's condition and authenticity.</li>
        <li>Counterfeit, replica, or misrepresented items are strictly prohibited.</li>
        <li>Sellers are solely responsible for fulfilling orders once accepted.</li>
        <li>Listings become publicly visible when posted, subject to platform policy enforcement.</li>
        <li>SoulTrack reserves the right to remove any listing at our discretion.</li>
      </ul>
    </section>

    <section>
      <h2>5. Buying</h2>
      <ul>
        <li>All sales are final unless the item is materially misrepresented.</li>
        <li>By placing an order you agree to pay the listed price.</li>
        <li>Payment processing is handled by third-party providers; SoulTrack does not store
            payment card data.</li>
      </ul>
    </section>

    <section>
      <h2>6. Prohibited Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>List counterfeit, stolen, or illegal goods.</li>
        <li>Harass, threaten, or defraud other users.</li>
        <li>Attempt to manipulate prices, reviews, or listings.</li>
        <li>Use automated bots or scrapers on the platform.</li>
        <li>Circumvent or tamper with authentication or access controls.</li>
      </ul>
    </section>

    <section>
      <h2>7. Privacy Policy</h2>

      <h3>7.1 Information We Collect</h3>
      <ul>
        <li><strong>Account data</strong> — name, email address, authentication provider (Google or email/password).</li>
        <li><strong>Listing data</strong> — product names, descriptions, prices, and images you upload.</li>
        <li><strong>Order data</strong> — items purchased, transaction amounts, and order status.</li>
        <li><strong>Usage data</strong> — page views and interactions collected through Firebase Analytics (if enabled).</li>
      </ul>

      <h3>7.2 How We Use Your Information</h3>
      <ul>
        <li>To operate the marketplace and process orders.</li>
        <li>To communicate order updates and account notifications.</li>
        <li>To enforce our Terms of Service and detect fraud.</li>
        <li>We do <strong>not</strong> sell your personal data to third parties.</li>
      </ul>

      <h3>7.3 Data Storage &amp; Security</h3>
      <p>
        All data is stored in Google Firebase (Firestore &amp; Firebase Auth), which provides
        encryption at rest and in transit. Access is controlled by Firestore security rules that
        restrict data to authenticated owners.
      </p>

      <h3>7.4 Cookies &amp; Local Storage</h3>
      <p>
        We use browser <code>localStorage</code> solely to persist demo-mode preferences and
        session state. No third-party tracking cookies are set by SoulTrack.
      </p>

      <h3>7.5 Children's Privacy (COPPA)</h3>
      <p>
        SoulTrack does not knowingly collect personal information from children under 13. If you
        believe a child under 13 has created an account, contact us and we will delete the data
        promptly.
      </p>

      <h3>7.6 Your Rights</h3>
      <p>
        You may request deletion of your account and associated data at any time by contacting us.
        California residents have additional rights under CCPA, including the right to know what
        data is collected and the right to deletion.
      </p>
    </section>

    <section>
      <h2>8. Intellectual Property</h2>
      <p>
        Brand names, logos, and trademarks displayed on listed items belong to their respective
        owners. SoulTrack does not claim ownership of sneaker brand assets. User-uploaded content
        remains your property; by uploading you grant SoulTrack a limited license to display it
        on the platform.
      </p>
    </section>

    <section>
      <h2>9. Limitation of Liability</h2>
      <p>
        SoulTrack is provided "as is." We are not liable for disputes between buyers and sellers,
        item authenticity, shipping issues, or any indirect damages arising from use of the
        platform. Our total liability is limited to the amount paid in fees, if any.
      </p>
    </section>

    <section>
      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these terms at any time. Continued use of the platform after changes
        constitutes acceptance. We will post the updated date at the top of this page.
      </p>
    </section>

    <section>
      <h2>11. Contact</h2>
      <p>
        For questions about these terms or to submit a data deletion request, open an issue on
        our GitHub repository or contact the project maintainer directly.
      </p>
    </section>
  </div>
</template>

<style scoped>
.terms-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 16px 80px;
  color: var(--text);
}

h1 {
  font-size: 1.6rem;
  margin-bottom: 4px;
}

.last-updated {
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 32px;
}

section {
  margin-bottom: 32px;
}

h2 {
  font-size: 1.1rem;
  color: var(--accent);
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.12);
  padding-bottom: 6px;
}

h3 {
  font-size: 0.95rem;
  color: var(--text);
  margin: 14px 0 6px;
}

p {
  color: var(--muted);
  line-height: 1.7;
  margin-bottom: 10px;
  font-size: 0.92rem;
}

ul {
  padding-left: 20px;
  margin: 0 0 10px;
}

li {
  color: var(--muted);
  line-height: 1.7;
  font-size: 0.92rem;
  margin-bottom: 4px;
}

code {
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.85rem;
  color: var(--accent);
}

strong {
  color: var(--text);
}
</style>
