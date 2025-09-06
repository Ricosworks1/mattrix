import { config } from 'dotenv'
import { Bot, Context, InlineKeyboard, InputFile } from 'grammy'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { LocalContactManager, Contact } from './localStorage'

// Load environment - Mattrix Bot
config({ path: '.env.mattrix' })

// Initialize local storage manager
const contactManager = new LocalContactManager('mattrix_contacts.json')
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
  const welcome = `🌐 **Welcome to Mattrix!**

⚡ **Decentralized CRM Powered by Web3**

Enter the Mattrix - where business connections transcend traditional boundaries!

**🚀 Quick Start Guide:**
💼 **At a conference? Add contacts instantly:**
• Quick: \`/add John Doe, Tesla, john@tesla.com\`
• Full details: \`/add\` (then use the complete template)
• Take selfie: \`/selfie John Doe\` → send photo
• View profile: \`/view John Doe\`

**⚡ Pro tip:** Add contacts DURING conversations, then take a selfie together before they leave!

**📋 Core Commands:**
• /add - Add new contact (quick or detailed)
• /view - See full profile with selfie
• /list - Browse all contacts
• /guide - Detailed step-by-step tutorial

**🔥 Features:**
• Conference selfie linking • Web3 profiles (ENS, Lens, Farcaster)
• Smart contact templates • Visual networking memory

Ready to dominate your next conference? Start with /add! 🔮`

  const keyboard = new InlineKeyboard()
    .text('➕ Add Contact', 'add_prompt')
    .text('👥 View Contacts', 'list')
    .row()
    .text('📊 Statistics', 'stats')

  await ctx.reply(welcome, { reply_markup: keyboard, parse_mode: 'Markdown' })
})

// ADD command
bot.command('add', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    const template = `📝 **Add New Contact**

Copy, fill and send back:

\`\`\`
Name: [Full Name]
Company: [Company]
Position: [Job Title]
Email: [email]
Phone: [phone]
LinkedIn: [username or URL]
Location: [City, Country]
Notes: [Any notes]
Priority: [low/medium/high]
Tags: [tag1, tag2, tag3]
\`\`\`

Send: \`/add Name: John Doe...\``

    await ctx.reply(template, { parse_mode: 'Markdown' })
    return
  }

  try {
    // Handle quick format: /add Name, Company, Email OR just /add Name
    if (input.includes(',') && !input.includes(':')) {
      const parts = input.split(',').map(p => p.trim())
      const [name, company, email] = parts
      
      if (name && name.length > 0) {
        const quickContact: Contact = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: ctx.from!.id.toString(),
          name,
          company: company || undefined,
          email: email || undefined,
          priority: 'medium',
          createdAt: new Date(),
          source: 'Telegram Bot - Quick Add'
        }

        await contactManager.addContact(quickContact)
        
        await ctx.reply(
          `✅ **Quick Contact Added!**\n\n` +
          `**Name:** ${quickContact.name}\n` +
          `**Company:** ${quickContact.company || 'Not specified'}\n` +
          `**Email:** ${quickContact.email || 'Not specified'}\n\n` +
          `Use /add with the full template to add more details!`
        )
        return
      }
    }

    // Handle simple name-only format: /add John Doe
    if (!input.includes(':') && !input.includes(',')) {
      const name = input.trim()
      if (name && name.length > 0) {
        const simpleContact: Contact = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: ctx.from!.id.toString(),
          name,
          priority: 'medium',
          createdAt: new Date(),
          source: 'Telegram Bot - Simple Add'
        }

        await contactManager.addContact(simpleContact)
        
        await ctx.reply(
          `✅ **Contact Added!**\n\n` +
          `**Name:** ${simpleContact.name}\n` +
          `**Priority:** ${simpleContact.priority}\n\n` +
          `Use \`/view ${name}\` to see details or \`/add\` with full template for more info!`,
          { parse_mode: 'Markdown' }
        )
        return
      }
    }

    // Handle full template format
    const contactData = parseContactData(input)
    
    if (!contactData.name) {
      await ctx.reply('❌ Name is required! Please provide at least a name.')
      return
    }

    const contact: Contact = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: ctx.from!.id.toString(),
      name: contactData.name,
      ...contactData,
      priority: contactData.priority || 'medium',
      createdAt: new Date(),
      source: 'Telegram Bot'
    }

    await contactManager.addContact(contact)
    
    await ctx.reply(
      `✅ **Contact Added Successfully!**\n\n` +
      `**Name:** ${contact.name}\n` +
      `**Company:** ${contact.company || 'N/A'}\n` +
      `**Priority:** ${contact.priority}\n\n` +
      `Use /list to see all contacts`,
      { parse_mode: 'Markdown' }
    )
  } catch (error) {
    console.error('Error adding contact:', error)
    await ctx.reply('❌ Failed to add contact. Please try again.')
  }
})

// LIST command
bot.command('list', async (ctx) => {
  try {
    const contacts = await contactManager.getContacts(ctx.from!.id.toString())
    
    if (contacts.length === 0) {
      await ctx.reply('📭 No contacts yet. Use /add to add your first contact!')
      return
    }

    let message = `👥 **Your Contacts (${contacts.length})**\n\n`
    
    for (const contact of contacts.slice(0, 10)) {
      const priority = contact.priority === 'high' ? '🔴' : contact.priority === 'medium' ? '🟡' : '⚪'
      const hasPhoto = contact.photoFileId ? '📸' : ''
      message += `${priority}${hasPhoto} **${contact.name}**\n`
      if (contact.company) message += `   📢 ${contact.company}\n`
      if (contact.position) message += `   💼 ${contact.position}\n`
      if (contact.photoFileId) message += `   🤳 Has conference selfie\n`
      message += '\n'
    }

    if (contacts.length > 10) {
      message += `\n_...and ${contacts.length - 10} more contacts_`
    }

    await ctx.reply(message, { parse_mode: 'Markdown' })
  } catch (error) {
    console.error('Error listing contacts:', error)
    await ctx.reply('❌ Failed to retrieve contacts.')
  }
})

// SEARCH command
bot.command('search', async (ctx) => {
  const query = ctx.match as string

  if (!query?.trim()) {
    await ctx.reply('🔍 Usage: `/search [keyword]`\nExample: `/search john`', { parse_mode: 'Markdown' })
    return
  }

  try {
    const results = await contactManager.searchContacts(ctx.from!.id.toString(), query)
    
    if (results.length === 0) {
      await ctx.reply(`🔍 No contacts found matching "${query}"`)
      return
    }

    let message = `🔍 **Search Results for "${query}" (${results.length})**\n\n`
    
    for (const contact of results.slice(0, 5)) {
      message += `**${contact.name}**\n`
      if (contact.company) message += `📢 ${contact.company}\n`
      if (contact.email) message += `📧 ${contact.email}\n`
      message += '\n'
    }

    if (results.length > 5) {
      message += `_...and ${results.length - 5} more results_`
    }

    await ctx.reply(message, { parse_mode: 'Markdown' })
  } catch (error) {
    console.error('Error searching contacts:', error)
    await ctx.reply('❌ Search failed. Please try again.')
  }
})

// STATS command
bot.command('stats', async (ctx) => {
  try {
    const stats = await contactManager.getStats(ctx.from!.id.toString())
    
    const message = `📊 **Your Networking Stats**\n\n` +
      `👥 **Total Contacts:** ${stats.totalContacts}\n` +
      `🏢 **Unique Companies:** ${stats.uniqueCompanies}\n\n` +
      `**Priority Breakdown:**\n` +
      `🔴 High: ${stats.priorities.high}\n` +
      `🟡 Medium: ${stats.priorities.medium}\n` +
      `⚪ Low: ${stats.priorities.low}\n\n` +
      `Keep networking in the Mattrix! 🌐`

    await ctx.reply(message, { parse_mode: 'Markdown' })
  } catch (error) {
    console.error('Error getting stats:', error)
    await ctx.reply('❌ Failed to retrieve statistics.')
  }
})

// DELETE command
bot.command('delete', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    await ctx.reply('🗑️ **Delete Contact**\n\nUsage: `/delete [contact name]`\n\nExample: `/delete John Doe`')
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

// SELFIE command
bot.command('selfie', async (ctx) => {
  const input = ctx.match as string

  if (!input?.trim()) {
    await ctx.reply(`🤳 **Conference Selfie Feature**\n\n**Usage:** \`/selfie [contact name]\`\n\n**Examples:**\n• \`/selfie John Doe\` - Link selfie to John Doe\n• \`/selfie Sarah\` - Link selfie to Sarah\n\n**How it works:**\n1. Use /selfie command with contact name\n2. Send your conference selfie as a photo\n3. Photo gets linked to that contact\n4. Future facial recognition ready!\n\n**Perfect for:**\n✅ Conference networking\n✅ Event meetups\n✅ Business card alternatives\n✅ Visual contact memory\n\nTake your networking to the next level! 📸`, { parse_mode: 'Markdown' })
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
    
    // Simple way to store context (in production, use a proper session store)
    globalThis[contextKey] = {
      contactId: contact.id,
      contactName: contact.name,
      timestamp: Date.now()
    }

    await ctx.reply(`🤳 **Ready for selfie with ${contact.name}!**\n\n📸 **Next step:** Send me the photo of you and ${contact.name} together.\n\n✨ **This will:**\n• Link the photo to ${contact.name}'s contact\n• Enable future facial recognition\n• Help you remember this networking moment\n\nSend the photo now! 📷`, { parse_mode: 'Markdown' })

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
    
    message += `\n\n🔮 **Coming Soon:**\n• Facial recognition search\n• AI-powered contact suggestions\n• Conference memory timelines`

    await ctx.reply(message, { parse_mode: 'Markdown' })
  } catch (error) {
    console.error('Error listing photos:', error)
    await ctx.reply('❌ Error retrieving photos.')
  }
})

// GUIDE command - detailed tutorial
bot.command('guide', async (ctx) => {
  const guide = `📚 **Mattrix Complete Guide**

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

// EXPORT command  
bot.command('export', async (ctx) => {
  await ctx.reply(`📤 **Export Feature**\n\n⚠️ Currently running in test mode without database.\n\nWhen your team completes the Golem integration, the export feature will generate CSV files with all your contacts.\n\n**What will be exported:**\n• All contact details (Name, Company, Email, etc.)\n• Web3 profiles (ENS, Lens, Farcaster)\n• Priority levels and tags\n• Creation dates and sources\n\nFor now, you can use /list to view your contacts!`)
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
      hasFacialData: false // Will be true when we add facial recognition
    })

    if (success) {
      await ctx.reply(
        `✅ **Selfie saved successfully!** 🤳\n\n` +
        `📸 **Photo linked to:** ${selfieContext.contactName}\n` +
        `⏰ **Taken:** ${new Date().toLocaleString()}\n` +
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
      { command: 'start', description: '🌐 Welcome to Mattrix' },
      { command: 'guide', description: '📚 Complete step-by-step tutorial' },
      { command: 'add', description: '➕ Add a new contact with smart template' },
      { command: 'list', description: '👥 View all your contacts' },
      { command: 'view', description: '👁️ View full contact details with selfie' },
      { command: 'search', description: '🔍 Search contacts by name, company, or tags' },
      { command: 'stats', description: '📊 View your networking statistics' },
      { command: 'selfie', description: '🤳 Take conference selfie with contact' },
      { command: 'photos', description: '📸 View all conference selfies' },
      { command: 'delete', description: '🗑️ Delete a contact' },
      { command: 'export', description: '📤 Export contacts to CSV' },
    ])
    console.log('✅ Bot commands menu set up successfully')
  } catch (error) {
    console.error('❌ Failed to set up bot commands:', error)
  }
}

// Start the bot
bot.start({
  onStart: async () => {
    console.log('🚀 Mattrix Bot is LIVE!')
    console.log('🌐 Ready to manage contacts locally')
    console.log('⚡ Golem integration coming soon...')
    
    // Set up the commands menu
    await setupBotCommands()
  }
})