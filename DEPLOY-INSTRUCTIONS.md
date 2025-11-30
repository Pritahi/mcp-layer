# 🚀 Vercel Deployment Steps

## Manual Deployment Instructions

Since the CLI requires interactive authentication, here's how to deploy your MCP Layer project to Vercel:

### **Option 1: GitHub Integration (Recommended)**

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "New Project"**
3. **Import from GitHub**: Select your repository `Pritahi/MCP-layer`
4. **Configure Project**:
   - Framework Preset: Next.js
   - Root Directory: `/` (default)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
5. **Environment Variables**: Add these in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://qzzamzaigvxveejwplbu.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6emFtemFpZ3Z4dmVlandwbGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMjcxMTAsImV4cCI6MjA3OTcwMzExMH0.ulLofPo5MYpN0l_lG7V-bud46sRPpXL_WCNJm6v6Fac
   ```

6. **Deploy**: Click "Deploy" button

### **Option 2: Vercel CLI with Token**

If you want to use CLI later, set up your Vercel token:

```bash
# Get your token from: https://vercel.com/account/tokens
export VERCEL_TOKEN="your_vercel_token"

# Then deploy:
npx vercel@32.6.1 --token $VERCEL_TOKEN --prod
```

### **Option 3: Manual Build and Deploy**

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Go to Vercel Dashboard** and create new project
3. **Upload built files** or use GitHub integration

## **Ready-to-Deploy Configuration**

Your project is already configured with:

✅ **vercel.json** - Vercel optimization settings
✅ **package.json** - All dependencies and build scripts
✅ **.env.local** - Supabase environment variables
✅ **Next.js 15** - Framework properly configured
✅ **Supabase Integration** - Database connection ready

## **Post-Deployment Steps**

1. **Create Supabase Tables**: Run `supabase-migration.sql` in your Supabase dashboard
2. **Test Deployment**: Visit your Vercel URL
3. **Test MCP API**: Make requests to `/api/v1/mcp`

## **Expected Result**

After deployment, your MCP Guard will be available at:
- **Frontend**: `https://your-project-name.vercel.app`
- **API**: `https://your-project-name.vercel.app/api/v1/mcp`
- **Dashboard**: Full MCP server management interface

---

**The deployment files are ready! Use the GitHub integration approach above for the easiest deployment experience.**