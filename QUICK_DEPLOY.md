# Quick Deploy to Vercel - Get Your Live URL in 5 Minutes

## Option 1: Deploy via Vercel Website (Easiest - No CLI needed)

### Step 1: Prepare Your Code
1. Make sure your code is in a Git repository (GitHub, GitLab, or Bitbucket)
   - If not, create one:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin YOUR_REPO_URL
     git push -u origin main
     ```

### Step 2: Deploy on Vercel
1. Go to: **https://vercel.com/new**
2. Sign in with GitHub/GitLab/Bitbucket
3. Click **"Import Project"**
4. Select your repository
5. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto)
   - **Output Directory**: `.next` (auto)
   - **Install Command**: `npm install` (auto)

### Step 3: Add Environment Variables
Before deploying, click **"Environment Variables"** and add:

```
NEXT_PUBLIC_FACTORY_ADDRESS=0x0ADf70A390868c7016697edF0640791c3B3e5f31
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_EURC_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
NEXT_PUBLIC_STABLEFX_ADDRESS=0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1
NEXT_PUBLIC_ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo-project-id
```

### Step 4: Deploy!
Click **"Deploy"** and wait 2-3 minutes.

### Step 5: Get Your URL
Once deployed, you'll see:
- **Production URL**: `https://your-project.vercel.app`
- Copy this URL - that's your live app!

---

## Option 2: Deploy via Vercel CLI (Command Line)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
cd frontend
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (Select your account)
- Link to existing project? **No**
- Project name? **arclancer**
- Directory? **./** (current directory)
- Override settings? **No**

### Step 4: Add Environment Variables
```bash
vercel env add NEXT_PUBLIC_FACTORY_ADDRESS
# Enter: 0x0ADf70A390868c7016697edF0640791c3B3e5f31

vercel env add NEXT_PUBLIC_USDC_ADDRESS
# Enter: 0x3600000000000000000000000000000000000000

vercel env add NEXT_PUBLIC_EURC_ADDRESS
# Enter: 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a

vercel env add NEXT_PUBLIC_STABLEFX_ADDRESS
# Enter: 0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1

vercel env add NEXT_PUBLIC_ARC_TESTNET_RPC_URL
# Enter: https://rpc.testnet.arc.network

vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
# Enter: demo-project-id
```

### Step 5: Deploy to Production
```bash
vercel --prod
```

### Step 6: Get Your URL
After deployment, you'll see:
```
🔗 Production: https://your-project.vercel.app
```

---

## Troubleshooting

### "Build Failed"
- Check that you set `Root Directory` to `frontend` in Vercel settings
- Verify all environment variables are set
- Check build logs in Vercel dashboard

### "Module Not Found"
- Make sure `Root Directory` is set to `frontend`
- Verify `package.json` is in the frontend folder

### Can't Find Project
- Check you're logged into the correct Vercel account
- Look in "All Projects" in Vercel dashboard
- Check your email for deployment notifications

---

## After Deployment

1. ✅ Visit your URL
2. ✅ Test wallet connection
3. ✅ Test contract creation
4. ✅ Share with testers!

**Your Live URL will be**: `https://[project-name].vercel.app`


