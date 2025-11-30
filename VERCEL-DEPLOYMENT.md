# 🚀 Vercel Deployment Guide for MCP Layer

## Prerequisites

### 1. **Update Node.js to Version 20+**
Vercel requires Node.js 20 or higher:
```bash
# Check current version
node --version

# Update Node.js using nvm (recommended)
nvm install 20
nvm use 20

# Or use n (another version manager)
npm install -g n
n 20
```

### 2. **Install Vercel CLI**
```bash
# Global installation (recommended)
npm install -g vercel

# Or use npx without global install
npx vercel@latest
```

### 3. **Login to Vercel**
```bash
# Login using email/password
vercel login

# Or use GitHub (recommended for GitHub projects)
vercel login --github

# Or use personal access token
vercel login --token YOUR_VERCEL_TOKEN
```

## Deployment Steps

### Step 1: Navigate to Project Directory
```bash
cd /path/to/your/MCP-layer
```

### Step 2: Deploy to Vercel
```bash
# Deploy with Vercel CLI
vercel

# Or deploy with specific settings
vercel --prod  # Deploy to production immediately
```

### Step 3: Environment Variables Setup

After deployment, you'll need to set up environment variables in Vercel dashboard:

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: MCP-layer
3. **Go to Settings → Environment Variables**
4. **Add these variables**:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Example values (replace with your actual Supabase credentials):
# NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Build and Deploy
```bash
# Force redeploy with environment variables
vercel --prod

# Or redeploy specific deployment
vercel --prod YOUR_DEPLOYMENT_ID
```

## Auto-Deployment Setup

### Connect GitHub Repository (Optional but Recommended)
1. **Go to Vercel Dashboard**
2. **Import Project**: Click "Import Project"
3. **Connect GitHub**: Select your repository `https://github.com/Pritahi/MCP-layer.git`
4. **Configure Settings**:
   - Framework Preset: Next.js
   - Root Directory: `/` (root)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Environment Variables in Vercel Dashboard
Configure environment variables in:
- **Development**: Local development
- **Preview**: GitHub pull requests  
- **Production**: Main branch deployments

## Database Setup

### Create Supabase Tables
Run this SQL in your Supabase SQL Editor:

```sql
-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mcp_servers table
CREATE TABLE mcp_servers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_keys table
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  request_headers JSONB,
  response_headers JSONB,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_mcp_servers_project_id ON mcp_servers(project_id);
CREATE INDEX idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_project_created ON audit_logs(project_id, created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth requirements)
-- These are basic policies - modify according to your access control needs
CREATE POLICY "Enable read access for authenticated users" ON projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON projects
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON projects
  FOR DELETE USING (auth.role() = 'authenticated');

-- Similar policies for other tables...
```

## Troubleshooting

### Common Issues:

1. **Node.js Version Error**
   ```bash
   # Update Node.js to version 20+
   nvm install 20 && nvm use 20
   ```

2. **Permission Denied**
   ```bash
   # Use npx instead of global install
   npx vercel@latest
   ```

3. **Build Errors**
   ```bash
   # Clear cache and rebuild
   npm run clean-install  # if you have this script
   npm run build
   ```

4. **Environment Variables Not Working**
   - Ensure variables start with `NEXT_PUBLIC_` for client-side access
   - Redeploy after adding environment variables

5. **Supabase Connection Issues**
   - Verify Supabase URL and ANON_KEY are correct
   - Check Supabase dashboard for project status
   - Ensure RLS policies allow access

### Useful Commands:

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs YOUR_DEPLOYMENT_ID

# Redeploy
vercel --prod

# Link to existing project
vercel link

# Unlink project
vercel unlink
```

## Post-Deployment

### 1. **Test Your Deployment**
Visit your Vercel URL: `https://your-project.vercel.app`

### 2. **Test MCP API Endpoint**
```bash
# Test the MCP proxy endpoint
curl -X POST https://your-project.vercel.app/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}'
```

### 3. **Monitor Performance**
- Check Vercel Analytics
- Monitor Supabase dashboard for data flow
- Review audit logs in your application

## Production Checklist

- [ ] ✅ Node.js version 20+ installed
- [ ] ✅ Vercel CLI installed and authenticated
- [ ] ✅ Environment variables configured
- [ ] ✅ Supabase database tables created
- [ ] ✅ RLS policies configured
- [ ] ✅ GitHub repository connected (auto-deployment)
- [ ] ✅ Production deployment tested
- [ ] ✅ MCP API endpoint working
- [ ] ✅ Environment variables working
- [ ] ✅ Error monitoring setup

**Your MCP Layer is now ready for production! 🎉**