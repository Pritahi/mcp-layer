-- MCP Guard - Production-Ready Database Schema
-- This file is for REFERENCE ONLY - the schema is already implemented in src/db/schema.ts

-- Drop existing tables (if resetting)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS mcp_servers;
DROP TABLE IF EXISTS projects;

-- 1. Projects Table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 2. MCP Servers Table (Stores credentials & cached tools)
CREATE TABLE mcp_servers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- AI service name like 'github', 'slack'
  base_url TEXT NOT NULL,
  auth_token TEXT NOT NULL, -- Encrypted/secure in production
  cached_tools TEXT, -- JSONB - stores tools from handshake
  is_active INTEGER NOT NULL DEFAULT 1, -- Boolean: 1 = true, 0 = false
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. API Keys Table (The Proxy Key)
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key_string TEXT NOT NULL UNIQUE, -- sk_live_... format
  label TEXT NOT NULL,
  allowed_tools TEXT, -- JSONB - Array of tool names
  blacklist_words TEXT, -- JSONB - Array of blacklisted words
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 4. Audit Logs Table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id TEXT,
  server_name TEXT,
  tool_name TEXT,
  status TEXT NOT NULL,
  request_body TEXT, -- JSONB
  response_body TEXT, -- JSONB
  created_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_mcp_servers_project_id ON mcp_servers(project_id);
CREATE INDEX idx_mcp_servers_name ON mcp_servers(name);
CREATE INDEX idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX idx_api_keys_key_string ON api_keys(key_string);
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_api_key_id ON audit_logs(api_key_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
