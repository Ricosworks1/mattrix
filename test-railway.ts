import { config } from 'dotenv'
import { Pool } from 'pg'

// Load environment
config({ path: '.env.mattrix' })

console.log('🧪 Testing Railway Database Connection...')
console.log('📍 DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

async function testConnection() {
  try {
    const client = await pool.connect()
    console.log('✅ Connected to Railway database!')
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as time, version() as version')
    console.log('🕐 Database time:', result.rows[0].time)
    console.log('📊 Database version:', result.rows[0].version.substring(0, 50) + '...')
    
    client.release()
    console.log('🎉 Railway database connection test successful!')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await pool.end()
  }
}

testConnection()