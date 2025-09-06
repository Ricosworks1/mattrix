import { Pool } from 'pg'

async function testConnection() {
  console.log('🔍 Testing PostgreSQL connection...')
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
  console.log('NODE_ENV:', process.env.NODE_ENV)
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set')
    process.exit(1)
  }
  
  // Log the URL format (without credentials)
  const url = process.env.DATABASE_URL
  const urlWithoutCredentials = url.replace(/:\/\/[^@]+@/, '://***:***@')
  console.log('Database URL format:', urlWithoutCredentials)
  
  const poolConfig: any = {
    connectionString: process.env.DATABASE_URL,
    max: 1, // Just one connection for testing
    connectionTimeoutMillis: 15000,
  }
  
  if (process.env.NODE_ENV === 'production') {
    poolConfig.ssl = {
      rejectUnauthorized: false
    }
  }
  
  const pool = new Pool(poolConfig)
  
  try {
    console.log('⏳ Attempting to connect...')
    const client = await pool.connect()
    console.log('✅ Connection successful!')
    
    const result = await client.query('SELECT NOW()')
    console.log('✅ Query successful:', result.rows[0])
    
    client.release()
    console.log('✅ Connection test passed!')
  } catch (error) {
    console.error('❌ Connection failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

testConnection()