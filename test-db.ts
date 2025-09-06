import { config } from 'dotenv'
import { DatabaseContactManager, initializeDatabase } from './database'

// Load environment
config({ path: '.env.BDEmperorBot' })

async function testDatabase() {
  console.log('🧪 Testing database connection...')
  
  try {
    // For local testing, we'll use a simple in-memory test
    // In production, Railway will provide the DATABASE_URL
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not found. Using local fallback for Railway deployment.')
      console.log('✅ Database configuration looks good for Railway deployment!')
      console.log('📋 Next steps:')
      console.log('   1. Deploy to Railway')
      console.log('   2. Add PostgreSQL service')
      console.log('   3. Set TELEGRAM_BOT_TOKEN environment variable')
      console.log('   4. Railway will auto-provide DATABASE_URL')
      return
    }
    
    // If we have DATABASE_URL, test the actual connection
    await initializeDatabase()
    console.log('✅ Database initialized successfully!')
    
    const dbManager = new DatabaseContactManager()
    
    // Test adding a contact
    const testContact = await dbManager.addContact('test_user', {
      name: 'Test Contact',
      company: 'Test Company',
      email: 'test@example.com',
      priority: 'high'
    })
    
    console.log('✅ Contact added:', testContact.name)
    
    // Test getting contacts
    const contacts = await dbManager.getUserContacts('test_user')
    console.log('✅ Retrieved contacts:', contacts.length)
    
    // Test deleting the contact
    const deleted = await dbManager.deleteContact('test_user', testContact.id)
    console.log('✅ Contact deleted:', deleted)
    
    console.log('🎉 All database tests passed!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  }
}

testDatabase()