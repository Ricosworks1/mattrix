import { config } from 'dotenv'

console.log('🔍 Debug: Before loading .env.mattrix')
console.log('DATABASE_URL before:', process.env.DATABASE_URL)

// Load environment - Production Mattrix CRM Bot
if (process.env.NODE_ENV === 'production') {
  config({ path: '.env.production' })
  console.log('📍 Loaded .env.production')
} else {
  config({ path: '.env.mattrix' })
  console.log('📍 Loaded .env.mattrix')
}

console.log('DATABASE_URL after:', process.env.DATABASE_URL?.substring(0, 50) + '...')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set')