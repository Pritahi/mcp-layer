# Git Setup Guide for MCP-layer

This guide will help you connect and push your changes to your GitHub repository.

## 🔗 Repository Connection

Your project is already connected to your GitHub repository:
- **Repository URL**: `https://github.com/Pritahi/MCP-layer.git`
- **Local Path**: `/workspace/MCP-layer`

## 📋 Setup Steps

### 1. Verify Git Configuration

Check your current git status:
```bash
cd /workspace/MCP-layer
git status
git remote -v
```

### 2. Configure Git User (if needed)

Set your git user information:
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 3. Add and Commit Changes

Stage and commit all your changes:
```bash
git add .
git commit -m "Fix: Convert MCP-layer to use real Supabase instead of Drizzle ORM

- Removed all Drizzle dependencies (drizzle-orm, drizzle-kit, @libsql/client)
- Deleted drizzle/ folder, drizzle.config.ts, database-schema.sql, src/db/
- Updated all server actions to use Supabase client instead of Drizzle
- Fixed API routes to connect to real Supabase database
- All environment variables now use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- Application ready for production deployment with real database
- Added comprehensive README with architecture documentation"
```

### 4. Push to GitHub

Push your changes to the main branch:
```bash
git push -u origin main
```

If you're working on a different branch:
```bash
git push -u origin your-branch-name
```

## 🔄 Ongoing Development Workflow

### For Future Changes:

1. **Make your changes** to the code
2. **Stage files**: `git add .`
3. **Commit with meaningful message**: `git commit -m "Description of changes"`
4. **Push to repository**: `git push`

### Example Development Workflow:

```bash
# Check what files have changed
git status

# Stage specific files or all changes
git add src/app/api/projects/route.ts
# or
git add .

# Commit with descriptive message
git commit -m "Add new MCP server validation features"

# Push to your repository
git push origin main
```

## 🛠️ Useful Git Commands

### Check Repository Status
```bash
git status              # Show working tree status
git log --oneline       # Show commit history
git remote -v          # Show remote repositories
```

### Branch Management
```bash
git branch             # List all branches
git checkout -b feature/new-feature  # Create and switch to new branch
git checkout main      # Switch to main branch
git merge feature-name # Merge branch into current branch
```

### Undo Changes
```bash
git checkout -- filename    # Discard changes in working directory
git reset HEAD filename     # Unstage a file
git reset --hard HEAD       # Reset to last commit (WARNING: discards all changes)
```

## 🔐 Authentication

### GitHub Personal Access Token (Recommended)
When pushing to GitHub, you'll need to authenticate. Use a Personal Access Token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` permissions
3. Use your GitHub username as username
4. Use the token as password when prompted

### SSH Setup (Alternative)
Configure SSH keys for passwordless authentication:
```bash
# Generate SSH key (if not already done)
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
pbcopy < ~/.ssh/id_ed25519.pub  # macOS
# or
xclip -selection clipboard < ~/.ssh/id_ed25519.pub  # Linux

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
```

## 📁 Project Status

### ✅ Currently Configured:
- Git repository initialized
- Remote origin set to `https://github.com/Pritahi/MCP-layer.git`
- Comprehensive `.gitignore` configured
- All changes committed and ready to push

### 📦 Files Ready for Push:
- All source code files
- Package configuration (`package.json`, `package-lock.json`)
- Next.js configuration
- Tailwind CSS setup
- TypeScript configuration
- Supabase integration files
- Architecture documentation
- Environment template (`.env.example`)

### 🚫 Files Ignored:
- `node_modules/` (dependencies)
- `.env` (environment variables)
- `.next/` (build output)
- Temporary files and logs
- Editor-specific files

## 🎯 Next Steps

1. **Run the git commands** from the steps above
2. **Push your changes** to GitHub
3. **Verify on GitHub** that all files are uploaded correctly
4. **Set up your Supabase** database with the required tables
5. **Configure environment variables** in your deployment platform
6. **Deploy and test** your application

## 🔧 Troubleshooting

### Push Rejected
If you get a push rejection error:
```bash
git pull origin main --rebase
git push origin main
```

### Authentication Issues
If you get authentication errors:
1. Check your GitHub username and email: `git config --list`
2. Use Personal Access Token instead of password
3. Ensure token has proper permissions

### Large Files
If you get errors about large files:
```bash
# Find large files
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | grep '^blob' | sort -k3 -n | tail -10

# Remove from git history (if needed)
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch path/to/large/file' --prune-empty --tag-name-filter cat -- --all
```

## 📞 Support

If you encounter any issues:
1. Check the git status: `git status`
2. Review commit history: `git log --oneline -10`
3. Verify remote configuration: `git remote -v`
4. Ensure you have the correct permissions on GitHub

Happy coding! 🚀