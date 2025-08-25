# Vercel Deployment Guide

## Prerequisites
- Node.js 16+ installed
- Vercel CLI installed (`npm i -g vercel`)
- GitHub account (recommended)

## Environment Variables

Create a `.env` file in your project root with these variables:

```env
# Database Configuration
DB_PATH=./database/financial_app.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=production

# Vercel Configuration
VERCEL=1
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
- `JWT_SECRET` - Your secret key for JWT tokens
- `NODE_ENV` - Set to `production`
- `VERCEL` - Set to `1`

## Important Notes

- The app will use SQLite database locally and on Vercel
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

- If you get database errors, ensure the database files are properly included
- Check that all environment variables are set in Vercel dashboard
- Verify that the `vercel.json` configuration is correct
