import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

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

export class LocalContactManager {
  private dataFile: string
  private contacts: Map<string, Contact[]>

  constructor(dataFile: string = 'mattrix_contacts.json') {
    this.dataFile = join(process.cwd(), dataFile)
    this.contacts = new Map()
    this.loadContacts()
  }

  private loadContacts() {
    try {
      if (existsSync(this.dataFile)) {
        const data = JSON.parse(readFileSync(this.dataFile, 'utf-8'))
        this.contacts = new Map(Object.entries(data))
        console.log(`📂 Loaded ${this.getTotalContacts()} contacts from local storage`)
      } else {
        console.log('📂 Creating new local storage file')
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

  async getContactById(userId: string, contactId: string): Promise<Contact | null> {
    const userContacts = this.contacts.get(userId) || []
    return userContacts.find(c => c.id === contactId) || null
  }

  async updateContact(userId: string, contactId: string, updates: Partial<Contact>): Promise<Contact | null> {
    const userContacts = this.contacts.get(userId) || []
    const index = userContacts.findIndex(c => c.id === contactId)
    
    if (index !== -1) {
      userContacts[index] = { ...userContacts[index], ...updates }
      this.contacts.set(userId, userContacts)
      this.saveContacts()
      return userContacts[index]
    }
    return null
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
      uniqueCompanies: companies.size,
      recentContacts: userContacts.slice(-5).reverse()
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