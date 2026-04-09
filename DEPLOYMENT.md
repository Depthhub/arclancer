# ArcLancer Production Deployment Guide

This guide will help you deploy ArcLancer to production.

## Prerequisites

- ✅ Smart contracts deployed to Arc Testnet
- ✅ Contract addresses documented
- ✅ Node.js 18+ installed
- ✅ Git repository set up

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

Vercel is the easiest way to deploy Next.js applications with zero configuration.

#### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Deploy

From the project root:

```bash
cd frontend
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (Select your account)
- Link to existing project? **No**
- Project name? **arclancer** (or your choice)
- Directory? **./frontend**
- Override settings? **No**

#### Step 4: Set Environment Variables

After deployment, go to your Vercel dashboard:
1. Select your project
2. Go to **Settings** → **Environment Variables**
3. Add the following variables:

```
NEXT_PUBLIC_FACTORY_ADDRESS=0x0ADf70A390868c7016697edF0640791c3B3e5f31
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_EURC_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
NEXT_PUBLIC_STABLEFX_ADDRESS=0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1
NEXT_PUBLIC_ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
NEXT_PUBLIC_PINATA_JWT=your-pinata-jwt (optional)
NEXT_PUBLIC_PINATA_GATEWAY=gateway.pinata.cloud (optional)
```

#### Step 5: Redeploy

After setting environment variables, trigger a new deployment:

```bash
vercel --prod
```

Or redeploy from the Vercel dashboard.

#### Step 6: Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

---

### Option 2: Netlify

#### Step 1: Install Netlify CLI

```bash
npm i -g netlify-cli
```

#### Step 2: Login

```bash
netlify login
```

#### Step 3: Create netlify.toml

Create `frontend/netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### Step 4: Deploy

```bash
cd frontend
netlify deploy --prod
```

#### Step 5: Set Environment Variables

In Netlify dashboard:
1. Go to **Site settings** → **Environment variables**
2. Add all variables from `.env.example`

---

### Option 3: Self-Hosted (VPS/Docker)

#### Build the Application

```bash
cd frontend
npm install
npm run build
```

#### Run Production Server

```bash
npm start
```

The app will run on `http://localhost:3000` by default.

#### Using PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start npm --name "arclancer" -- start
pm2 save
pm2 startup
```

#### Using Docker

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
cd frontend
docker build -t arclancer .
docker run -p 3000:3000 --env-file .env.local arclancer
```

---

## Required Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_FACTORY_ADDRESS` | ✅ Yes | EscrowFactory contract address | `0x0ADf70A390868c7016697edF0640791c3B3e5f31` |
| `NEXT_PUBLIC_USDC_ADDRESS` | ✅ Yes | USDC token address | `0x3600000000000000000000000000000000000000` |
| `NEXT_PUBLIC_EURC_ADDRESS` | ✅ Yes | EURC token address | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| `NEXT_PUBLIC_STABLEFX_ADDRESS` | ✅ Yes | StableFX contract address | `0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1` |
| `NEXT_PUBLIC_ARC_TESTNET_RPC_URL` | ✅ Yes | Arc Testnet RPC endpoint | `https://rpc.testnet.arc.network` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ Yes | WalletConnect project ID | `demo-project-id` |
| `NEXT_PUBLIC_PINATA_JWT` | ⚠️ Optional | Pinata JWT for IPFS uploads | (mock mode) |
| `NEXT_PUBLIC_PINATA_GATEWAY` | ⚠️ Optional | Pinata gateway URL | `gateway.pinata.cloud` |

---

## Pre-Deployment Checklist

- [ ] Test production build locally: `npm run build`
- [ ] Verify all environment variables are set
- [ ] Get a real WalletConnect Project ID from https://cloud.walletconnect.com
- [ ] (Optional) Set up Pinata for IPFS file storage
- [ ] Test wallet connection on production URL
- [ ] Test contract creation flow
- [ ] Verify contract addresses are correct
- [ ] Check that all links and navigation work
- [ ] Test on mobile devices
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)

---

## Post-Deployment Verification

1. **Homepage loads correctly**
   - Visit your production URL
   - Verify all sections render

2. **Wallet Connection**
   - Click "Connect Wallet"
   - Verify MetaMask/other wallets connect
   - Check network is Arc Testnet (chain ID 5042002)

3. **Contract Creation**
   - Navigate to `/create`
   - Fill out form and create a test contract
   - Verify transaction succeeds

4. **Dashboard**
   - Navigate to `/dashboard`
   - Verify contracts load
   - Check stats display correctly

5. **Contract Details**
   - Click on a contract
   - Verify all details load
   - Test milestone submission/approval

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

### Environment Variables Not Working

- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Restart the build after adding new variables
- Check variable names match exactly (case-sensitive)

### Wallet Connection Issues

- Verify `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly
- Check that Arc Testnet is configured in user's wallet
- Ensure RPC URL is accessible

### Contract Interaction Fails

- Verify contract addresses are correct
- Check that contracts are deployed to Arc Testnet
- Verify user has test USDC tokens

---

## Monitoring & Analytics

Consider setting up:

1. **Error Tracking**: Sentry, LogRocket, or similar
2. **Analytics**: Google Analytics, Plausible, or Vercel Analytics
3. **Uptime Monitoring**: UptimeRobot, Pingdom
4. **Performance**: Vercel Analytics, Lighthouse CI

---

## Support

For issues or questions:
- Check contract deployment: `contracts/deploy_output.txt`
- Review logs in hosting platform dashboard
- Check browser console for errors

---

## Next Steps After Deployment

1. Set up custom domain
2. Configure SSL/HTTPS (automatic on Vercel/Netlify)
3. Set up monitoring and alerts
4. Create user documentation
5. Plan for mainnet deployment when ready


