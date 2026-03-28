<template>
  <div class="dashboard-page">
    <div class="dashboard-body">

      <!-- Stats Bar -->
      <div class="vendor-stats-row">
        <div class="vstat">
          <span class="vstat-value">${{ totalRevenue }}</span>
          <span class="vstat-label">Total Revenue</span>
        </div>
        <div class="vstat">
          <span class="vstat-value">{{ totalUnitsSold.toLocaleString() }}</span>
          <span class="vstat-label">Units Sold</span>
        </div>
        <div class="vstat">
          <span class="vstat-value">{{ avgRating }}</span>
          <span class="vstat-label">Avg Rating</span>
        </div>
        <div class="vstat">
          <span class="vstat-value">{{ totalOrders.toLocaleString() }}</span>
          <span class="vstat-label">Total Orders</span>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">

        <!-- Pie Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h2>Sales by Demographic</h2>
            <select v-model="selectedBrand" @change="fetchDemographic" class="filter-select">
              <option value="">All Brands</option>
              <option v-for="b in brands" :key="b.brand" :value="b.brand">{{ b.brand }}</option>
            </select>
          </div>
          <div class="chart-wrapper">
            <Pie :data="pieData" :options="pieOptions" />
          </div>
        </div>

        <!-- Revenue Over Time Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <h2>Revenue Over Time</h2>
            <div style="display: flex; gap: 10px;">
              <select v-model="selectedYear" @change="fetchYearlySales" class="filter-select">
                <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
              </select>
              <select v-model="selectedBrandYearly" @change="fetchYearlySales" class="filter-select">
                <option value="">All Brands</option>
                <option v-for="b in brands" :key="b.brand" :value="b.brand">{{ b.brand }}</option>
              </select>
            </div>
          </div>
          <div class="chart-wrapper">
            <Line :data="yearlyData" :options="lineOptions" />
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import { Pie, Line } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale)

export default {
  components: { Pie, Line },
  data() {
    return {
      totalRevenue: 0,
      totalUnitsSold: 0,
      avgRating: 0,
      totalOrders: 0,
      brands: [],
      selectedBrand: '',
      selectedBrandYearly: '',
      pieData: {
        labels: [],
        datasets: [{ data: [], backgroundColor: ['#9CFF00', '#36A2EB', '#FFCE56'] }]
      },
      pieOptions: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#c8e6c4' } }
        }
      },
      yearlyData: {
        labels: [],
        datasets: [{
          label: 'Revenue',
          data: [],
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      lineOptions: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#c8e6c4' } }
        },
        scales: {
          x: { ticks: { color: '#6b8f6b' }, grid: { color: 'rgba(100,200,100,0.08)' } },
          y: { ticks: { color: '#6b8f6b' }, grid: { color: 'rgba(100,200,100,0.08)' } }
        }
      }, 

    selectedYear: '2024',
    years: ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'],
    }
  },
  async mounted() {
    const rev = await fetch('http://localhost:3000/api/revenue')
    const revData = await rev.json()
    this.totalRevenue = parseFloat(revData.total_revenue).toLocaleString()

    const stats = await fetch('http://localhost:3000/api/stats')
    const statsData = await stats.json()
    this.totalUnitsSold = parseInt(statsData.total_units_sold)
    this.avgRating = parseFloat(statsData.average_rating).toFixed(1) + '★'
    this.totalOrders = parseInt(statsData.total_orders)

    const brandsRes = await fetch('http://localhost:3000/api/brands')
    this.brands = await brandsRes.json()

    await this.fetchDemographic()
    await this.fetchYearlySales()
  },
  methods: {
    async fetchDemographic() {
      const url = this.selectedBrand
        ? `http://localhost:3000/api/demographic?brand=${this.selectedBrand}`
        : 'http://localhost:3000/api/demographic'
      const dem = await fetch(url)
      const demData = await dem.json()
      this.pieData = {
        labels: demData.map(d => d.demographic),
        datasets: [{
          data: demData.map(d => parseFloat(d.total_revenue)),
          backgroundColor: ['#9CFF00', '#36A2EB', '#FFCE56']
        }]
      }
    },
    async fetchYearlySales() {
      const params = new URLSearchParams()
      if (this.selectedBrandYearly) params.append('brand', this.selectedBrandYearly)
      if (this.selectedYear) params.append('year', this.selectedYear)

      const res = await fetch(`http://localhost:3000/api/sales-over-time?${params}`)
      const data = await res.json()

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

      this.yearlyData = {
        labels: data.map(d => monthNames[parseInt(d.month) - 1]),
        datasets: [{
          label: 'Revenue',
          data: data.map(d => parseFloat(d.total_revenue)),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
          fill: true
        }]
      }
    }
  }
}
</script>

<style scoped>
.dashboard-page { background: var(--bg); }

.dashboard-body {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.vendor-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 36px;
}

.vstat {
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.05) 0%, var(--card) 60%);
  border: 1px solid rgba(156, 255, 0, 0.15);
  border-top: 2px solid var(--accent);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.vstat-value { font-size: 1.6rem; font-weight: 700; color: var(--accent); }
.vstat-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }

.charts-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
  align-items: start;
}

.chart-card {
  background: linear-gradient(160deg, rgba(156, 255, 0, 0.04) 0%, var(--card) 60%);
  border: 1px solid rgba(156, 255, 0, 0.15);
  border-radius: 16px;
  padding: 24px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.chart-header h2 {
  margin: 0;
  color: var(--text);
  font-size: 1.1rem;
}

.filter-select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 0.9rem;
  cursor: pointer;
}

.chart-wrapper {
  max-width: 100%;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>