# 🌐 Mattrix - Decentralized CRM Documentation

*Building your business empire, one connection at a time.*

---

## 📖 What is Mattrix?

Mattrix is a decentralized business networking CRM that helps you manage contacts from conferences, events, and business meetings. Think of it as your digital business card holder that never gets lost and is secured by blockchain technology.

### 🎯 Core Purpose
- Track contacts you meet at conferences and events
- Store business information safely and securely
- Take selfies with contacts to remember faces
- Export data for traditional CRM systems
- Verify data integrity using blockchain technology

---

## 🏗️ System Architecture Overview

Mattrix consists of four main components working together:


📱 User → 🤖 Telegram Bot → 💾 Databases → 🌐 Mini App


### 1. 🤖 Telegram Bot (The Interface)
- What it is: A Telegram chat bot (@MattrixCRMBot)
- What it does: Main interface where users add contacts, take selfies, search, and export data
- File: bot.ts
- Commands: /add, /list, /search, /selfie, /export, /base_builders_network

### 2. 💾 Database Layer (The Storage)
- PostgreSQL: Stores contact information (names, companies, emails)
- IPFS (Pinata): Stores selfie photos in decentralized storage
- GolemDB: Blockchain verification for data integrity

### 3. 🌐 Mini App (The Web Interface)
- What it is: Web app that works inside Coinbase's Base app
- What it does: Provides a beautiful interface for managing contacts and filling forms
- File: mattrix-miniapp/
- Features: Contact management, Base Builders Network form

### 4. 🔗 API Server (The Bridge)
- What it does: Connects the Mini App to the Telegram Bot's data
- Endpoints: Health check, contacts, stats, Base Builders form

---

## 🤖 Telegram Bot Features

### Core Commands

| Command | What It Does | Example |
|---------|--------------|---------|
| /start | Welcome message and main menu | - |
| /add | Add new contact with smart template | /add |
| /list | View all your contacts with priority | /list |
| /search | Find specific contacts | /search John |
| /view | See full contact details + selfie | /view John Doe |
| /delete | Remove a contact | /delete John |
| /stats | Your networking statistics | /stats |

### Special Features

| Feature | What It Does | Command |
|---------|--------------|---------|
| Selfies | Take photos with contacts | /selfie John Doe |
| Photos | View all conference selfies | /photos |
| Export | Download contact data as CSV | /export |
| Base Builders | Submit Base Builder Network form | /base_builders_network |
| Verify | Check data integrity with blockchain | /verify John |
| Status | System health check | /status |

---

## 📱 Mini App Features

The Mattrix Mini App runs inside Coinbase's Base app and provides:

### Main Tabs
1. 🔵 Base Builders - Submit Base Builder Network applications
2. 👥 Contacts - View and manage your contacts
3. ➕ Add - Add new contacts with templates
4. 📊 Stats - View networking statistics

### Authentication
- Farcaster Login - Sign in with your Farcaster account
- Demo Mode - Skip login for testing and presentations

---

## 💾 Database System Explained

### 1. PostgreSQL (Traditional Database)
- Purpose: Fast, reliable storage for contact information
- What's stored: Names, companies, emails, phone numbers, priorities
- Location: Railway cloud database

### 2. IPFS via Pinata (Decentralized File Storage)
- Purpose: Store selfie photos in a decentralized way
- What's stored: Conference selfies and contact photos
- Why: Photos never disappear, even if servers go down

### 3. GolemDB (Blockchain Verification)
- Purpose: Verify data hasn't been tampered with
- What's stored: Cryptographic hashes of contact data
- Why: Proves your contact data is authentic and unmodified

---

## 🔧 Technical Stack

### Backend (Telegram Bot)
- Runtime: Bun (JavaScript/TypeScript)
- Framework: Grammy (Telegram Bot framework)
- Database: PostgreSQL with connection pooling
- Storage: IPFS (Pinata) for images
- Blockchain: GolemDB for data integrity
- Deployment: Railway

### Frontend (Mini App)
- Framework: Next.js 15 (React)
- Styling: Tailwind CSS
- Authentication: Farcaster + MiniKit
- Deployment: Vercel

### APIs & Integrations
- Express.js: REST API server
- CORS: Cross-origin requests
- Crypto: Data hashing and verification
- Web3: Blockchain interactions

---

## 🚀 Deployment Architecture

### Production Environment


🌐 Internet
    ↓
🤖 Railway (Telegram Bot + API)
    ↓
💾 PostgreSQL Database (Railway)
    ↓
📁 IPFS Storage (Pinata)
    ↓
⛓️ GolemDB (Blockchain)

🌐 Internet
    ↓
📱 Vercel (Mini App)
    ↓
🔗 Railway API (Data fetch)


### Development Environment

💻 Local Machine
    ↓
🤖 bun run bot (Local development)
    ↓
💾 Local .env file (Environment variables)


---

## 📊 How Data Flows

### Adding a Contact via Telegram
1. User types /add in Telegram
2. Bot asks for contact template
3. User fills template (Name, Company, Email, etc.)
4. PostgreSQL stores contact data
5. GolemDB creates verification hash
6. User gets confirmation

### Taking a Selfie
1. User types /selfie John Doe
2. User sends photo to bot
3. IPFS stores the image
4. PostgreSQL links photo to contact
5. GolemDB stores photo hash for verification

### Using Mini App
1. User opens Base app
2. User navigates to Mattrix Mini App
3. Farcaster authenticates user (or Demo Mode)
4. Vercel serves the app interface
5. Railway API fetches user's contact data
6. User can view contacts, submit forms, see stats

### Base Builders Network
1. User opens "Base Builders" tab in Mini App
2. User fills out comprehensive form
3. Mini App sends data to Railway API
4. PostgreSQL stores Base Builder application
5. User gets success confirmation

---

## 🔐 Security & Privacy

### Data Protection
- Environment Variables protect sensitive keys
- CORS controls who can access the API
- Input Validation prevents malicious data
- Blockchain Verification detects data tampering

### Decentralization Benefits
- IPFS Storage - Photos stored across multiple nodes
- Blockchain Hashes - Data integrity guaranteed by GolemDB
- No Single Point of Failure - Data exists in multiple places

---

## 🌟 Key Features Explained

### 1. Smart Contact Templates
Instead of typing everything manually, users can paste formatted text:

Name: John Doe
Company: Base Protocol
Position: Developer
Email: john@base.org
Priority: high


### 2. Priority System
- 🔥 High Priority - Key contacts, decision makers
- ⚡️ Medium Priority - Important contacts
- 💤 Low Priority - General networking

### 3. Hybrid Storage Architecture
- Speed: PostgreSQL for fast queries
- Decentralization: IPFS for reliable photo storage  
- Integrity: GolemDB for verification

### 4. Cross-Platform Access
- Telegram: Primary interface for quick actions
- Mini App: Beautiful web interface for detailed work
- Export: CSV files for traditional CRM systems

---

## 🎯 Use Cases

### 1. Conference Networking
- Meet someone at ETH Denver
- Add their details with /add
- Take selfie with /selfie John Doe
- Later search with /search ETH Denver

### 2. Business Development
- Track potential customers
- Set priority levels (high/medium/low)
- Export data to company CRM
- Verify data integrity for compliance

### 3. Base Ecosystem Onboarding
- Use Base Builders Network form
- Submit applications directly from Mini App
- Track Builder Network participants
- Integrate with Base ecosystem tools

---

## 🔧 Environment Variables

### Required for Bot Operation

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=postgresql://user:pass@host:port/db
PRIVATE_KEY=your_golemdb_private_key
CHAIN_ID=60138453033
RPC_URL=https://ethwarsaw.holesky.golemdb.io/rpc
WS_URL=wss://ethwarsaw.holesky.golemdb.io/rpc/ws
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=your_pinata_gateway
NODE_ENV=production


### Required for Mini App

JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_URL=https://your-miniapp.vercel.app
NEXT_PUBLIC_MINIKIT_PROJECT_ID=your_project_id
NEYNAR_API_KEY=your_neynar_key


---

## 🚀 Getting Started

### For Users
1. Telegram: Search for @MattrixCRMBot
2. Type: /start to begin
3. Add contacts: Use /add command
4. Mini App: Access via Coinbase Base app

### For Developers
1. Clone: git clone https://github.com/your-repo/mattrix
2. Install: bun install
3. Environment: Copy .env.example to .env
4. Run: bun run bot

---

## 🎉 Benefits

### For Individual Users
- ✅ Never lose a business card again
- ✅ Remember faces with selfies
- ✅ Organize contacts by priority
- ✅ Export to any CRM system
- ✅ Blockchain-verified data integrity

### For Businesses
- ✅ Track team networking activities
- ✅ Integrate with existing CRM systems
- ✅ Compliance-ready data verification
- ✅ Decentralized storage reduces risks
- ✅ Web3-native for blockchain companies

### For the Ecosystem
- ✅ Onboard builders to Base ecosystem
- ✅ Collect structured application data
- ✅ Bridge Web2 and Web3 workflows
- ✅ Demonstrate practical Web3 utility

---

## 🔮 Future Roadmap

### Planned Features
- 🎯 Facial Recognition - Automatically identify contacts from photos
- 🔗 ENS Integration - Connect Ethereum Name Service addresses
- 📱 Mobile Apps - Native iOS and Android applications
- 🤝 Team Collaboration - Share contacts across organizations
- 📈 Analytics Dashboard - Advanced networking insights
- 🔄 CRM Integrations - Direct sync with Salesforce, HubSpot

---

*Built with ❤️ for the Web3 community. Mattrix - Where networking meets the blockchain.*

## Track and bounties

Track: Marketing & Community — Web3, Blockchain Experience, UX, Community Management, Web3 Marketing, Web3 Startups, Public Good, Web3 Jobs and Recruitment.

Bounties: Golem DB, BASE, ETHWarsaw Business Model Bounty

Find more content on our web page: https://connect-vision-ai.lovable.app/

The miniapp can be found here: https://mattrix-miniapp.vercel.app/
---

## 🖼️ Demo
_(We will add screenshots here — e.g., `docs/demo.gif`)_

---

## ⚡ Installation

Use this link to start using the bot
```bash
 https://t.me/MattrixCRMBot
 ```
Or clone the repository:
```bash
git clone https://github.com/username/mattrix.git
cd mattrix
```

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3).

You may redistribute and/or modify it under the terms of the GPLv3 as published by the Free Software Foundation. See the [LICENSE](https://www.gnu.org/licenses/gpl-3.0.txt) file for details.

## Wallet

Wallet address 0xEe6A64e370b6FbFF273C0301e523F578aba5fc0E