import { config } from 'dotenv'
import { Bot, Context, InlineKeyboard, InputFile } from 'grammy'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { DatabaseContactManager, initializeDatabase, Contact } from './database'

// Load environment
if (process.env.NODE_ENV === 'production') {
  config({ path: '.env.production' })
} else {
  config({ path: '.env.BDEmperorBot' })
}

// Initialize database contact manager
const contactManager = new DatabaseContactManager()
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
  const welcome = `👑 **Welcome to BD Emperor!**

🎯 **The Ultimate CRM for Conference Networking**

Transform every business connection into opportunity! BD Emperor helps you capture, organize, and leverage every contact you meet at conferences, events, and networking sessions.

**🚀 Quick Start:**
• /add - Add new contact with smart template
• /list - View all your contacts
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
• CSV export for CRM integration
• Advanced search & analytics

Ready to dominate your networking game? Use /add to capture your first contact! 🎲`

  const keyboard = new InlineKeyboard()
    .text('➕ Add Contact', 'add_prompt')
    .text('👥 View Contacts', 'list')
    .row()
    .text('📊 Statistics', 'stats')
    .text('📤 Export Data', 'export')

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
      const contact = await contactManager.addContact(ctx.from!.id.toString(), {
        name: parts[0] || 'Unknown',
        company: parts[1] || '',
        email: parts[2] || '',
        priority: 'medium'
      })

      const keyboard = new InlineKeyboard()
        .text('📝 Add More Details', `edit_${contact.id}`)
        .row()
        .text('🔍 View Contact', `view_${contact.id}`)

      await ctx.reply(`✅ **Quick Contact Added!**

👤 **${contact.name}**
🏢 ${contact.company || 'No company'}
📧 ${contact.email || 'No email'}

Use the buttons below to add more details!`)
      return
    }

    // Template format
    const contactData = parseContactData(input)
    
    if (!contactData.name) {
      await ctx.reply('❌ Name is required! Please include "Name: [Full Name]" in your template.')
      return
    }

    const contact = await contactManager.addContact(ctx.from!.id.toString(), contactData)
    
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
  const contacts = await contactManager.getUserContacts(ctx.from!.id.toString())
  
  if (contacts.length === 0) {
    await ctx.reply(`📭 **No contacts yet!**
    
🚀 Start building your network:
• /add - Add your first contact
• Use /help for more options

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

  let response = `👥 **Your BD Emperor Network**\n\n📊 **Total Contacts:** ${contacts.length}\n\n`
  
  // Show detailed contact list
  sortedContacts.slice(0, 10).forEach((contact, i) => {
    const priorityEmoji = contact.priority === 'high' ? '🔥' : contact.priority === 'medium' ? '⚡' : '📝'
    response += `${i + 1}. ${priorityEmoji} **${contact.name}**\n`
    
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
    .text('📤 Export All', 'export')
    .row()
    .text('🔍 Search Contacts', 'search_prompt')
    .text('➕ Add Contact', 'add_prompt')

  await ctx.reply(response, { reply_markup: keyboard })
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
    response += `${i + 1}. ${priorityEmoji} **${contact.name}**\n`
    
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
})

// STATS command
bot.command('stats', async (ctx) => {
  const contacts = await contactManager.getUserContacts(ctx.from!.id.toString())
  
  if (contacts.length === 0) {
    await ctx.reply('📊 No statistics yet - add some contacts first!')
    return
  }

  const stats = await contactManager.getStats(ctx.from!.id.toString())
  
  let response = `📊 **Your BD Emperor Statistics**

👥 **Total Contacts:** ${stats.total}

📈 **Priority Breakdown:**
🔥 High Priority: ${stats.high_priority}
⚡ Medium Priority: ${stats.medium_priority} 
📝 Low Priority: ${stats.low_priority}

🔗 **Contact Details:**
📧 With Email: ${stats.with_email}
🔗 LinkedIn: ${stats.with_linkedin}
💻 GitHub: ${stats.with_github}

📅 **Recent Activity:**
• Last 7 days: ${stats.recent_week}
• Last 30 days: ${stats.recent_month}

🎯 **Your networking is growing strong!**`

  const keyboard = new InlineKeyboard()
    .text('👥 View All Contacts', 'list')
    .text('📤 Export Data', 'export')

  await ctx.reply(response, { reply_markup: keyboard })
})

// DELETE command
bot.command('delete', async (ctx) => {
  const input = ctx.match as string
  const userId = ctx.from!.id.toString()
  
  if (!input?.trim()) {
    // Show list of contacts to delete
    const contacts = await contactManager.getUserContacts(userId)
    
    if (contacts.length === 0) {
      await ctx.reply('📭 No contacts to delete!')
      return
    }
    
    let response = '🗑️ **Select contact to delete:**\n\n'
    const keyboard = new InlineKeyboard()
    
    contacts.slice(0, 10).forEach((contact, index) => {
      response += `${index + 1}. **${contact.name}**`
      if (contact.company) response += ` (${contact.company})`
      response += '\n'
      
      keyboard.text(`${index + 1}. ${contact.name}`, `delete_${contact.id}`)
      if ((index + 1) % 2 === 0) keyboard.row()
    })
    
    if (contacts.length > 10) {
      response += `\n... and ${contacts.length - 10} more`
    }
    
    response += '\n💡 Or use: /delete [contact name]'
    
    await ctx.reply(response, { reply_markup: keyboard })
    return
  }
  
  // Search for contact by name
  const query = input.toLowerCase().trim()
  const contacts = await contactManager.getUserContacts(userId)
  const matches = contacts.filter(c => 
    c.name.toLowerCase().includes(query)
  )
  
  if (matches.length === 0) {
    await ctx.reply(`❌ No contact found matching "${input}".\n\nTry /delete without parameters to see all contacts.`)
    return
  }
  
  if (matches.length > 1) {
    let response = `🔍 **Multiple contacts found for "${input}":**\n\n`
    const keyboard = new InlineKeyboard()
    
    matches.slice(0, 5).forEach((contact, index) => {
      response += `${index + 1}. **${contact.name}**`
      if (contact.company) response += ` (${contact.company})`
      response += '\n'
      
      keyboard.text(`${index + 1}. ${contact.name}`, `delete_${contact.id}`)
      if ((index + 1) % 2 === 0) keyboard.row()
    })
    
    response += '\nSelect which one to delete:'
    await ctx.reply(response, { reply_markup: keyboard })
    return
  }
  
  // Single match found - ask for confirmation
  const contact = matches[0]
  const keyboard = new InlineKeyboard()
    .text('🗑️ Confirm Delete', `confirm_delete_${contact.id}`)
    .text('❌ Cancel', 'cancel_delete')
  
  const response = `⚠️ **Confirm deletion:**\n\n👤 **${contact.name}**${contact.company ? `\n🏢 ${contact.company}` : ''}${contact.email ? `\n📧 ${contact.email}` : ''}\n\nThis action cannot be undone!`
  
  await ctx.reply(response, { reply_markup: keyboard })
})

// EXPORT command
bot.command('export', async (ctx) => {
  const input = ctx.match as string
  const userId = ctx.from!.id.toString()
  const allContacts = await contactManager.getUserContacts(userId)
  
  if (allContacts.length === 0) {
    await ctx.reply('📭 No contacts to export yet!')
    return
  }

  // Show export options if no specific filter provided
  if (!input?.trim()) {
    const keyboard = new InlineKeyboard()
      .text('📄 All Contacts', 'export_all')
      .row()
      .text('🔥 High Priority', 'export_high')
      .text('⚡ Medium Priority', 'export_medium')
      .text('📝 Low Priority', 'export_low')
      .row()
      .text('📅 Recent (30 days)', 'export_recent')

    const response = `📤 **Export Your BD Emperor Contacts**

**Available Options:**
• **All Contacts** - Complete database (${allContacts.length} contacts)
• **By Priority** - Filter by contact importance
• **Recent** - Contacts added in last 30 days

**Export Format:** Professional CSV file with all fields including:
Name, Company, Position, Email, Phone, LinkedIn, GitHub, Telegram, Web3 profiles, Notes, Tags, Priority, Source, and Creation Date

Choose your export option:`

    await ctx.reply(response, { reply_markup: keyboard })
    return
  }

  // Direct export if parameter provided
  let contacts = allContacts
  let filterName = 'All'

  if (input.toLowerCase().includes('high')) {
    contacts = allContacts.filter(c => c.priority === 'high')
    filterName = 'High Priority'
  } else if (input.toLowerCase().includes('medium')) {
    contacts = allContacts.filter(c => c.priority === 'medium')
    filterName = 'Medium Priority'
  } else if (input.toLowerCase().includes('low')) {
    contacts = allContacts.filter(c => c.priority === 'low')
    filterName = 'Low Priority'
  } else if (input.toLowerCase().includes('recent')) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    contacts = allContacts.filter(c => new Date(c.createdAt) >= thirtyDaysAgo)
    filterName = 'Recent (30 days)'
  }

  if (contacts.length === 0) {
    await ctx.reply(`📭 No contacts found for filter: ${filterName}`)
    return
  }

  await exportContacts(ctx, contacts, filterName)
})

// Helper function to generate and send CSV export
async function exportContacts(ctx: any, contacts: Contact[], filterName: string) {
  try {
    // Create CSV content
    const csvHeader = 'Name,Position,Company,Email,Phone,LinkedIn,GitHub,Telegram,Lens,Farcaster,ENS,Location,Goal,Notes,Tags,Priority,Source,Created\n'
    
    const csvRows = contacts.map(c => [
      c.name || '',
      c.position || '',
      c.company || '',
      c.email || '',
      c.phone || '',
      c.linkedin || '',
      c.github || '',
      c.telegram || '',
      c.lens || '',
      c.farcaster || '',
      c.ens || '',
      c.location || '',
      c.goal || '',
      c.notes || '',
      (c.tags || []).join('; '),
      c.priority,
      c.source || '',
      new Date(c.createdAt).toISOString()
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))

    const csvContent = csvHeader + csvRows.join('\n')
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `bd-emperor-${filterName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}.csv`
    const filepath = join(process.cwd(), filename)

    // Write CSV file
    writeFileSync(filepath, csvContent, 'utf8')

    // Send summary message
    let response = `📤 **${filterName} Export Complete**

📊 **Export Summary:**
• Contacts exported: ${contacts.length}
• Companies: ${[...new Set(contacts.filter(c => c.company).map(c => c.company))].length}
• High priority: ${contacts.filter(c => c.priority === 'high').length}
• With emails: ${contacts.filter(c => c.email).length}
• With LinkedIn: ${contacts.filter(c => c.linkedin).length}
• With GitHub: ${contacts.filter(c => c.github).length}

📁 **File:** ${filename}
💾 **Format:** CSV (Excel/Sheets compatible)

Downloading your professional contact database...`

    await ctx.reply(response)

    // Send the CSV file
    await ctx.replyWithDocument(new InputFile(filepath), {
      caption: `🎯 **BD Emperor Export**\n\n📋 ${filterName}: ${contacts.length} contacts\n📅 Generated: ${new Date().toLocaleDateString()}\n\n💼 Ready for import into your favorite CRM!`
    })

    // Clean up the temporary file
    setTimeout(() => {
      try {
        if (existsSync(filepath)) {
          require('fs').unlinkSync(filepath)
        }
      } catch (error) {
        console.error('Error cleaning up export file:', error)
      }
    }, 30000) // Delete after 30 seconds

  } catch (error) {
    console.error('Export error:', error)
    await ctx.reply('❌ Export failed. Please try again or contact support.')
  }
}

// HELP command
bot.command('help', async (ctx) => {
  const help = `🎯 **BD Emperor - Complete Command Guide**

**📝 CORE COMMANDS**
/add - Add new contact (smart template)
/list - View all your contacts
/search [query] - Find specific contacts
/delete [name] - Delete a contact
/stats - Your networking statistics
/export - Download your contact data

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
• CSV export for CRM integration
• Advanced search across all fields

Ready to build your empire? Start with /add! 👑`

  await ctx.reply(help)
})

// Handle callback queries
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data
  
  if (data === 'stats') {
    // Trigger stats command
    ctx.message = { text: '/stats' } as any
    return
  }
  
  if (data === 'export') {
    // Trigger export command
    ctx.message = { text: '/export' } as any
    return
  }
  
  // Handle export filter selections
  if (data.startsWith('export_')) {
    const filter = data.replace('export_', '')
    const userId = ctx.from!.id.toString()
    const allContacts = await contactManager.getUserContacts(userId)
    
    let contacts = allContacts
    let filterName = 'All'
    
    switch (filter) {
      case 'all':
        contacts = allContacts
        filterName = 'All'
        break
      case 'high':
        contacts = allContacts.filter(c => c.priority === 'high')
        filterName = 'High Priority'
        break
      case 'medium':
        contacts = allContacts.filter(c => c.priority === 'medium')
        filterName = 'Medium Priority'
        break
      case 'low':
        contacts = allContacts.filter(c => c.priority === 'low')
        filterName = 'Low Priority'
        break
      case 'recent':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        contacts = allContacts.filter(c => new Date(c.createdAt) >= thirtyDaysAgo)
        filterName = 'Recent (30 days)'
        break
    }
    
    if (contacts.length === 0) {
      await ctx.editMessageText(`📭 No contacts found for filter: ${filterName}`)
      await ctx.answerCallbackQuery('No contacts found!')
      return
    }
    
    await ctx.editMessageText(`📤 Preparing ${filterName} export...\n\n⏳ Generating CSV file...`)
    await ctx.answerCallbackQuery(`Exporting ${contacts.length} contacts...`)
    
    await exportContacts(ctx, contacts, filterName)
    return
  }
  
  if (data === 'list') {
    // Trigger list command
    ctx.message = { text: '/list' } as any
    return
  }
  
  // Handle delete confirmations
  if (data.startsWith('delete_')) {
    const contactId = data.replace('delete_', '')
    const keyboard = new InlineKeyboard()
      .text('🗑️ Confirm Delete', `confirm_delete_${contactId}`)
      .text('❌ Cancel', 'cancel_delete')
    
    const contact = await contactManager.getUserContacts(ctx.from!.id.toString())
      .then(contacts => contacts.find(c => c.id === contactId))
    
    if (!contact) {
      await ctx.answerCallbackQuery('Contact not found!')
      return
    }
    
    const response = `⚠️ **Confirm deletion:**\n\n👤 **${contact.name}**${contact.company ? `\n🏢 ${contact.company}` : ''}${contact.email ? `\n📧 ${contact.email}` : ''}\n\nThis action cannot be undone!`
    
    await ctx.editMessageText(response, { reply_markup: keyboard })
    await ctx.answerCallbackQuery()
    return
  }
  
  if (data.startsWith('confirm_delete_')) {
    const contactId = data.replace('confirm_delete_', '')
    const userId = ctx.from!.id.toString()
    
    const contact = await contactManager.getUserContacts(userId).then(contacts => contacts.find(c => c.id === contactId))
    if (!contact) {
      await ctx.answerCallbackQuery('Contact not found!')
      return
    }
    
    const deleted = await contactManager.deleteContact(userId, contactId)
    
    if (deleted) {
      await ctx.editMessageText(`✅ **Contact deleted successfully!**\n\n👤 **${contact.name}** has been removed from your contacts.`)
      await ctx.answerCallbackQuery('Contact deleted!')
    } else {
      await ctx.editMessageText('❌ Failed to delete contact. Please try again.')
      await ctx.answerCallbackQuery('Delete failed!')
    }
    return
  }
  
  if (data === 'cancel_delete') {
    await ctx.editMessageText('❌ **Deletion cancelled.**\n\nContact was not deleted.')
    await ctx.answerCallbackQuery('Cancelled')
    return
  }
  
  if (data === 'search_prompt') {
    await ctx.editMessageText(`🔍 **Search Your Contacts**

Type: \`/search [query]\`

**Search Examples:**
• \`/search John Doe\` - Find by name
• \`/search Apple\` - Find by company
• \`/search blockchain\` - Find by tags
• \`/search ETH Denver\` - Find by event
• \`/search @sarah\` - Find social handles

**Or use /list to see all contacts again**`)
    await ctx.answerCallbackQuery('Search help shown')
    return
  }
  
  if (data === 'add_prompt') {
    await ctx.editMessageText(`➕ **Add New Contact**

Type: \`/add\` to see the full template

**Quick Add:**
\`/add Name, Company, Email\`

**Template Add:**
\`/add\` (then copy and fill the template)

**Or use /list to see all contacts again**`)
    await ctx.answerCallbackQuery('Add help shown')
    return
  }
  
  await ctx.answerCallbackQuery()
})

// Error handler
bot.catch((err) => {
  console.error('Bot error:', err)
})

// Set up bot commands for Telegram menu
async function setupBotCommands() {
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: '🚀 Welcome and main menu' },
      { command: 'add', description: '➕ Add new contact' },
      { command: 'list', description: '👥 View all contacts' },
      { command: 'search', description: '🔍 Find contacts' },
      { command: 'delete', description: '🗑️ Remove contact' },
      { command: 'stats', description: '📊 Networking statistics' },
      { command: 'export', description: '📤 Download contact data' },
      { command: 'help', description: '❓ Command guide' }
    ])
    console.log('✅ Bot commands updated successfully!')
  } catch (error) {
    console.error('❌ Failed to set bot commands:', error)
  }
}

// Start bot
bot.start({
  onStart: async (botInfo) => {
    console.log(`🚀 BD Emperor Bot @${botInfo.username} is LIVE!`)
    console.log(`👑 Ready to dominate conference networking!`)
    
    // Initialize database
    try {
      await initializeDatabase()
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      process.exit(1)
    }
    
    // Set up the command list
    await setupBotCommands()
  }
})