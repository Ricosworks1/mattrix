import { Pool, PoolClient } from 'pg'
import { config } from 'dotenv'

// Ensure environment is loaded
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    config({ path: '.env.production' })
  } else {
    config({ path: '.env.mattrix' })
  }
}

// Database configuration
let poolConfig: any = {
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout for Railway
}

// Railway requires SSL for PostgreSQL (both production and development)
if (process.env.DATABASE_URL?.includes('railway')) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  }
}

const pool = new Pool(poolConfig)

// Contact interface (same as before)
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

// Base Builder Network interface
export interface BaseBuilder {
  id: string
  userId: string
  email: string
  fullName: string
  builderTypes: string[]
  buildingOnBase: 'Yes' | 'No, but I would like to get involved'
  location: string
  country: string
  baseAmbassador: 'Yes' | 'No'
  discordUsername?: string
  telegramUsername?: string
  twitterUsername?: string
  baseAppUsername?: string
  githubLink?: string
  relevantLinks?: string
  baseCoreContact?: string
  basename?: string
  walletAddress?: string
  additionalComments?: string
  createdAt: Date
}

// Initialize database tables
export async function initializeDatabase() {
  const client = await pool.connect()
  try {
    // Create contacts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(255),
        company VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(255),
        linkedin VARCHAR(500),
        github VARCHAR(500),
        telegram VARCHAR(255),
        lens VARCHAR(255),
        farcaster VARCHAR(255),
        ens VARCHAR(255),
        location VARCHAR(255),
        goal TEXT,
        notes TEXT,
        tags TEXT[],
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        source VARCHAR(255),
        photo_path VARCHAR(500),
        photo_file_id VARCHAR(500),
        photo_taken_at TIMESTAMP WITH TIME ZONE,
        has_facial_data BOOLEAN DEFAULT FALSE
      )
    `)

    // Create base_builders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS base_builders (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        builder_types TEXT[] NOT NULL,
        building_on_base VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        country VARCHAR(255) NOT NULL,
        base_ambassador VARCHAR(10) NOT NULL,
        discord_username VARCHAR(255),
        telegram_username VARCHAR(255),
        twitter_username VARCHAR(255),
        base_app_username VARCHAR(255),
        github_link VARCHAR(500),
        relevant_links TEXT,
        base_core_contact VARCHAR(500),
        basename VARCHAR(255),
        wallet_address VARCHAR(255),
        additional_comments TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority);
      CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
      CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
      CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
      CREATE INDEX IF NOT EXISTS idx_base_builders_user_id ON base_builders(user_id);
      CREATE INDEX IF NOT EXISTS idx_base_builders_email ON base_builders(email);
      CREATE INDEX IF NOT EXISTS idx_base_builders_location ON base_builders(location);
    `)

    console.log('✅ Database initialized successfully!')
  } catch (error) {
    console.error('❌ Database initialization error:', error)
    throw error
  } finally {
    client.release()
  }
}

// Database operations class
export class DatabaseContactManager {
  // Add a new contact
  async addContact(userId: string, contactData: Partial<Contact>): Promise<Contact> {
    const client = await pool.connect()
    try {
      const contact: Contact = {
        id: Date.now().toString(),
        userId,
        name: contactData.name || 'Unknown',
        position: contactData.position,
        company: contactData.company,
        email: contactData.email,
        phone: contactData.phone,
        linkedin: contactData.linkedin,
        github: contactData.github,
        telegram: contactData.telegram,
        lens: contactData.lens,
        farcaster: contactData.farcaster,
        ens: contactData.ens,
        location: contactData.location,
        goal: contactData.goal,
        notes: contactData.notes,
        tags: contactData.tags || [],
        priority: contactData.priority || 'medium',
        createdAt: new Date(),
        source: contactData.source,
        photoPath: contactData.photoPath,
        photoFileId: contactData.photoFileId,
        photoTakenAt: contactData.photoTakenAt,
        hasFacialData: contactData.hasFacialData || false
      }

      const query = `
        INSERT INTO contacts (
          id, user_id, name, position, company, email, phone, 
          linkedin, github, telegram, lens, farcaster, ens, 
          location, goal, notes, tags, priority, created_at, source,
          photo_path, photo_file_id, photo_taken_at, has_facial_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        ) RETURNING *
      `

      const values = [
        contact.id, contact.userId, contact.name, contact.position, contact.company,
        contact.email, contact.phone, contact.linkedin, contact.github, contact.telegram,
        contact.lens, contact.farcaster, contact.ens, contact.location, contact.goal,
        contact.notes, contact.tags, contact.priority, contact.createdAt, contact.source,
        contact.photoPath, contact.photoFileId, contact.photoTakenAt, contact.hasFacialData
      ]

      const result = await client.query(query, values)
      return this.mapRowToContact(result.rows[0])
    } catch (error) {
      console.error('❌ Add contact error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Get all contacts for a user
  async getUserContacts(userId: string): Promise<Contact[]> {
    const client = await pool.connect()
    try {
      const query = 'SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at DESC'
      const result = await client.query(query, [userId])
      return result.rows.map(row => this.mapRowToContact(row))
    } catch (error) {
      console.error('❌ Get contacts error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Search contacts
  async searchContacts(userId: string, query: string): Promise<Contact[]> {
    const client = await pool.connect()
    try {
      const searchQuery = `
        SELECT * FROM contacts 
        WHERE user_id = $1 AND (
          LOWER(name) LIKE LOWER($2) OR
          LOWER(company) LIKE LOWER($2) OR
          LOWER(position) LIKE LOWER($2) OR
          LOWER(email) LIKE LOWER($2) OR
          LOWER(linkedin) LIKE LOWER($2) OR
          LOWER(github) LIKE LOWER($2) OR
          LOWER(telegram) LIKE LOWER($2) OR
          LOWER(location) LIKE LOWER($2) OR
          LOWER(source) LIKE LOWER($2) OR
          EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE LOWER(tag) LIKE LOWER($2))
        )
        ORDER BY created_at DESC
      `
      
      const searchTerm = `%${query}%`
      const result = await client.query(searchQuery, [userId, searchTerm])
      return result.rows.map(row => this.mapRowToContact(row))
    } catch (error) {
      console.error('❌ Search contacts error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Delete a contact
  async deleteContact(userId: string, contactId: string): Promise<boolean> {
    const client = await pool.connect()
    try {
      const query = 'DELETE FROM contacts WHERE user_id = $1 AND id = $2'
      const result = await client.query(query, [userId, contactId])
      return result.rowCount > 0
    } catch (error) {
      console.error('❌ Delete contact error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Get contact statistics
  async getStats(userId: string): Promise<any> {
    const client = await pool.connect()
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
          COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
          COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
          COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
          COUNT(CASE WHEN linkedin IS NOT NULL AND linkedin != '' THEN 1 END) as with_linkedin,
          COUNT(CASE WHEN github IS NOT NULL AND github != '' THEN 1 END) as with_github,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_week,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_month
        FROM contacts 
        WHERE user_id = $1
      `

      const result = await client.query(statsQuery, [userId])
      return result.rows[0]
    } catch (error) {
      console.error('❌ Get stats error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Add photo to existing contact
  async addPhotoToContact(userId: string, contactId: string, photoData: {
    photoPath?: string,
    photoFileId?: string,
    photoTakenAt?: Date,
    hasFacialData?: boolean
  }): Promise<boolean> {
    const client = await pool.connect()
    try {
      const query = `
        UPDATE contacts 
        SET photo_path = $1, photo_file_id = $2, photo_taken_at = $3, has_facial_data = $4
        WHERE user_id = $5 AND id = $6
      `
      const values = [
        photoData.photoPath, 
        photoData.photoFileId, 
        photoData.photoTakenAt || new Date(), 
        photoData.hasFacialData || false,
        userId, 
        contactId
      ]
      
      const result = await client.query(query, values)
      return result.rowCount > 0
    } catch (error) {
      console.error('❌ Add photo error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Get contacts with photos
  async getContactsWithPhotos(userId: string): Promise<Contact[]> {
    const client = await pool.connect()
    try {
      const query = `
        SELECT * FROM contacts 
        WHERE user_id = $1 AND (photo_path IS NOT NULL OR photo_file_id IS NOT NULL)
        ORDER BY photo_taken_at DESC
      `
      const result = await client.query(query, [userId])
      return result.rows.map(row => this.mapRowToContact(row))
    } catch (error) {
      console.error('❌ Get photos error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Helper function to map database row to Contact object
  private mapRowToContact(row: any): Contact {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      position: row.position,
      company: row.company,
      email: row.email,
      phone: row.phone,
      linkedin: row.linkedin,
      github: row.github,
      telegram: row.telegram,
      lens: row.lens,
      farcaster: row.farcaster,
      ens: row.ens,
      location: row.location,
      goal: row.goal,
      notes: row.notes,
      tags: row.tags || [],
      priority: row.priority,
      createdAt: new Date(row.created_at),
      source: row.source,
      photoPath: row.photo_path,
      photoFileId: row.photo_file_id,
      photoTakenAt: row.photo_taken_at ? new Date(row.photo_taken_at) : undefined,
      hasFacialData: row.has_facial_data || false
    }
  }
}

// Base Builder Network Manager
export class BaseBuilderManager {
  // Create base builder entry
  async createBaseBuilder(userId: string, builderData: Omit<BaseBuilder, 'id' | 'userId' | 'createdAt'>): Promise<BaseBuilder> {
    const client = await pool.connect()
    try {
      const id = `bb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const query = `
        INSERT INTO base_builders (
          id, user_id, email, full_name, builder_types, building_on_base,
          location, country, base_ambassador, discord_username, telegram_username,
          twitter_username, base_app_username, github_link, relevant_links,
          base_core_contact, basename, wallet_address, additional_comments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `
      
      const values = [
        id, userId, builderData.email, builderData.fullName,
        builderData.builderTypes, builderData.buildingOnBase,
        builderData.location, builderData.country, builderData.baseAmbassador,
        builderData.discordUsername, builderData.telegramUsername,
        builderData.twitterUsername, builderData.baseAppUsername,
        builderData.githubLink, builderData.relevantLinks,
        builderData.baseCoreContact, builderData.basename,
        builderData.walletAddress, builderData.additionalComments
      ]
      
      const result = await client.query(query, values)
      return this.mapRowToBaseBuilder(result.rows[0])
    } catch (error) {
      console.error('❌ Create base builder error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Get base builder by user ID
  async getBaseBuilderByUserId(userId: string): Promise<BaseBuilder | null> {
    const client = await pool.connect()
    try {
      const query = 'SELECT * FROM base_builders WHERE user_id = $1'
      const result = await client.query(query, [userId])
      return result.rows.length > 0 ? this.mapRowToBaseBuilder(result.rows[0]) : null
    } catch (error) {
      console.error('❌ Get base builder error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // Helper function to map database row to BaseBuilder object
  private mapRowToBaseBuilder(row: any): BaseBuilder {
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      builderTypes: row.builder_types || [],
      buildingOnBase: row.building_on_base,
      location: row.location,
      country: row.country,
      baseAmbassador: row.base_ambassador,
      discordUsername: row.discord_username,
      telegramUsername: row.telegram_username,
      twitterUsername: row.twitter_username,
      baseAppUsername: row.base_app_username,
      githubLink: row.github_link,
      relevantLinks: row.relevant_links,
      baseCoreContact: row.base_core_contact,
      basename: row.basename,
      walletAddress: row.wallet_address,
      additionalComments: row.additional_comments,
      createdAt: new Date(row.created_at)
    }
  }
}

// Export pool for health checks
export { pool }