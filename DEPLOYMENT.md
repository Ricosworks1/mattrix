# BD Emperor - Railway Deployment Guide

## 🚀 Quick Deploy to Railway

### Step 1: Prepare Environment
1. Copy your Telegram bot token from `.env.BDEmperorBot`
2. Update `.env.production` with your bot token

### Step 2: Deploy to Railway
1. Visit [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Create new project
4. Connect this GitHub repository
5. Railway will auto-detect Bun and deploy

### Step 3: Add Database
1. In Railway dashboard, click "Add Service"
2. Select "PostgreSQL"
3. Railway will auto-connect database via `DATABASE_URL`

### Step 4: Set Environment Variables
In Railway dashboard, go to Variables tab and add:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
NODE_ENV=production
```

### Step 5: Deploy
- Railway will automatically deploy on git push
- Check logs in Railway dashboard
- Bot will be live 24/7!

## 📊 Production Specs
- **Handles**: 1000+ users
- **Database**: PostgreSQL with connection pooling
- **Scaling**: Automatic based on usage
- **Uptime**: 99.9% guaranteed by Railway

## 🔧 Architecture
```
Telegram Bot API
       ↓
Railway.app (Bun Runtime)
       ↓
PostgreSQL Database
```

## 💰 Cost Estimate
- Railway: $5-20/month (scales with usage)
- Perfect for MVP with 1000 users
- Automatic scaling as you grow

## 🐛 Troubleshooting
- Check Railway logs if bot doesn't start
- Verify TELEGRAM_BOT_TOKEN is set correctly
- Database connection issues: Check DATABASE_URL is auto-set by Railway

Your BD Emperor bot will be production-ready! 👑