# ArcLancer - Go Live Guide

Your app is already deployed! Here's how to get your live URL and share it.

## Getting Your Live URL

### If Deployed on Vercel:

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Find your project** (should be named "arclancer" or similar)
3. **Click on the project**
4. **Your live URL is displayed** at the top, like:
   - `https://arclancer.vercel.app` (default)
   - Or your custom domain if configured

### If Deployed on Netlify:

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Find your site**
3. **Your live URL** is shown, like:
   - `https://arclancer.netlify.app`
   - Or your custom domain

### If Deployed Elsewhere:

Check your hosting platform's dashboard for the deployment URL.

---

## Quick Share URL

Once you have your URL, you can share it directly:

**Example**: `https://your-app.vercel.app`

---

## Pre-Launch Checklist

Before sharing widely, verify:

- [ ] **Homepage loads**: Visit your URL and check the homepage
- [ ] **Wallet connects**: Test connecting MetaMask/wallet
- [ ] **Network correct**: Users should connect to Arc Testnet (chain ID: 5042002)
- [ ] **Contract creation works**: Test creating a contract
- [ ] **Dashboard loads**: Check `/dashboard` page
- [ ] **Mobile responsive**: Test on mobile device

---

## Sharing Instructions for Users

When sharing your app, include these instructions:

### For First-Time Users:

1. **Install MetaMask** (if not already installed)
   - Chrome: https://chrome.google.com/webstore/detail/metamask
   - Firefox: https://addons.mozilla.org/firefox/addon/ether-metamask

2. **Add Arc Testnet to MetaMask**:
   - Network Name: `Arc Testnet`
   - RPC URL: `https://rpc.testnet.arc.network`
   - Chain ID: `5042002`
   - Currency Symbol: `USDC`
   - Block Explorer: `https://testnet.arcscan.app`

3. **Get Test USDC**:
   - Visit: https://faucet.circle.com
   - Select "Arc Testnet"
   - Request test tokens

4. **Connect Wallet**:
   - Visit your app URL
   - Click "Connect Wallet"
   - Select MetaMask and approve

5. **Start Using**:
   - Create contracts
   - Fund escrows
   - Submit milestones
   - Get paid!

---

## Quick Test Script

Share this with testers:

```
1. Visit: [YOUR_URL_HERE]
2. Click "Connect Wallet"
3. Switch to Arc Testnet in MetaMask
4. Get test USDC from https://faucet.circle.com
5. Create a test contract
6. Fund it and test the flow
```

---

## Troubleshooting for Users

### "Wrong Network" Error:
- User needs to switch MetaMask to Arc Testnet
- Chain ID must be 5042002

### "Insufficient Balance" Error:
- User needs test USDC from faucet
- Visit: https://faucet.circle.com

### "Transaction Failed" Error:
- Check user has enough USDC
- Verify contract addresses are correct
- Check RPC connection

---

## Your Current Deployment Info

**Contract Addresses** (already configured):
- EscrowFactory: `0x0ADf70A390868c7016697edF0640791c3B3e5f31`
- USDC: `0x3600000000000000000000000000000000000000`
- StableFX: `0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1`

**Network**: Arc Testnet (Chain ID: 5042002)

---

## Need Help?

If you can't find your deployment URL:
1. Check your email for deployment notifications
2. Check your hosting platform dashboard
3. Check your Git repository for deployment status (if using CI/CD)

---

## Next Steps

Once you have your URL:
1. ✅ Test it yourself
2. ✅ Share with a few trusted testers
3. ✅ Gather feedback
4. ✅ Fix any issues
5. ✅ Share publicly!

**Your live URL**: _________________________

Fill in the blank above with your actual deployment URL!


