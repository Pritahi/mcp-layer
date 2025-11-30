# MCP Guard - Production-Ready MCP Proxy Gateway

MCP Guard is a sophisticated **Model Context Protocol (MCP) proxy gateway** that provides enterprise-grade project management, intelligent request routing, and comprehensive access control for MCP servers.

## 🚀 Features

### ✅ **Project-Based Server Organization**
- Group multiple MCP servers under individual projects
- Hierarchical organization for better management
- User-scoped project isolation

### ✅ **Automatic Tool Discovery & Caching**
- **MCP Handshake**: Automatically discovers and caches available tools from each MCP server
- **Smart Caching**: Tools are cached in `cached_tools` JSONB field for fast lookup
- **No Manual Entry**: Tools are discovered automatically during server setup

### ✅ **Intelligent Request Routing**
- Routes by `server_name` OR tool name
- Searches cached tools to find the correct server
- Handles multiple servers per project seamlessly

### ✅ **Fine-Grained Access Control**
- **API Key-Based Authentication**: Each key can access all servers in a project
- **Tool Allowlists**: Specify exact tools each key can access
- **Blacklist Filtering**: Block requests containing specific words
- **Active/Inactive Toggle**: Enable/disable keys as needed

### ✅ **Complete Audit Trail**
- **Request Logging**: Every API call is logged with full details
- **Request/Response Bodies**: Complete audit trail for debugging
- **Link Tracking**: Logs link to project, API key, user, and server
- **Status Tracking**: Success/failure status for each request

### ✅ **Production-Ready Architecture**
- **Real Supabase Integration**: No local databases, connects to your Supabase instance
- **Scalable Design**: Built for high-throughput production environments
- **Error Handling**: Comprehensive error handling with detailed diagnostics

## 🏗️ Architecture

### Database Schema (Supabase)

**4 Core Tables:**

1. **`projects`** - Top-level organization
   - Groups multiple MCP servers under one project
   - Each user can have multiple projects

2. **`mcp_servers`** - Server credentials & cached tools
   - Stores connection details for each MCP server
   - **Automatically caches tools via handshake** on creation
   - `cached_tools` field stores the complete tool list as JSON

3. **`api_keys`** - Proxy keys for external access
   - One key can access ALL servers in a project
   - Optional `allowed_tools` array for fine-grained control
   - `blacklist_words` array for content filtering

4. **`audit_logs`** - Complete request tracking
   - Links to project, API key, and user
   - Stores full request/response for debugging

## 🔄 How MCP Handshake Works

### Step 1: Add MCP Server (Frontend)
**Location:** `/projects/[id]` → "Connections" Tab → "Add Server" button

**Form Fields:**
- **Name** (e.g., "github") - Must match AI service name
- **Base URL** - The MCP server endpoint
- **Auth Token** - Bearer token for authentication

### Step 2: Automatic Handshake (Backend)
When you click "Add Server", the backend:

1. **Validates inputs**
2. **Calls MCP server's list_tools endpoint**:
   ```javascript
   // POST {baseUrl}
   {
     jsonrpc: '2.0',
     method: 'tools/list',
     params: {},
     id: 'handshake-timestamp'
   }
   ```
3. **Extracts tools from response**
4. **Saves to database with cached tools**

**Handshake Error Handling:**
- ❌ **401** - Invalid auth token
- ❌ **Connection refused** - Server not running
- ❌ **Not found** - Invalid URL
- ❌ **Timeout** - Server not responding

### Step 3: Create API Key (Frontend)
**Location:** `/projects/[id]` → "Access" Tab → "Create API Key" button

**Features:**
- **Tool Checklist** - Shows ALL tools from ALL connected servers
- **Allowed Tools** - Select specific tools this key can access (optional)
- **Blacklist Words** - Block requests containing certain words
- Generates `sk_live_xxx` format key

### Step 4: Proxy Request Flow
**Endpoint:** `POST /api/v1/mcp`

```bash
curl -X POST https://your-app.com/api/v1/mcp \
  -H "Authorization: Bearer sk_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "server_name": "github",
    "method": "create_issue",
    "params": {
      "title": "Bug report",
      "body": "Description here"
    }
  }'
```

**Proxy Logic:**
1. Extract API key from Authorization header
2. Look up `project_id` from api_keys table
3. Extract `server_name` (or infer from tool name)
4. Find `mcp_server` WHERE `project_id = X` AND `name = "github"`
5. Check `allowed_tools` (if specified)
6. Check `blacklist_words`
7. Forward request to `server.base_url` with `server.auth_token`
8. Log to `audit_logs`
9. Return response

## 🧪 Testing the Handshake

### Test with a Mock MCP Server

Create a simple test server to verify handshake:

```javascript
// test-mcp-server.js (Node.js)
const express = require('express');
const app = express();

app.use(express.json());

app.post('/', (req, res) => {
  const { method } = req.body;
  
  // Check auth
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer test-token-123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Handle tools/list
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      result: {
        tools: [
          {
            name: "create_issue",
            description: "Create a GitHub issue",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                body: { type: "string" }
              }
            }
          },
          {
            name: "list_repos",
            description: "List user repositories"
          }
        ]
      },
      id: 'handshake-response'
    });
  }
  
  // Handle actual tool calls
  res.json({ result: "Tool executed successfully" });
});

app.listen(3001, () => {
  console.log('Mock MCP server running on http://localhost:3001');
});
```

**Run:** `node test-mcp-server.js`

Then in MCP Guard:
1. Go to `/projects/[id]`
2. Click "Add Server"
3. Fill in:
   - Name: `github`
   - Base URL: `http://localhost:3001`
   - Auth Token: `test-token-123`
4. Submit

**Expected Result:**
- ✅ Server connects successfully
- ✅ `cached_tools` saved with 2 tools
- ✅ Tools appear in "Create API Key" checklist

## 📚 API Reference

### Create Project
```bash
POST /api/projects
Content-Type: application/json

{
  "userId": "user-123",
  "name": "My Project"
}
```

### Add MCP Server (with handshake)
```bash
POST /api/projects/{projectId}/servers
Content-Type: application/json

{
  "name": "github",
  "baseUrl": "https://mcp-server.com",
  "authToken": "Bearer token"
}

# Response includes cached_tools from handshake
```

### Create API Key
```bash
POST /api/projects/{projectId}/keys
Content-Type: application/json

{
  "label": "Production Key",
  "allowedTools": ["create_issue", "list_repos"],
  "blacklistWords": ["delete", "admin"]
}

# Returns: { keyString: "sk_live_..." }
```

### Proxy Request
```bash
POST /api/v1/mcp
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "server_name": "github",
  "method": "create_issue",
  "params": { ... }
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Supabase account and project
- npm/yarn/pnpm/bun package manager

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Pritahi/MCP-layer.git
cd MCP-layer
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. **Set up Supabase database:**
   - Create the database tables in your Supabase dashboard
   - Use the schema from `ARCHITECTURE-GUIDE.md`

5. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── v1/mcp/route.ts         # Main proxy endpoint
│   │   └── projects/
│   │       ├── route.ts             # List/create projects
│   │       └── [id]/
│   │           ├── route.ts         # Project details
│   │           ├── servers/
│   │           │   └── route.ts     # Add/list servers (HANDSHAKE HERE)
│   │           └── keys/
│   │               └── route.ts     # Create/list API keys
│   ├── projects/
│   │   ├── page.tsx                 # Projects list
│   │   └── [id]/
│   │       └── page.tsx             # Project details (Tabs)
│   └── login/page.tsx               # Authentication
├── components/
│   └── projects/
│       ├── add-server-dialog.tsx    # Add server form
│       ├── servers-tab.tsx          # Connections tab
│       ├── create-api-key-dialog.tsx # API key creation
│       └── api-keys-tab.tsx         # Access tab
└── lib/supabase/
    ├── client.ts                    # Browser client
    └── server.ts                    # Server client
```

## 🔑 Key Features Implemented

### ✅ Tool Discovery & Caching
- Automatic handshake on server creation
- Tools stored in `cached_tools` JSONB field
- No manual tool entry required

### ✅ Intelligent Request Routing
- Routes by `server_name` OR tool name
- Searches cached_tools to find correct server
- Handles multiple servers per project

### ✅ Access Control
- Per-key tool allowlists
- Blacklist word filtering
- Active/inactive toggle

### ✅ Audit Logging
- Every request logged
- Links to project, key, user, server
- Full request/response bodies

### ✅ Error Handling
- Detailed error codes
- Handshake failure messages
- Connection diagnostics

## 🚀 Next Steps

1. **Test the handshake** with a real or mock MCP server
2. **Create a project** at `/projects`
3. **Add MCP servers** with real credentials
4. **Generate API keys** with tool restrictions
5. **Test the proxy** at `/api/v1/mcp`
6. **View audit logs** in project details

## 🎯 Summary

Your MCP Guard application now supports:

✅ **Multi-server projects** - Organize servers under projects  
✅ **Automatic tool discovery** - Handshake fetches & caches tools  
✅ **Smart routing** - Routes requests by server or tool name  
✅ **Fine-grained access** - Tool allowlists & blacklists  
✅ **Complete audit trail** - Log every request  

**Everything is production-ready and fully functional!** 🎉

---

**Built with ❤️ using Next.js, Supabase, and TypeScript**