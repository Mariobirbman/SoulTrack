<template>
  <div class="dashboard">
    <h1>SoulTrack Dashboard</h1>
    
    <!-- Total Revenue Card -->
    <div class="card">
      <h2>Total Revenue</h2>
      <p>${{ totalRevenue }}</p>
    </div>

    <!-- Demographic Pie Chart -->
    <div class="card">
      <h2>Sales by Demographic</h2>
      <Pie :data="pieData" />
    </div>

  </div>
</template>

<script>
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

export default {
  components: { Pie },
  data() {
    return {
      totalRevenue: 0,
      pieData: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
        }]
      }
    }
  },
  async mounted() {
    // Fetch total revenue
    const rev = await fetch('http://localhost:3000/api/revenue')
    const revData = await rev.json()
    this.totalRevenue = parseFloat(revData.total_revenue).toLocaleString()

    // Fetch demographic data
    const dem = await fetch('http://localhost:3000/api/demographic')
    const demData = await dem.json()
    this.pieData.labels = demData.map(d => d.demographic)
    this.pieData.datasets[0].data = demData.map(d => parseFloat(d.total_revenue))
  }
}
</script>