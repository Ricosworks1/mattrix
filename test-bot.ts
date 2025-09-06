import { config } from 'dotenv'
import { Bot, Context, InlineKeyboard } from 'grammy'

// Load environment
config({ path: '.env.mattrix' })

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

// Simple in-memory storage for testing
const contacts = new Map<string, any[]>()

// START command
bot.command('start', async (ctx) => {
  const welcome = `🌐 **Welcome to Mattrix!** (TEST MODE)

⚡ **Decentralized CRM Powered by Web3**

This is a test version running locally. All features work except database persistence.

**🚀 Quick Start:**
• /add - Add new contact with smart template
• /list - View all your contacts
• /search - Find specific contacts

Ready to test your networking game? Use /add to try it out! 🎲`

  await ctx.reply(welcome)
})

// Simple ADD command for testing
bot.command('add', async (ctx) => {
  const input = ctx.match as string
  const userId = ctx.from!.id.toString()

  if (!input?.trim()) {
    await ctx.reply(`📝 **Add New Contact - Test Mode**

Try: /add John Doe, Apple, john@apple.com

This will add a test contact to verify the bot is working!`)
    return
  }

  // Initialize user contacts if not exists
  if (!contacts.has(userId)) {
    contacts.set(userId, [])
  }

  const userContacts = contacts.get(userId)!
  
  // Simple parsing for testing
  const parts = input.split(',').map(p => p.trim())
  const contact = {
    id: Date.now().toString(),
    name: parts[0] || 'Unknown',
    company: parts[1] || '',
    email: parts[2] || '',
    createdAt: new Date()
  }

  userContacts.push(contact)

  await ctx.reply(`✅ **Test Contact Added!**

👤 **${contact.name}**
🏢 ${contact.company || 'No company'}
📧 ${contact.email || 'No email'}

✨ Bot is working! This contact is stored in memory only.`)
})

// LIST command
bot.command('list', async (ctx) => {
  const userId = ctx.from!.id.toString()
  const userContacts = contacts.get(userId) || []
  
  if (userContacts.length === 0) {
    await ctx.reply(`📭 **No test contacts yet!**
    
🚀 Add a test contact:
• /add John Doe, Apple, john@apple.com

Your test contacts will show here! 👑`)
    return
  }

  let response = `👥 **Your Test Contacts**\n\n📊 **Total:** ${userContacts.length}\n\n`
  
  userContacts.forEach((contact, i) => {
    response += `${i + 1}. 👤 **${contact.name}**\n`
    if (contact.company) response += `   🏢 ${contact.company}\n`
    if (contact.email) response += `   📧 ${contact.email}\n`
    response += '\n'
  })

  await ctx.reply(response)
})

// SEARCH command
bot.command('search', async (ctx) => {
  const query = ctx.match as string
  const userId = ctx.from!.id.toString()

  if (!query?.trim()) {
    await ctx.reply(`🔍 **Search Test Contacts**

**Usage:** /search [query]
**Example:** /search John`)
    return
  }

  const userContacts = contacts.get(userId) || []
  const results = userContacts.filter(contact => 
    contact.name.toLowerCase().includes(query.toLowerCase()) ||
    (contact.company && contact.company.toLowerCase().includes(query.toLowerCase())) ||
    (contact.email && contact.email.toLowerCase().includes(query.toLowerCase()))
  )

  if (results.length === 0) {
    await ctx.reply(`😔 **No matches found for "${query}"**`)
    return
  }

  let response = `🎯 **Found ${results.length} contact(s) for "${query}"**\n\n`

  results.forEach((contact, i) => {
    response += `${i + 1}. 👤 **${contact.name}**\n`
    if (contact.company) response += `   🏢 ${contact.company}\n`
    if (contact.email) response += `   📧 ${contact.email}\n`
    response += '\n'
  })

  await ctx.reply(response)
})

// Error handler
bot.catch((err) => {
  console.error('Bot error:', err)
})

// Start bot
console.log('🧪 Starting Mattrix Test Bot...')
console.log('🌐 Bot Token:', process.env.TELEGRAM_BOT_TOKEN ? 'Loaded' : 'Missing')

bot.start({
  onStart: (botInfo) => {
    console.log(`🚀 Mattrix Test Bot @${botInfo.username} is LIVE!`)
    console.log(`🧪 Running in TEST MODE - no database required`)
    console.log(`💬 Ready to test commands!`)
  }
})