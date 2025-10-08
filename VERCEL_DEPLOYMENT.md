# Vercel Deployment Guide for Denkam Waters Frontend

## Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com)
- Your backend running on Render at: https://c-water-bilingsytsme.onrender.com

## Step 1: Push to GitHub
Make sure all your latest changes are pushed to your GitHub repository.

## Step 2: Connect to Vercel

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Sign in with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Select "Import Git Repository"
   - Choose your repository: `kb-diplo/C-Water-bilingsytsme`

3. **Configure Project**
   - **Project Name**: `denkam-waters-frontend`
   - **Framework Preset**: Angular
   - **Root Directory**: `water-billing-angular`
   - **Build Command**: `npm run build:vercel`
   - **Output Directory**: `dist/water-billing-angular`

4. **Environment Variables** (if needed)
   - Add any environment variables your app needs
   - For production, it will use `environment.prod.ts`

## Step 3: Deploy
- Click "Deploy"
- Vercel will automatically build and deploy your app
- You'll get a URL like: `https://denkam-waters-frontend.vercel.app`

## Step 4: Custom Domain (Optional)
1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain (e.g., `denkamwaters.co.ke`)
4. Follow Vercel's DNS configuration instructions

## Step 5: Automatic Deployments
- Every push to `master` branch will automatically trigger a new deployment
- Preview deployments are created for pull requests

## Configuration Files Created:
- `vercel.json` - Vercel deployment configuration
- Updated `package.json` - Build scripts for Vercel
- Updated `environment.prod.ts` - Points to Render backend
- Updated backend CORS - Allows Vercel domains

## Backend Connection:
Your frontend will connect to your Render backend at:
`https://c-water-bilingsytsme.onrender.com/api`

## Benefits of Vercel:
- ✅ Faster global CDN
- ✅ Automatic HTTPS
- ✅ Better performance
- ✅ Automatic deployments from GitHub
- ✅ Preview deployments for testing
- ✅ Built-in analytics
- ✅ Edge functions support

## Troubleshooting:
- If build fails, check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify the build command works locally: `npm run build:vercel`
