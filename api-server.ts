import { config } from 'dotenv'
import express from 'express'
import cors from 'cors'
import { DatabaseContactManager, BaseBuilderManager, Contact, BaseBuilder } from './database'

// Load environment
if (process.env.NODE_ENV === 'production') {
  config({ path: '.env.production' })
} else {
  config({ path: '.env.mattrix' })
}

const app = express()
const port = process.env.API_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Initialize database managers
const contactManager = new DatabaseContactManager()
const baseBuilderManager = new BaseBuilderManager()

// Helper function to parse contact data (same as bot.ts)
function parseContactData(text: string): Partial<Contact> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  const contact: Partial<Contact> = {}

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim()
      const lowerKey = key.toLowerCase().trim()

      switch (lowerKey) {
        case 'name':
          contact.name = value
          break
        case 'position':
        case 'title':
        case 'job':
          contact.position = value
          break
        case 'company':
        case 'organization':
          contact.company = value
          break
        case 'email':
          contact.email = value
          break
        case 'phone':
        case 'mobile':
          contact.phone = value
          break
        case 'linkedin':
          contact.linkedin = value.startsWith('http') ? value : `https://linkedin.com/in/${value}`
          break
        case 'github':
          contact.github = value.startsWith('http') ? value : `https://github.com/${value}`
          break
        case 'telegram':
          contact.telegram = value.startsWith('@') ? value : `@${value}`
          break
        case 'lens':
          contact.lens = value.includes('.') ? value : `${value}.lens`
          break
        case 'farcaster':
          contact.farcaster = value.startsWith('@') ? value : `@${value}`
          break
        case 'ens':
          contact.ens = value.includes('.') ? value : `${value}.eth`
          break
        case 'location':
          contact.location = value
          break
        case 'goal':
          contact.goal = value
          break
        case 'notes':
          contact.notes = value
          break
        case 'tags':
          contact.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag)
          break
        case 'priority':
          if (['high', 'medium', 'low'].includes(value.toLowerCase())) {
            contact.priority = value.toLowerCase() as 'high' | 'medium' | 'low'
          }
          break
        case 'source':
          contact.source = value
          break
      }
    }
  }

  return contact
}

// API Routes

// GET /api/contacts - List all contacts for user
app.get('/api/contacts/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const contacts = await contactManager.getUserContacts(userId)
    res.json({ success: true, data: contacts })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch contacts' })
  }
})

// POST /api/contacts - Add new contact
app.post('/api/contacts', async (req, res) => {
  try {
    const { userId, contactData } = req.body
    
    // Parse contact data if it's a string template
    const parsedData = typeof contactData === 'string' 
      ? parseContactData(contactData) 
      : contactData

    // Validate required fields
    if (!parsedData.name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name is required' 
      })
    }

    // Set defaults
    if (!parsedData.priority) parsedData.priority = 'medium'

    const contact = await contactManager.addContact(userId, parsedData)
    res.json({ success: true, data: contact })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ success: false, error: 'Failed to add contact' })
  }
})

// GET /api/contacts/search/:userId - Search contacts
app.get('/api/contacts/search/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { q: query } = req.query
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter required' })
    }

    const contacts = await contactManager.searchContacts(userId, query as string)
    res.json({ success: true, data: contacts })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ success: false, error: 'Failed to search contacts' })
  }
})

// GET /api/stats/:userId - Get networking statistics
app.get('/api/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const contacts = await contactManager.getUserContacts(userId)
    
    const stats = {
      totalContacts: contacts.length,
      highPriority: contacts.filter(c => c.priority === 'high').length,
      mediumPriority: contacts.filter(c => c.priority === 'medium').length,
      lowPriority: contacts.filter(c => c.priority === 'low').length,
      withPhotos: contacts.filter(c => c.photoPath || c.photoFileId).length,
      companies: [...new Set(contacts.map(c => c.company).filter(Boolean))].length,
      locations: [...new Set(contacts.map(c => c.location).filter(Boolean))].length,
    }
    
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ success: false, error: 'Failed to get stats' })
  }
})

// POST /api/base-builders - Submit Base Builder form
app.post('/api/base-builders', async (req, res) => {
  try {
    const { userId, builderData } = req.body
    
    // Validate required fields
    const required = ['email', 'fullName', 'builderTypes', 'buildingOnBase', 'location', 'country']
    for (const field of required) {
      if (!builderData[field]) {
        return res.status(400).json({ 
          success: false, 
          error: `Missing required field: ${field}` 
        })
      }
    }

    // Check if user already submitted
    const existing = await baseBuilderManager.getBaseBuilderByUserId(userId)
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'Application already submitted',
        data: existing
      })
    }

    const builder = await baseBuilderManager.createBaseBuilder(userId, builderData)
    res.json({ success: true, data: builder })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ success: false, error: 'Failed to submit application' })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Mattrix API is running' })
})

// Start server
app.listen(port, () => {
  console.log(`🚀 Mattrix API server running on http://localhost:${port}`)
  console.log(`📋 Available endpoints:`)
  console.log(`  GET  /api/contacts/:userId - List contacts`)
  console.log(`  POST /api/contacts - Add contact`)
  console.log(`  GET  /api/contacts/search/:userId?q=query - Search contacts`)
  console.log(`  GET  /api/stats/:userId - Get statistics`)
  console.log(`  POST /api/base-builders - Submit Base Builder form`)
  console.log(`  GET  /api/health - Health check`)
})

export default app