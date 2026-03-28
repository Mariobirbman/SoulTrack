import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'

const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'soultrack',
  password: 'Gsu2026',
  port: 5432,
})

//API endpoints for fetching data from database 
app.get('/api/revenue', async (req, res) => {
  console.log('Received request for total revenue')
  try{
    const result = await pool.query(
      'SELECT SUM(revenue) AS total_revenue FROM sales'
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.get('/api/models', async (req, res) => {
  
  try {
    const result = await pool.query(
      'SELECT DISTINCT brand FROM shoes order by brand'
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.get('/api/demographic', async (req, res) => {
  console.log('Query params:', req.query)
  const {model_name } = req.query
  try{ 
    let query = 
      'SELECT s.demographic, SUM(sa.revenue) as total_revenue ' +
      'FROM shoes s ' +  
      'JOIN shoe_variants sv ON sv.shoe_id = s.id ' +
      'JOIN sales sa ON sa.variant_id = sv.id ' +
      'WHERE 1=1 '

      const param = [] 
      if (model_name){
        query += ' AND s.model_name = $1'
        param.push(model_name)
      }
      query += ' GROUP BY s.demographic'

    console.log('Query:', query)
    console.log('Params:', param)
    
    const result = await pool.query(query, param)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})
app.listen(3000, () => {
  console.log('Server running on port 3000')
})