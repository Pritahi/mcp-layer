#!/bin/bash

# MCP Layer Vercel Deployment Script
# Run this script after setting up Node.js 20+ and Vercel CLI

echo "🚀 MCP Layer Vercel Deployment Script"
echo "======================================"
echo ""

# Check if Node.js version is 20+
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version $NODE_VERSION detected. Please upgrade to Node.js 20+"
    echo "   Run: nvm install 20 && nvm use 20"
    exit 1
fi
echo "✅ Node.js version $(node --version) - OK"
echo ""

# Check if Vercel CLI is installed
echo "📋 Checking Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Vercel CLI. Try with sudo or use npx."
        exit 1
    fi
fi
echo "✅ Vercel CLI $(vercel --version) - OK"
echo ""

# Check if user is logged in to Vercel
echo "📋 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please login:"
    echo "   Run: vercel login"
    echo "   Or:  vercel login --github"
    exit 1
fi
VERCEL_USER=$(vercel whoami)
echo "✅ Logged in as: $VERCEL_USER"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "📋 Found .env.local file"
    echo "   Make sure your Supabase environment variables are set:"
    grep -E "NEXT_PUBLIC_SUPABASE" .env.local || echo "   ⚠️  No Supabase variables found in .env.local"
else
    echo "⚠️  No .env.local file found."
    echo "   Create one with your Supabase credentials:"
    echo "   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key"
    echo ""
fi

echo "🔄 Starting deployment process..."
echo ""

# Deploy to Vercel
echo "📤 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. ✅ Visit your Vercel dashboard: https://vercel.com/dashboard"
    echo "   2. ✅ Configure environment variables in Vercel dashboard"
    echo "   3. ✅ Set up Supabase database using supabase-migration.sql"
    echo "   4. ✅ Test your deployment"
    echo ""
    echo "🔗 Useful links:"
    echo "   • Vercel Dashboard: https://vercel.com/dashboard"
    echo "   • Your Project: https://vercel.com/dashboard/your-username/MCP-layer"
    echo "   • Supabase Dashboard: https://app.supabase.com"
    echo ""
    echo "📚 Documentation:"
    echo "   • VERCEL-DEPLOYMENT.md - Complete deployment guide"
    echo "   • supabase-migration.sql - Database setup script"
    echo "   • README-ACTUAL.md - Project documentation"
    echo ""
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    echo ""
    echo "🛠️  Troubleshooting:"
    echo "   1. Check that your Node.js version is 20+"
    echo "   2. Ensure you're logged in to Vercel"
    echo "   3. Verify your environment variables are set"
    echo "   4. Check the build logs in Vercel dashboard"
    echo ""
    echo "📖 For more help, see VERCEL-DEPLOYMENT.md"
    exit 1
fi