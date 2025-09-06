import { config } from 'dotenv'
import { Bot, Context, InlineKeyboard, InputFile } from 'grammy'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Load environment - Mattrix CRM Bot
config({ path: '.env.mattrix' })

// Contact interface
export interface Contact {
  id: string
  userId: string
  name: string
  position?: string
  company?: string
  email?: string
  phone?: string
  linkedin?: string
  github?: string
  telegram?: string
  lens?: string
  farcaster?: string
  ens?: string
  location?: string
  goal?: string
  notes?: string
  tags?: string[]
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  source?: string
  // Selfie/Photo data
  photoPath?: string
  photoFileId?: string
  photoTakenAt?: Date
  hasFacialData?: boolean
}

// Simple in-memory contact manager for testing
class MattrixContactManager {
  private contacts: Map<string, Contact[]> = new Map()
  private dataFile: string = join(process.cwd(), 'mattrix_contacts.json')

  constructor() {
    this.loadContacts()
  }

  private loadContacts() {
    try {
      if (existsSync(this.dataFile)) {
        const data = JSON.parse(readFileSync(this.dataFile, 'utf-8'))
        this.contacts = new Map(Object.entries(data))
        console.log(`📂 Loaded ${this.getTotalContacts()} contacts from storage`)
      } else {
        console.log('📂 Creating new Mattrix storage file')
        this.saveContacts()
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
      this.contacts = new Map()
    }
  }

  private saveContacts() {
    try {
      const data = Object.fromEntries(this.contacts)
      writeFileSync(this.dataFile, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Error saving contacts:', error)
    }
  }

  private getTotalContacts(): number {
    let total = 0
    for (const userContacts of this.contacts.values()) {
      total += userContacts.length
    }
    return total
  }

  async addContact(contact: Contact): Promise<Contact> {
    const userContacts = this.contacts.get(contact.userId) || []
    userContacts.push(contact)
    this.contacts.set(contact.userId, userContacts)
    this.saveContacts()
    return contact
  }

  async getContacts(userId: string): Promise<Contact[]> {
    return this.contacts.get(userId) || []
  }

  async searchContacts(userId: string, query: string): Promise<Contact[]> {
    const userContacts = this.contacts.get(userId) || []
    const searchTerm = query.toLowerCase()
    
    return userContacts.filter(contact => 
      contact.name?.toLowerCase().includes(searchTerm) ||
      contact.company?.toLowerCase().includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm) ||
      contact.position?.toLowerCase().includes(searchTerm) ||
      contact.location?.toLowerCase().includes(searchTerm) ||
      contact.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }

  async deleteContact(userId: string, contactId: string): Promise<boolean> {
    const userContacts = this.contacts.get(userId) || []
    const filtered = userContacts.filter(c => c.id !== contactId)
    
    if (filtered.length < userContacts.length) {
      this.contacts.set(userId, filtered)
      this.saveContacts()
      return true
    }
    return false
  }

  async getStats(userId: string) {
    const userContacts = this.contacts.get(userId) || []
    const totalContacts = userContacts.length
    const priorities = { low: 0, medium: 0, high: 0 }
    const companies = new Set<string>()
    
    for (const contact of userContacts) {
      priorities[contact.priority]++
      if (contact.company) companies.add(contact.company)
    }
    
    return {
      totalContacts,
      priorities,
      uniqueCompanies: companies.size
    }
  }

  async addPhotoToContact(userId: string, contactId: string, photoData: {
    photoPath?: string,
    photoFileId?: string,
    photoTakenAt?: Date,
    hasFacialData?: boolean
  }): Promise<boolean> {
    const userContacts = this.contacts.get(userId) || []
    const index = userContacts.findIndex(c => c.id === contactId)
    
    if (index !== -1) {
      userContacts[index] = { 
        ...userContacts[index], 
        ...photoData,
        photoTakenAt: photoData.photoTakenAt || new Date()
      }
      this.contacts.set(userId, userContacts)
      this.saveContacts()
      return true
    }
    return false
  }

  async getContactsWithPhotos(userId: string): Promise<Contact[]> {
    const userContacts = this.contacts.get(userId) || []
    return userContacts.filter(contact => contact.photoPath || contact.photoFileId)
  }
}

// Initialize contact manager and bot
const contactManager = new MattrixContactManager()
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

// Helper function to parse contact data from template
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
          contact.github = value.startsWith('http') ? value : `https://github.com/${value.replace('@', '')}`
          break
        case 'telegram':
          contact.telegram = value.startsWith('@') ? value : `@${value}`
          break
        case 'lens':
          contact.lens = value
          break
        case 'farcaster':
          contact.farcaster = value.startsWith('@') ? value : `@${value}`
          break
        case 'ens':
          contact.ens = value
          break
        case 'location':
        case 'city':
          contact.location = value
          break
        case 'goal':
        case 'objective':
          contact.goal = value
          break
        case 'notes':
        case 'note':
          contact.notes = value
          break
        case 'tags':
        case 'tag':
          contact.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag)
          break
        case 'priority':
          if (['high', 'medium', 'low'].includes(value.toLowerCase())) {
            contact.priority = value.toLowerCase() as 'high' | 'medium' | 'low'
          }
          break
        case 'source':
        case 'event':
          contact.source = value
          break
      }
    }
  }

  return contact
}

// START command
bot.command('start', async (ctx) => {
  const welcome = `🌐 **Welcome to Mattrix CRM!**

⚡ **Decentralized CRM Powered by Web3**

Enter the Mattrix - where business connections transcend traditional boundaries! Mattrix helps you capture, organize, and leverage every contact you meet at conferences with decentralized storage.

**🚀 Quick Start:**
• /add - Add new contact with smart template
• /list - View all your contacts  
• /selfie [name] - Link conference selfie to contact
• /view [name] - See full profile with selfie
• /search - Find specific contacts
• /stats - Your networking analytics

**💼 Perfect for:**
✅ Conference networking
✅ Business development  
✅ Startup founders & VCs
✅ Sales professionals
✅ Anyone building connections

**🔥 Features:**
• Smart contact templates
• Priority-based organization
• Web3 social profiles (Lens, Farcaster, ENS)
• Conference selfie linking
• Advanced search & analytics

Ready to dominate your networking game? Use /add to capture your first contact! 🎯`

  const keyboard = new InlineKeyboard()
    .text('➕ Add Contact', 'add_prompt')
    .text('👥 View Contacts', 'list')
    .row()
    .text('📊 Statistics', 'stats')
    .text('📚 Guide', 'guide')

  await ctx.reply(welcome, { reply_markup: keyboard })
})

// ADD command with comprehensive template
bot.command('add', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    const template = `📝 **Add New Contact - Smart Template**

Copy and fill this template, then send "/add [your filled template]":

\`\`\`
Name: [Full Name] *required
Position: [Job Title]
Company: [Company Name]
Email: [email@domain.com]
Phone: [+country-number]
LinkedIn: [profile-url or username]
GitHub: [@username or profile-url]
Telegram: [@username]
Lens: [username.lens]
Farcaster: [@username]
ENS: [name.eth]
Location: [City, Country]
Goal: [What they want to achieve]
Notes: [Meeting context, interests, follow-up items]
Tags: [blockchain, startup, investor, etc.]
Priority: [high, medium, low]
Source: [Conference/event name]
\`\`\`

**📋 Example:**
\`\`\`
Name: Sarah Chen
Position: Head of Partnerships
Company: Ethereum Foundation
Email: sarah.chen@ethereum.org
Phone: +1-415-555-0123
LinkedIn: sarah-chen-eth
GitHub: @sarah-chen-dev
Telegram: @saraheth
Lens: sarahchen.lens
Farcaster: @saraheth
ENS: sarahchen.eth
Location: San Francisco, USA
Goal: Explore partnership opportunities for DeFi integration
Notes: Met at ETH Denver 2024, discussed layer 2 scaling solutions, very interested in our protocol
Tags: ethereum, partnerships, defi, scaling
Priority: high
Source: ETH Denver 2024
\`\`\`

**⚡ Quick Format:** /add Name, Company, Email
**📱 Instructions:**
1. Copy template above
2. Fill in what you know (Name is required, rest optional)
3. Type "/add" and paste your filled template
4. Hit send!

Your contact will be instantly organized and searchable! 🎯`

    await ctx.reply(template)
    return
  }

  try {
    // Quick format: Name, Company, Email
    if (input.includes(',') && !input.includes(':')) {
      const parts = input.split(',').map(p => p.trim())
      const contact: Contact = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: ctx.from!.id.toString(),
        name: parts[0] || 'Unknown',
        company: parts[1] || undefined,
        email: parts[2] || undefined,
        priority: 'medium',
        createdAt: new Date(),
        source: 'Mattrix CRM Bot'
      }

      await contactManager.addContact(contact)
      
      await ctx.reply(`✅ **Quick Contact Added!**

👤 **${contact.name}**
🏢 ${contact.company || 'No company'}
📧 ${contact.email || 'No email'}

Use /view ${contact.name} to see details or /selfie ${contact.name} to add a photo!`)
      return
    }

    // Simple name format
    if (!input.includes(':') && !input.includes(',')) {
      const contact: Contact = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: ctx.from!.id.toString(),
        name: input.trim(),
        priority: 'medium',
        createdAt: new Date(),
        source: 'Mattrix CRM Bot'
      }

      await contactManager.addContact(contact)
      
      await ctx.reply(`✅ **Contact Added!**

👤 **${contact.name}**
Priority: ${contact.priority}

Use /view ${contact.name} to see details or add more info with the full template!`)
      return
    }

    // Template format
    const contactData = parseContactData(input)
    
    if (!contactData.name) {
      await ctx.reply('❌ Name is required! Please include "Name: [Full Name]" in your template.')
      return
    }

    const contact: Contact = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: ctx.from!.id.toString(),
      ...contactData,
      name: contactData.name,
      priority: contactData.priority || 'medium',
      createdAt: new Date(),
      source: contactData.source || 'Mattrix CRM Bot'
    }

    await contactManager.addContact(contact)
    
    const priorityEmoji = contact.priority === 'high' ? '🔥' : contact.priority === 'medium' ? '⚡' : '📝'
    
    let response = `🎉 **Contact Added Successfully!**

${priorityEmoji} **${contact.name}**`

    if (contact.position || contact.company) {
      response += `\n💼 ${contact.position || ''}${contact.position && contact.company ? ' at ' : ''}${contact.company || ''}`
    }
    if (contact.email) response += `\n📧 ${contact.email}`
    if (contact.phone) response += `\n📱 ${contact.phone}`
    if (contact.linkedin) response += `\n🔗 LinkedIn`
    if (contact.github) response += `\n💻 GitHub`
    if (contact.telegram) response += `\n💬 ${contact.telegram}`
    if (contact.lens) response += `\n🌿 ${contact.lens}`
    if (contact.farcaster) response += `\n🟣 ${contact.farcaster}`
    if (contact.ens) response += `\n🔷 ${contact.ens}`
    if (contact.location) response += `\n📍 ${contact.location}`
    if (contact.goal) response += `\n🎯 ${contact.goal}`
    if (contact.notes) response += `\n📝 ${contact.notes}`
    if (contact.source) response += `\n🎪 ${contact.source}`
    
    if (contact.tags && contact.tags.length > 0) {
      response += `\n🏷️ ${contact.tags.join(', ')}`
    }

    await ctx.reply(response)

  } catch (error) {
    console.error('Add contact error:', error)
    await ctx.reply('❌ Error adding contact. Please check your format and try again.')
  }
})

// LIST command  
bot.command('list', async (ctx) => {
  try {
    const contacts = await contactManager.getContacts(ctx.from!.id.toString())
    
    if (contacts.length === 0) {
      await ctx.reply(`📭 **No contacts yet!**
    
🚀 Start building your network:
• /add - Add your first contact
• Use /guide for step-by-step help

Your networking empire starts here! 👑`)
      return
    }

    // Sort contacts by priority then by creation date
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const sortedContacts = contacts.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    let response = `👥 **Your Mattrix Network**\n\n📊 **Total Contacts:** ${contacts.length}\n\n`
    
    // Show detailed contact list
    sortedContacts.slice(0, 10).forEach((contact, i) => {
      const priorityEmoji = contact.priority === 'high' ? '🔥' : contact.priority === 'medium' ? '⚡' : '📝'
      const hasPhoto = contact.photoFileId ? '📸' : ''
      response += `${i + 1}. ${priorityEmoji}${hasPhoto} **${contact.name}**\n`
      
      if (contact.position || contact.company) {
        response += `   💼 ${contact.position || ''}${contact.position && contact.company ? ' at ' : ''}${contact.company || ''}\n`
      }
      
      // Show key contact info
      if (contact.email) response += `   📧 ${contact.email}\n`
      if (contact.phone) response += `   📱 ${contact.phone}\n`
      if (contact.linkedin) response += `   🔗 LinkedIn\n`
      if (contact.github) response += `   💻 GitHub\n`
      if (contact.telegram) response += `   💬 ${contact.telegram}\n`
      if (contact.location) response += `   📍 ${contact.location}\n`
      if (contact.source) response += `   🎪 ${contact.source}\n`
      if (contact.photoFileId) response += `   🤳 Conference selfie\n`
      
      response += '\n'
    })

    if (contacts.length > 10) {
      response += `📋 **Showing first 10 contacts**\n... and ${contacts.length - 10} more!\n\nUse /search to find specific contacts.`
    }

    // Priority breakdown
    const highCount = contacts.filter(c => c.priority === 'high').length
    const mediumCount = contacts.filter(c => c.priority === 'medium').length
    const lowCount = contacts.filter(c => c.priority === 'low').length
    
    response += `\n\n📈 **Priority Breakdown:**\n🔥 High: ${highCount} | ⚡ Medium: ${mediumCount} | 📝 Low: ${lowCount}`

    const keyboard = new InlineKeyboard()
      .text('📊 Statistics', 'stats')
      .text('🔍 Search', 'search_prompt')
      .row()
      .text('➕ Add Contact', 'add_prompt')

    await ctx.reply(response, { reply_markup: keyboard })
  } catch (error) {
    console.error('Error listing contacts:', error)
    await ctx.reply('❌ Failed to retrieve contacts.')
  }
})

// SEARCH command
bot.command('search', async (ctx) => {
  const query = ctx.match as string

  if (!query?.trim()) {
    await ctx.reply(`🔍 **Search Your Contacts**

**Usage:** /search [query]

**Examples:**
• /search John Doe
• /search Apple
• /search blockchain
• /search ETH Denver
• /search @sarah

What are you looking for? 🎯`)
    return
  }

  try {
    const results = await contactManager.searchContacts(ctx.from!.id.toString(), query)
    
    if (results.length === 0) {
      await ctx.reply(`😔 **No matches found for "${query}"**

💡 **Try:**
• Different spelling
• Company name instead of person
• Broader terms
• Event name where you met

/list to see all contacts`)
      return
    }

    let response = `🎯 **Found ${results.length} contact(s) for "${query}"**\n\n`

    results.slice(0, 10).forEach((contact, i) => {
      const priorityEmoji = contact.priority === 'high' ? '🔥' : contact.priority === 'medium' ? '⚡' : '📝'
      const hasPhoto = contact.photoFileId ? '📸' : ''
      response += `${i + 1}. ${priorityEmoji}${hasPhoto} **${contact.name}**\n`
      
      if (contact.position || contact.company) {
        response += `   💼 ${contact.position || ''}${contact.position && contact.company ? ' at ' : ''}${contact.company || ''}\n`
      }
      if (contact.email) response += `   📧 ${contact.email}\n`
      if (contact.location) response += `   📍 ${contact.location}\n`
      response += '\n'
    })

    if (results.length > 10) {
      response += `... and ${results.length - 10} more results!`
    }

    await ctx.reply(response)
  } catch (error) {
    console.error('Error searching contacts:', error)
    await ctx.reply('❌ Search failed. Please try again.')
  }
})

// STATS command
bot.command('stats', async (ctx) => {
  try {
    const contacts = await contactManager.getContacts(ctx.from!.id.toString())
    
    if (contacts.length === 0) {
      await ctx.reply('📊 No statistics yet - add some contacts first!')
      return
    }

    const stats = await contactManager.getStats(ctx.from!.id.toString())
    
    let response = `📊 **Your Mattrix Statistics**

👥 **Total Contacts:** ${stats.totalContacts}

📈 **Priority Breakdown:**
🔥 High Priority: ${stats.priorities.high}
⚡ Medium Priority: ${stats.priorities.medium} 
📝 Low Priority: ${stats.priorities.low}

🏢 **Unique Companies:** ${stats.uniqueCompanies}

🔗 **Contact Details:**
📧 With Email: ${contacts.filter(c => c.email).length}
🔗 LinkedIn: ${contacts.filter(c => c.linkedin).length}
💻 GitHub: ${contacts.filter(c => c.github).length}
🤳 With Photos: ${contacts.filter(c => c.photoFileId).length}

🎯 **Your networking is growing strong!**`

    const keyboard = new InlineKeyboard()
      .text('👥 View All Contacts', 'list')

    await ctx.reply(response, { reply_markup: keyboard })
  } catch (error) {
    console.error('Error getting stats:', error)
    await ctx.reply('❌ Failed to retrieve statistics.')
  }
})

// SELFIE command
bot.command('selfie', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    await ctx.reply(`🤳 **Conference Selfie Feature**

**Usage:** \`/selfie [contact name]\`

**Examples:**
• \`/selfie John Doe\` - Link selfie to John Doe
• \`/selfie Sarah\` - Link selfie to Sarah

**How it works:**
1. Use /selfie command with contact name
2. Send your conference selfie as a photo
3. Photo gets linked to that contact
4. Future facial recognition ready!

**Perfect for:**
✅ Conference networking
✅ Event meetups
✅ Business card alternatives
✅ Visual contact memory

Take your networking to the next level! 📸`, { parse_mode: 'Markdown' })
    return
  }

  try {
    const userId = ctx.from!.id.toString()
    const contacts = await contactManager.getContacts(userId)
    
    if (contacts.length === 0) {
      await ctx.reply('📭 No contacts found! Use /add to create contacts first, then take selfies with them.')
      return
    }

    // Find matching contact
    const searchTerm = input.toLowerCase()
    const matchingContacts = contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm)
    )

    if (matchingContacts.length === 0) {
      await ctx.reply(`❌ No contact found matching "${input}".\n\nUse /list to see all contacts or /add to create a new one first.`)
      return
    }

    if (matchingContacts.length > 1) {
      let response = `🔍 **Multiple contacts found for "${input}":**\n\n`
      matchingContacts.slice(0, 5).forEach((contact, index) => {
        response += `${index + 1}. **${contact.name}**\n`
        if (contact.company) response += `   📢 ${contact.company}\n`
        response += '\n'
      })
      response += `Please be more specific with the name.`
      
      await ctx.reply(response, { parse_mode: 'Markdown' })
      return
    }

    // Single match found
    const contact = matchingContacts[0]
    
    // Store in context for the next photo message
    const contextKey = `selfie_${userId}`
    
    // Simple way to store context
    globalThis[contextKey] = {
      contactId: contact.id,
      contactName: contact.name,
      timestamp: Date.now()
    }

    await ctx.reply(`🤳 **Ready for selfie with ${contact.name}!**

📸 **Next step:** Send me the photo of you and ${contact.name} together.

✨ **This will:**
• Link the photo to ${contact.name}'s contact
• Store in your Mattrix network
• Help you remember this networking moment

Send the photo now! 📷`, { parse_mode: 'Markdown' })

  } catch (error) {
    console.error('Error in selfie command:', error)
    await ctx.reply('❌ Error processing selfie command. Please try again.')
  }
})

// VIEW command - view full contact details with photo
bot.command('view', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    await ctx.reply(`👁️ **View Contact Details**

**Usage:** \`/view [contact name]\`

**Examples:**
• \`/view John Doe\` - View John's complete profile
• \`/view Sarah\` - View Sarah's details

**Shows:**
✅ All contact information
✅ Conference selfie (if available)
✅ Web3 profiles
✅ Notes and goals
✅ When you met them

Get the full picture of your connections! 👥`, { parse_mode: 'Markdown' })
    return
  }

  try {
    const userId = ctx.from!.id.toString()
    const contacts = await contactManager.getContacts(userId)
    
    if (contacts.length === 0) {
      await ctx.reply('📭 No contacts found! Use /add to create your first contact.')
      return
    }

    // Find matching contact
    const searchTerm = input.toLowerCase()
    const matchingContacts = contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm)
    )

    if (matchingContacts.length === 0) {
      await ctx.reply(`❌ No contact found matching "${input}".\n\nUse /list to see all contacts.`)
      return
    }

    if (matchingContacts.length > 1) {
      let response = `🔍 **Multiple contacts found for "${input}":**\n\n`
      matchingContacts.slice(0, 5).forEach((contact, index) => {
        response += `${index + 1}. **${contact.name}**\n`
        if (contact.company) response += `   📢 ${contact.company}\n`
        response += '\n'
      })
      response += `Please be more specific with the name.`
      
      await ctx.reply(response, { parse_mode: 'Markdown' })
      return
    }

    // Single match found - show full details
    const contact = matchingContacts[0]
    
    // Build comprehensive contact view
    let message = `👤 **${contact.name}**\n`
    
    // Priority indicator
    const priorityEmoji = contact.priority === 'high' ? '🔴' : contact.priority === 'medium' ? '🟡' : '⚪'
    message += `${priorityEmoji} Priority: ${contact.priority}\n\n`
    
    // Basic info
    if (contact.position) message += `💼 **Position:** ${contact.position}\n`
    if (contact.company) message += `🏢 **Company:** ${contact.company}\n`
    if (contact.location) message += `🌍 **Location:** ${contact.location}\n\n`
    
    // Contact methods
    message += `📞 **Contact Info:**\n`
    if (contact.email) message += `📧 ${contact.email}\n`
    if (contact.phone) message += `📱 ${contact.phone}\n`
    if (contact.linkedin) message += `💼 LinkedIn: ${contact.linkedin}\n`
    if (contact.github) message += `⚡ GitHub: ${contact.github}\n`
    if (contact.telegram) message += `💬 Telegram: ${contact.telegram}\n`
    message += '\n'
    
    // Web3 profiles
    if (contact.lens || contact.farcaster || contact.ens) {
      message += `🔮 **Web3 Profiles:**\n`
      if (contact.lens) message += `🌿 Lens: ${contact.lens}\n`
      if (contact.farcaster) message += `🟣 Farcaster: ${contact.farcaster}\n`
      if (contact.ens) message += `🔗 ENS: ${contact.ens}\n`
      message += '\n'
    }
    
    // Goals and notes
    if (contact.goal) message += `🎯 **Goal:** ${contact.goal}\n\n`
    if (contact.notes) message += `📝 **Notes:** ${contact.notes}\n\n`
    
    // Tags
    if (contact.tags && contact.tags.length > 0) {
      message += `🏷️ **Tags:** ${contact.tags.join(', ')}\n\n`
    }
    
    // Metadata
    message += `📅 **Added:** ${new Date(contact.createdAt).toLocaleDateString()}\n`
    if (contact.source) message += `📍 **Source:** ${contact.source}\n`
    
    // Photo info
    if (contact.photoFileId) {
      message += `🤳 **Conference Selfie:** Available\n`
      if (contact.photoTakenAt) {
        message += `📸 **Photo taken:** ${new Date(contact.photoTakenAt).toLocaleDateString()}\n`
      }
    }

    // Send the detailed message first
    await ctx.reply(message, { parse_mode: 'Markdown' })
    
    // Then send the photo if available
    if (contact.photoFileId) {
      try {
        await ctx.replyWithPhoto(contact.photoFileId, {
          caption: `🤳 Conference selfie with ${contact.name}\n📅 ${contact.photoTakenAt ? new Date(contact.photoTakenAt).toLocaleDateString() : 'Date unknown'}`
        })
      } catch (error) {
        console.error('Error sending photo:', error)
        await ctx.reply('⚠️ Photo file no longer available, but contact details are preserved.')
      }
    }

  } catch (error) {
    console.error('Error in view command:', error)
    await ctx.reply('❌ Error retrieving contact details. Please try again.')
  }
})

// PHOTOS command - view contact photos
bot.command('photos', async (ctx) => {
  try {
    const userId = ctx.from!.id.toString()
    const contactsWithPhotos = await contactManager.getContactsWithPhotos(userId)
    
    if (contactsWithPhotos.length === 0) {
      await ctx.reply(`📸 **No Conference Selfies Yet!**

Start taking selfies with your contacts:
1. Use \`/selfie [contact name]\`
2. Send the photo
3. Build your visual network!

Perfect for remembering conference connections! 🤳`, { parse_mode: 'Markdown' })
      return
    }

    let message = `📸 **Your Conference Selfies (${contactsWithPhotos.length})**\n\n`
    
    for (const contact of contactsWithPhotos.slice(0, 8)) {
      message += `🤳 **${contact.name}**\n`
      if (contact.company) message += `   📢 ${contact.company}\n`
      if (contact.photoTakenAt) {
        message += `   📅 ${new Date(contact.photoTakenAt).toLocaleDateString()}\n`
      }
      message += '\n'
    }
    
    if (contactsWithPhotos.length > 8) {
      message += `\n_...and ${contactsWithPhotos.length - 8} more photos_`
    }
    
    message += `\n\n🔮 **Future Features:**\n• Facial recognition search\n• AI-powered contact suggestions\n• Conference memory timelines`

    await ctx.reply(message, { parse_mode: 'Markdown' })
  } catch (error) {
    console.error('Error listing photos:', error)
    await ctx.reply('❌ Error retrieving photos.')
  }
})

// DELETE command
bot.command('delete', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    await ctx.reply(`🗑️ **Delete Contact**

**Usage:** \`/delete [contact name]\`

**Example:** \`/delete John Doe\`

This will permanently remove the contact from your Mattrix network.`)
    return
  }

  try {
    const userId = ctx.from!.id.toString()
    const contacts = await contactManager.getContacts(userId)
    
    if (contacts.length === 0) {
      await ctx.reply('📭 No contacts to delete. Use /add to add your first contact!')
      return
    }

    // Find contacts that match the name
    const searchTerm = input.toLowerCase()
    const matchingContacts = contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm)
    )

    if (matchingContacts.length === 0) {
      await ctx.reply(`❌ No contacts found matching "${input}".\n\nUse /list to see all your contacts.`)
      return
    }

    if (matchingContacts.length === 1) {
      const contact = matchingContacts[0]
      const deleted = await contactManager.deleteContact(userId, contact.id)
      
      if (deleted) {
        await ctx.reply(`✅ **Contact Deleted**\n\n${contact.name} has been removed from your contacts.`)
      } else {
        await ctx.reply(`❌ Failed to delete ${contact.name}. Please try again.`)
      }
    } else {
      // Multiple matches - show options
      let response = `🔍 **Multiple contacts found for "${input}":**\n\n`
      matchingContacts.slice(0, 5).forEach((contact, index) => {
        response += `${index + 1}. **${contact.name}**\n`
        if (contact.company) response += `   📢 ${contact.company}\n`
        response += '\n'
      })
      response += `Please be more specific or use the full name.`
      
      await ctx.reply(response, { parse_mode: 'Markdown' })
    }
  } catch (error) {
    console.error('Error deleting contact:', error)
    await ctx.reply('❌ Error deleting contact. Please try again.')
  }
})

// GUIDE command - detailed tutorial
bot.command('guide', async (ctx) => {
  const guide = `📚 **Mattrix CRM Complete Guide**

**🎯 CONFERENCE NETWORKING WORKFLOW:**

**1️⃣ ADD A CONTACT**
• **Quick method:** \`/add John Doe, Tesla, john@tesla.com\`
• **Full template:** \`/add\` (then copy & fill the template)

**📝 Full Template Example:**
\`\`\`
/add Name: Sarah Chen
Position: Head of Partnerships  
Company: Ethereum Foundation
Email: sarah.chen@ethereum.org
LinkedIn: sarah-chen-eth
Telegram: @saraheth
Location: San Francisco, USA
Goal: Explore DeFi partnerships
Notes: Met at ETH Denver, interested in layer 2 scaling
Tags: ethereum, partnerships, defi
Priority: high
Source: ETH Denver 2024
\`\`\`

**2️⃣ TAKE A SELFIE**
• Use: \`/selfie Sarah Chen\`
• Send the photo when prompted
• Creates visual memory of the connection

**3️⃣ VIEW COMPLETE PROFILE**  
• Use: \`/view Sarah Chen\`
• See all details + conference selfie
• Perfect for follow-up preparation

**🔥 PRO TIPS:**
✅ Add contacts DURING the conversation
✅ Take selfies before they leave your booth
✅ Use priority levels (high/medium/low) 
✅ Add meaningful tags for easy searching
✅ Include conference/event in Source field

**📱 QUICK COMMANDS:**
• \`/list\` - Browse all contacts
• \`/search blockchain\` - Find by tags/company
• \`/photos\` - View selfie gallery
• \`/stats\` - Networking analytics

**🌐 WEB3 INTEGRATION:**
Add their ENS, Lens, or Farcaster profiles for complete Web3 networking!

Ready to become a networking legend? 🚀`

  await ctx.reply(guide, { parse_mode: 'Markdown' })
})

// HELP command
bot.command('help', async (ctx) => {
  const help = `🌐 **Mattrix CRM - Complete Command Guide**

**📝 CORE COMMANDS**
/add - Add new contact (smart template)
/list - View all your contacts
/view [name] - View full contact details with selfie
/search [query] - Find specific contacts
/delete [name] - Delete a contact
/stats - Your networking statistics

**🤳 SELFIE FEATURES**
/selfie [name] - Link conference selfie to contact
/photos - View all your conference selfies

**🔍 SEARCH EXAMPLES**
/search John Doe - Find by name
/search Apple - Find by company
/search blockchain - Find by tags
/search ETH Denver - Find by event
/search @sarah - Find social handles

**📱 QUICK TIPS**
• Use /add without text to see the full template
• Add contacts immediately after meeting people
• Use priority (high/medium/low) to organize
• Tag contacts with relevant keywords
• Include event/source to track networking ROI

**💡 PRO FEATURES**
• Smart templates with 15+ fields
• Web3 social profiles (Lens, Farcaster, ENS)
• Priority-based contact organization
• Conference selfie linking
• Advanced search across all fields

Ready to build your empire? Start with /add! 👑`

  await ctx.reply(help)
})

// Handle photo messages for selfies
bot.on('message:photo', async (ctx) => {
  try {
    const userId = ctx.from!.id.toString()
    const contextKey = `selfie_${userId}`
    const selfieContext = globalThis[contextKey]

    if (!selfieContext) {
      await ctx.reply('📸 **Nice photo!** \n\nTo link this photo to a contact, first use:\n`/selfie [contact name]`\n\nThen send the photo. This helps with conference networking!', { parse_mode: 'Markdown' })
      return
    }

    // Check if context is still valid (5 minutes)
    if (Date.now() - selfieContext.timestamp > 5 * 60 * 1000) {
      delete globalThis[contextKey]
      await ctx.reply('⏰ **Selfie session expired.** Please use `/selfie [contact name]` again and send the photo within 5 minutes.', { parse_mode: 'Markdown' })
      return
    }

    // Get the largest photo size
    const photo = ctx.message.photo[ctx.message.photo.length - 1]
    const fileId = photo.file_id

    // Store photo info in contact
    const success = await contactManager.addPhotoToContact(userId, selfieContext.contactId, {
      photoFileId: fileId,
      photoTakenAt: new Date(),
      hasFacialData: false
    })

    if (success) {
      await ctx.reply(
        `✅ **Selfie saved successfully!** 🤳\n\n` +
        `📸 **Photo linked to:** ${selfieContext.contactName}\n` +
        `⏰ **Taken:** ${new Date().toLocaleString()}\n` +
        `🌐 **Stored in:** Your Mattrix network\n` +
        `🔮 **Ready for:** Future enhancements\n\n` +
        `This conference memory is now part of your network!`,
        { parse_mode: 'Markdown' }
      )

      // Clean up context
      delete globalThis[contextKey]
    } else {
      await ctx.reply('❌ **Failed to save selfie.** Contact may have been deleted. Please try again.')
    }

  } catch (error) {
    console.error('Error processing photo:', error)
    await ctx.reply('❌ Error processing photo. Please try again.')
  }
})

// Handle callback queries
bot.on('callback_query:data', async (ctx) => {
  const action = ctx.callbackQuery.data

  switch (action) {
    case 'add_prompt':
      await ctx.answerCallbackQuery()
      await ctx.reply('Use /add command to add a new contact')
      break
    case 'list':
      await ctx.answerCallbackQuery()
      const contacts = await contactManager.getContacts(ctx.from!.id.toString())
      if (contacts.length === 0) {
        await ctx.reply('📭 No contacts yet. Use /add to add your first contact!')
      } else {
        let msg = `👥 You have ${contacts.length} contacts\n\nUse /list to see them all`
        await ctx.reply(msg)
      }
      break
    case 'stats':
      await ctx.answerCallbackQuery()
      const stats = await contactManager.getStats(ctx.from!.id.toString())
      await ctx.reply(`📊 Quick Stats: ${stats.totalContacts} contacts across ${stats.uniqueCompanies} companies`)
      break
    case 'guide':
      await ctx.answerCallbackQuery()
      await ctx.reply('Use /guide for the complete step-by-step tutorial!')
      break
    case 'search_prompt':
      await ctx.answerCallbackQuery()
      await ctx.reply('Use /search [keyword] to find contacts\n\nExample: /search john')
      break
    default:
      await ctx.answerCallbackQuery('Unknown action')
  }
})

// Error handler
bot.catch((err) => {
  console.error('Bot error:', err)
})

// Set up bot commands for the menu
async function setupBotCommands() {
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: '🌐 Welcome to Mattrix CRM' },
      { command: 'guide', description: '📚 Complete step-by-step tutorial' },
      { command: 'add', description: '➕ Add a new contact with smart template' },
      { command: 'list', description: '👥 View all your contacts' },
      { command: 'view', description: '👁️ View full contact details with selfie' },
      { command: 'search', description: '🔍 Search contacts by name, company, or tags' },
      { command: 'stats', description: '📊 View your networking statistics' },
      { command: 'selfie', description: '🤳 Take conference selfie with contact' },
      { command: 'photos', description: '📸 View all conference selfies' },
      { command: 'delete', description: '🗑️ Delete a contact' },
      { command: 'help', description: '❓ Complete command guide' },
    ])
    console.log('✅ Bot commands menu set up successfully')
  } catch (error) {
    console.error('❌ Failed to set up bot commands:', error)
  }
}

// Start the bot
bot.start({
  onStart: async (botInfo) => {
    console.log(`🚀 Mattrix CRM Bot @${botInfo.username} is LIVE!`)
    console.log('🌐 Ready to manage contacts with decentralized storage!')
    console.log('⚡ All features active!')
    
    // Set up the commands menu
    await setupBotCommands()
  }
})