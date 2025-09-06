import { config } from 'dotenv'
import { Bot, Context, InlineKeyboard, InputFile } from 'grammy'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'
import express from 'express'
import cors from 'cors'
import { hybridStorage, initializeDatabase, Contact, BaseBuilder } from './hybrid-storage'

// Load environment
config() // This will automatically load .env file

// Initialize hybrid storage manager
const contactManager = hybridStorage
const baseBuilderManager = hybridStorage
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

// Helper function to parse Base Builder form data
function parseBaseBuilderData(text: string): Partial<BaseBuilder> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line)
  const builder: Partial<BaseBuilder> = {}

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim()
      const lowerKey = key.toLowerCase().trim()

      switch (lowerKey) {
        case 'email':
          builder.email = value
          break
        case 'full name':
        case 'name':
          builder.fullName = value
          break
        case 'builder types':
        case 'builder type':
          builder.builderTypes = value.split(',').map(t => t.trim()).filter(t => t)
          break
        case 'building on base':
        case 'building on base (required)':
          builder.buildingOnBase = value as 'Yes' | 'No, but I would like to get involved'
          break
        case 'location':
          builder.location = value
          break
        case 'country':
          builder.country = value
          break
        case 'base ambassador interest':
        case 'base ambassador':
          builder.baseAmbassador = value as 'Yes' | 'No'
          break
        case 'discord username':
        case 'discord':
          builder.discordUsername = value
          break
        case 'telegram username':
        case 'telegram':
          builder.telegramUsername = value
          break
        case 'twitter (x) username':
        case 'twitter username':
        case 'twitter':
          builder.twitterUsername = value
          break
        case 'base app/farcaster username':
        case 'base app username':
        case 'farcaster username':
          builder.baseAppUsername = value
          break
        case 'github link':
        case 'github':
          builder.githubLink = value
          break
        case 'relevant links':
          builder.relevantLinks = value
          break
        case 'base core team contact':
        case 'base core contact':
          builder.baseCoreContact = value
          break
        case 'basename':
          builder.basename = value
          break
        case 'wallet address':
          builder.walletAddress = value
          break
        case 'additional comments':
          builder.additionalComments = value
          break
      }
    }
  }

  return builder
}

// START command
bot.command('start', async (ctx) => {
  const welcome = `🌐 **Welcome to Mattrix!**

⚡ **Decentralized CRM Powered by Web3**

Enter the Mattrix - where business connections transcend traditional boundaries! Mattrix helps you capture, organize, and leverage every contact you meet at conferences with decentralized storage via Golem.

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

      await ctx.reply(`✅ **Quick Contact Added!**

👤 **${contact.name}**
🏢 ${contact.company || 'No company'}
📧 ${contact.email || 'No email'}

Use /view ${contact.name} to see details or /selfie ${contact.name} to add a photo!`)
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

  let response = `👥 **Your Mattrix Network**\n\n📊 **Total Contacts:** ${contacts.length}\n\n`
  
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
  
  let response = `📊 **Your Mattrix Statistics**

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

    const response = `📤 **Export Your Mattrix Contacts**

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
      caption: `🌐 **Mattrix Export**\n\n📋 ${filterName}: ${contacts.length} contacts\n📅 Generated: ${new Date().toLocaleDateString()}\n\n💼 Decentralized networking data ready for use!`
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

// SELFIE command
bot.command('selfie', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    await ctx.reply(`🤳 **Conference Selfie Feature**\n\n**Usage:** \`/selfie [contact name]\`\n\n**Examples:**\n• \`/selfie John Doe\` - Link selfie to John Doe\n• \`/selfie Sarah\` - Link selfie to Sarah\n\n**How it works:**\n1. Use /selfie command with contact name\n2. Send your conference selfie as a photo\n3. Photo gets linked to that contact\n4. Future facial recognition ready!\n\n**Perfect for:**\n✅ Conference networking\n✅ Event meetups\n✅ Business card alternatives\n✅ Visual contact memory\n\nTake your networking to the next level! 📸`, { parse_mode: 'Markdown' })
    return
  }

  try {
    const userId = ctx.from!.id.toString()
    const contacts = await contactManager.getUserContacts(userId)
    
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
    
    // Simple way to store context (in production, use a proper session store)
    globalThis[contextKey] = {
      contactId: contact.id,
      contactName: contact.name,
      timestamp: Date.now()
    }

    await ctx.reply(`🤳 **Ready for selfie with ${contact.name}!**\n\n📸 **Next step:** Send me the photo of you and ${contact.name} together.\n\n✨ **This will:**\n• Link the photo to ${contact.name}'s contact\n• Store in decentralized database via Golem\n• Enable future facial recognition\n• Help you remember this networking moment\n\nSend the photo now! 📷`, { parse_mode: 'Markdown' })

  } catch (error) {
    console.error('Error in selfie command:', error)
    await ctx.reply('❌ Error processing selfie command. Please try again.')
  }
})

// VIEW command - view full contact details with photo
bot.command('view', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    await ctx.reply(`👁️ **View Contact Details**\n\n**Usage:** \`/view [contact name]\`\n\n**Examples:**\n• \`/view John Doe\` - View John's complete profile\n• \`/view Sarah\` - View Sarah's details\n\n**Shows:**\n✅ All contact information\n✅ Conference selfie (if available)\n✅ Web3 profiles\n✅ Notes and goals\n✅ When you met them\n\nGet the full picture of your connections! 👥`, { parse_mode: 'Markdown' })
    return
  }

  try {
    const userId = ctx.from!.id.toString()
    const contacts = await contactManager.getUserContacts(userId)
    
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

// VERIFY command - verify data integrity
bot.command('verify', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    await ctx.reply(`🔒 **Data Integrity Verification**

**Usage:** \`/verify [contact name]\`

**Examples:**
• \`/verify John Doe\` - Verify John's data integrity
• \`/verify Sarah\` - Check Sarah's data hash

**What it does:**
✅ Compares PostgreSQL data with GolemDB hash
✅ Verifies IPFS image hashes (if available)
✅ Ensures data hasn't been tampered with
✅ Provides cryptographic proof of integrity

**Perfect for:**
🔒 Data security audits
🛡️ Integrity verification
🔍 Tamper detection
📊 System health checks

Trust, but verify! 🔐`, { parse_mode: 'Markdown' })
    return
  }

  try {
    const userId = ctx.from!.id.toString()
    const contacts = await contactManager.getUserContacts(userId)
    
    if (contacts.length === 0) {
      await ctx.reply('📭 No contacts found to verify!')
      return
    }

    // Find matching contact
    const searchTerm = input.toLowerCase()
    const matchingContacts = contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm)
    )

    if (matchingContacts.length === 0) {
      await ctx.reply(`❌ No contact found matching "${input}".`)
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

    // Single match found - verify integrity
    const contact = matchingContacts[0]
    
    await ctx.reply(`🔍 **Verifying data integrity for ${contact.name}...**\n\n⏳ Checking PostgreSQL vs GolemDB hashes...`, { parse_mode: 'Markdown' })

    try {
      const verification = await contactManager.verifyDataIntegrity(userId, 'contact', contact.id)
      
      let message = `🔒 **Data Integrity Report for ${contact.name}**\n\n`
      
      if (verification.isValid) {
        message += `✅ **Status:** VERIFIED\n`
        message += `🛡️ **Integrity:** Data is authentic and unmodified\n`
      } else {
        message += `❌ **Status:** COMPROMISED\n`
        message += `⚠️ **Warning:** Data may have been tampered with!\n`
      }
      
      message += `\n📊 **Hash Details:**\n`
      message += `🔐 **Current Hash:** \`${verification.currentHash.substring(0, 16)}...\`\n`
      message += `💾 **Stored Hash:** \`${verification.storedHash.substring(0, 16)}...\`\n`
      message += `🔍 **Match:** ${verification.isValid ? '✅ YES' : '❌ NO'}\n`

      // Verify IPFS hash if photo exists
      if (contact.photoFileId) {
        try {
          const ipfsVerification = await contactManager.verifyIPFSHash(contact.photoFileId)
          message += `\n📁 **IPFS Image Verification:**\n`
          message += `🖼️ **Status:** ${ipfsVerification.isValid ? '✅ VERIFIED' : '❌ COMPROMISED'}\n`
          message += `📎 **IPFS Hash:** \`${contact.photoFileId.substring(0, 16)}...\`\n`
        } catch (ipfsError) {
          message += `\n📁 **IPFS Image:** ⚠️ Could not verify (hash not found in GolemDB)\n`
        }
      }

      message += `\n🔐 **Powered by:**\n• PostgreSQL for data storage\n• GolemDB for hash verification\n• SHA256 cryptographic hashing`

      await ctx.reply(message, { parse_mode: 'Markdown' })

    } catch (verifyError) {
      console.error('Verification error:', verifyError)
      await ctx.reply(`❌ **Verification Failed**\n\nCould not verify data integrity. This might mean:\n• Contact was created before verification system\n• GolemDB connection issues\n• Hash not found in blockchain\n\nContact data in PostgreSQL is still available.`, { parse_mode: 'Markdown' })
    }

  } catch (error) {
    console.error('Error in verify command:', error)
    await ctx.reply('❌ Error processing verification request.')
  }
})

// STATUS command - system health check
bot.command('status', async (ctx) => {
  try {
    await ctx.reply('🔍 **Checking system status...**\n\n⏳ Testing all storage systems...', { parse_mode: 'Markdown' })
    
    const status = await contactManager.getSystemStatus()
    
    let message = `🌐 **Mattrix System Status**\n\n`
    
    message += `📊 **Storage Systems:**\n`
    message += `🐘 **PostgreSQL:** ${status.postgresql ? '✅ Online' : '❌ Offline'}\n`
    message += `🌐 **GolemDB:** ${status.golemdb ? '✅ Connected' : '❌ Disconnected'}\n`
    message += `📁 **IPFS (Pinata):** ${status.ipfs ? '✅ Available' : '⚠️ Not configured'}\n`
    
    if (status.golemInfo) {
      message += `\n🔐 **GolemDB Details:**\n`
      message += `📍 **Address:** \`${status.golemInfo.ownerAddress.substring(0, 10)}...\`\n`
      message += `💰 **Balance:** ${status.golemInfo.balance}\n`
    }
    
    message += `\n⏰ **Last Check:** ${new Date(status.timestamp).toLocaleString()}\n`
    
    // Overall health
    const allHealthy = status.postgresql && status.golemdb
    message += `\n🎯 **Overall Status:** ${allHealthy ? '🟢 Healthy' : '🟡 Degraded'}\n`
    
    if (!status.ipfs) {
      message += `\n💡 **Note:** IPFS not configured. Set PINATA_JWT for image storage.`
    }

    await ctx.reply(message, { parse_mode: 'Markdown' })

  } catch (error) {
    console.error('Error getting system status:', error)
    await ctx.reply('❌ **System Status Check Failed**\n\nUnable to retrieve system status. Please check:\n• Database connections\n• GolemDB configuration\n• Environment variables', { parse_mode: 'Markdown' })
  }
})

// PHOTOS command - view contact photos
bot.command('photos', async (ctx) => {
  try {
    const userId = ctx.from!.id.toString()
    const contactsWithPhotos = await contactManager.getContactsWithPhotos(userId)
    
    if (contactsWithPhotos.length === 0) {
      await ctx.reply(`📸 **No Conference Selfies Yet!**\n\nStart taking selfies with your contacts:\n1. Use \`/selfie [contact name]\`\n2. Send the photo\n3. Build your visual network!\n\nPerfect for remembering conference connections! 🤳`, { parse_mode: 'Markdown' })
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
    
    message += `\n\n🔮 **Powered by:**\n• Decentralized storage via Golem\n• Future facial recognition\n• AI-powered contact suggestions`

    await ctx.reply(message, { parse_mode: 'Markdown' })
  } catch (error) {
    console.error('Error listing photos:', error)
    await ctx.reply('❌ Error retrieving photos.')
  }
})

// HELP command
bot.command('help', async (ctx) => {
  const help = `🌐 **Mattrix - Complete Command Guide**

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
 
 **🔒 VERIFICATION FEATURES**
 /verify [name] - Verify contact data integrity
 /status - Check system health & storage status
 
 **📤 DATA MANAGEMENT**
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
• Hybrid storage: PostgreSQL + IPFS + GolemDB
• Cryptographic data integrity verification
• Decentralized image storage via IPFS

Ready to build your empire? Start with /add! 👑`

  await ctx.reply(help)
})

// BASE BUILDERS NETWORK command
bot.command('base_builders_network', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    const template = `🚀 **Base Builder Network Intake Form**

🌐 The Builder Network is a global community of builders on Base. Being a builder can take many forms, including: founder, developer, creator and community organiser.

Being an active member of the network grants you access to specific community forums, programs and support.

Please use this form to introduce yourself and help us onboard you into the network. If a question doesn't apply, you can leave it blank.

We'll then reach out with next steps.

**📋 Copy this template, fill it out, and send "/base_builders_network [your data]":**

\`\`\`
Email (required): 
Full Name (required): 
Builder Types (required - select all that apply): Advocate, Voices, Capital Allocator, Creator, Developer, Founder, Organizer, Student, Superuser, Other
Building on Base (required): Yes / No, but I would like to get involved
Location (required): East Asia & Pacific / Europe & Central Asia / Latin America / Middle East & North Africa / North America / South/Southeast Asia / East Africa / West Africa / Southern Africa
Country (required): 
Base Ambassador Interest: Yes / No
Discord Username: 
Telegram Username: 
Twitter (X) Username: 
Base App/Farcaster Username: 
GitHub Link: 
Relevant Links: 
Base Core Team Contact: 
Basename: 
Wallet Address: 
Additional Comments: 
\`\`\`

**💡 How to use:**
1. Copy the template above
2. Replace each field with your information  
3. Type "/base_builders_network" and paste your filled template
4. Hit send!

**Example:**
\`\`\`
Email: john@example.com
Full Name: John Doe
Builder Types: Developer, Founder
Building on Base: Yes
Location: North America
Country: USA
Base Ambassador Interest: Yes
\`\`\`

Ready to join the Base Builder Network? 🔵`

    await ctx.reply(template)
    return
  }

  try {
    const builderData = parseBaseBuilderData(input)
    
    // Validate required fields
    if (!builderData.email || !builderData.fullName || !builderData.builderTypes || !builderData.buildingOnBase || !builderData.location || !builderData.country) {
      await ctx.reply(`❌ **Missing Required Fields!**

Please ensure you provide:
• Email (required)
• Full Name (required)  
• Builder Types (required)
• Building on Base (required)
• Location (required)
• Country (required)

Use /base_builders_network to see the template again.`)
      return
    }

    // Create base builder entry
    const userId = ctx.from!.id.toString()
    
    // Check if user already submitted
    const existingBuilder = await baseBuilderManager.getBaseBuilderByUserId(userId)
    if (existingBuilder) {
      await ctx.reply(`⚠️ **Already Submitted!**

You've already submitted your Base Builder Network application on ${existingBuilder.createdAt.toDateString()}.

**Your Application Details:**
👤 **${existingBuilder.fullName}**
📧 ${existingBuilder.email}
🏗️ **Types:** ${existingBuilder.builderTypes.join(', ')}
🌍 **Location:** ${existingBuilder.location}, ${existingBuilder.country}
🚀 **Building on Base:** ${existingBuilder.buildingOnBase}

If you need to update your information, please contact support.`)
      return
    }

    const builder = await baseBuilderManager.addBaseBuilder(userId, builderData as Omit<BaseBuilder, 'id' | 'userId' | 'createdAt'>)
    
    const successMessage = `✅ **Base Builder Application Submitted!**

🎉 Welcome to the Base Builder Network, **${builder.fullName}**!

**Application Summary:**
👤 **Name:** ${builder.fullName}
📧 **Email:** ${builder.email}
🏗️ **Builder Types:** ${builder.builderTypes.join(', ')}
🌍 **Location:** ${builder.location}, ${builder.country}
🚀 **Building on Base:** ${builder.buildingOnBase}
${builder.baseAmbassador === 'Yes' ? '🎖️ **Ambassador Interest:** Yes' : ''}
${builder.discordUsername ? `💬 **Discord:** ${builder.discordUsername}` : ''}
${builder.telegramUsername ? `📱 **Telegram:** ${builder.telegramUsername}` : ''}
${builder.twitterUsername ? `🐦 **Twitter:** ${builder.twitterUsername}` : ''}
${builder.githubLink ? `💻 **GitHub:** ${builder.githubLink}` : ''}
${builder.basename ? `🔵 **Basename:** ${builder.basename}` : ''}

**What's Next:**
• You'll hear back from the Base team with next steps
• Access to exclusive community forums and programs
• Builder network opportunities and support

Thank you for being part of the Base ecosystem! 🔵`

    await ctx.reply(successMessage)

  } catch (error) {
    console.error('Error processing base builder form:', error)
    await ctx.reply(`❌ **Form Processing Error**

There was an issue processing your application. Please check your format and try again.

Use /base_builders_network to see the template.

**Common Issues:**
• Make sure to include colons (:) after field names
• Check that all required fields are filled
• Ensure Builder Types are comma-separated`)
  }
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

    // Download the photo from Telegram
    const file = await ctx.api.getFile(fileId)
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`
    
    // Fetch the image buffer
    const response = await fetch(fileUrl)
    const imageBuffer = Buffer.from(await response.arrayBuffer())

    // Store photo via hybrid storage (PostgreSQL + IPFS + GolemDB hash)
    const success = await contactManager.addPhotoToContact(userId, selfieContext.contactId, imageBuffer)

    if (success) {
      await ctx.reply(
        `✅ **Selfie saved successfully!** 🤳\n\n` +
        `📸 **Photo linked to:** ${selfieContext.contactName}\n` +
        `⏰ **Taken:** ${new Date().toLocaleString()}\n` +
        `🌐 **Stored in:** PostgreSQL + IPFS + GolemDB\n` +
        `📁 **IPFS:** Decentralized image storage\n` +
        `🔒 **GolemDB:** Hash verification for integrity\n` +
        `🔮 **Ready for:** Facial recognition (coming soon)\n\n` +
        `This conference memory is now part of your Mattrix network!`,
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
      { command: 'view', description: '👤 View contact details' },
      { command: 'delete', description: '🗑️ Remove contact' },
      { command: 'stats', description: '📊 Networking statistics' },
      { command: 'export', description: '📤 Download contact data' },
      { command: 'selfie', description: '📸 Take selfie with contact' },
      { command: 'photos', description: '🖼️ View contact photos' },
      { command: 'verify', description: '🔒 Verify data integrity' },
      { command: 'status', description: '🌐 System health check' },
      { command: 'base_builders_network', description: '🔵 Base Builders Network' },
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
    console.log(`🚀 Mattrix Bot @${botInfo.username} is LIVE!`)
    console.log(`🌐 Ready to manage contacts with decentralized storage!`)
    console.log(`⚡ Golem integration active!`)
    
    // Initialize database
    try {
      await initializeDatabase()
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      process.exit(1)
    }
    
    // Set up the command list
    await setupBotCommands()
    
    // Start API server for Mini App
    startAPIServer()
  }
})

// API Server for Mini App Integration
function startAPIServer() {
  const app = express()
  const port = process.env.PORT || 3001

  // Middleware
  app.use(cors())
  app.use(express.json())

  // Helper function to parse contact data (same as above)
  function parseContactData(text: string): Partial<Contact> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line)
    const contact: Partial<Contact> = {}

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim()
        const lowerKey = key.toLowerCase().trim()

        switch (lowerKey) {
          case 'name': contact.name = value; break
          case 'position': case 'title': case 'job': contact.position = value; break
          case 'company': case 'organization': contact.company = value; break
          case 'email': contact.email = value; break
          case 'phone': case 'mobile': contact.phone = value; break
          case 'linkedin': contact.linkedin = value.startsWith('http') ? value : `https://linkedin.com/in/${value}`; break
          case 'github': contact.github = value.startsWith('http') ? value : `https://github.com/${value}`; break
          case 'telegram': contact.telegram = value.startsWith('@') ? value : `@${value}`; break
          case 'lens': contact.lens = value.includes('.') ? value : `${value}.lens`; break
          case 'farcaster': contact.farcaster = value.startsWith('@') ? value : `@${value}`; break
          case 'ens': contact.ens = value.includes('.') ? value : `${value}.eth`; break
          case 'location': contact.location = value; break
          case 'goal': contact.goal = value; break
          case 'notes': contact.notes = value; break
          case 'tags': contact.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag); break
          case 'priority': if (['high', 'medium', 'low'].includes(value.toLowerCase())) contact.priority = value.toLowerCase() as 'high' | 'medium' | 'low'; break
          case 'source': contact.source = value; break
        }
      }
    }
    return contact
  }

  // API Routes
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

  app.post('/api/contacts', async (req, res) => {
    try {
      const { userId, contactData } = req.body
      const parsedData = typeof contactData === 'string' ? parseContactData(contactData) : contactData
      
      if (!parsedData.name) {
        return res.status(400).json({ success: false, error: 'Name is required' })
      }
      if (!parsedData.priority) parsedData.priority = 'medium'

      const contact = await contactManager.addContact(userId, parsedData)
      res.json({ success: true, data: contact })
    } catch (error) {
      console.error('API Error:', error)
      res.status(500).json({ success: false, error: 'Failed to add contact' })
    }
  })

  app.get('/api/contacts/search/:userId', async (req, res) => {
    try {
      const { userId } = req.params
      const { q: query } = req.query
      if (!query) return res.status(400).json({ success: false, error: 'Query required' })
      
      const contacts = await contactManager.searchContacts(userId, query as string)
      res.json({ success: true, data: contacts })
    } catch (error) {
      console.error('API Error:', error)
      res.status(500).json({ success: false, error: 'Failed to search contacts' })
    }
  })

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

  app.post('/api/base-builders', async (req, res) => {
    try {
      const { userId, email, fullName, builderTypes, buildingOnBase, location, country, baseAmbassador, discordUsername, telegramUsername, twitterUsername, walletAddress } = req.body
      
      if (!email || !fullName || !builderTypes || !buildingOnBase || !location || !country || !baseAmbassador) {
        return res.status(400).json({ success: false, error: 'Required fields missing' })
      }

      const baseBuilderData: BaseBuilder = {
        id: crypto.randomUUID(),
        userId,
        email,
        fullName,
        builderTypes: typeof builderTypes === 'string' ? [builderTypes] : builderTypes,
        buildingOnBase,
        location,
        country,
        baseAmbassador,
        discordUsername: discordUsername || '',
        telegramUsername: telegramUsername || '',
        twitterUsername: twitterUsername || '',
        walletAddress: walletAddress || '',
        createdAt: new Date().toISOString()
      }

      const result = await baseBuilderManager.addBaseBuilder(baseBuilderData)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('API Error:', error)
      res.status(500).json({ success: false, error: 'Failed to submit Base Builder application' })
    }
  })

  app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Mattrix API is running', timestamp: new Date().toISOString() })
  })

  app.listen(port, () => {
    console.log(`🚀 Mattrix API server running on port ${port}`)
    console.log(`📱 Mini App can connect to: https://mattrix-production.up.railway.app/api`)
  })
}