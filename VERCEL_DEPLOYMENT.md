# Vercel Deployment Guide

## Prerequisites
- Node.js 16+ installed
- Vercel CLI installed (`npm i -g vercel`)
- GitHub account (recommended)
- MongoDB Atlas account (free tier available)

## Environment Variables

Create a `.env` file in your project root with these variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/financial_app

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=production

# Vercel Configuration
VERCEL=1
```

## MongoDB Setup

### 1. Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new cluster (free tier)
4. Create a database user with read/write permissions
5. Get your connection string

### 2. Get Connection String
Your connection string will look like:
```
mongodb+srv://username:password@cluster.mongodb.net/financial_app
```

## Deployment Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Deploy to Vercel
```bash
npm run deploy
```

Or manually:
```bash
vercel --prod
```

### 3. Set Environment Variables in Vercel Dashboard
After deployment, go to your Vercel dashboard and set these environment variables:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Your secret key for JWT tokens
- `NODE_ENV` - Set to `production`
- `VERCEL` - Set to `1`

## Important Notes

- The app now uses MongoDB instead of SQLite
- Data will persist properly on Vercel
- All API routes are properly configured for serverless deployment
- Static files (HTML, CSS, JS) are served from the root
- The app automatically detects if it's running on Vercel vs locally

## Local Development

For local development:
```bash
npm run dev
```

This will start the server with nodemon for auto-reloading.

## Troubleshooting

- If you get database errors, ensure your MongoDB URI is correct
- Check that all environment variables are set in Vercel dashboard
- Verify that the `vercel.json` configuration is correct
- Ensure your MongoDB cluster is accessible from Vercel's servers
