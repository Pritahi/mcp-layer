import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Projects table - top-level organization
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

// MCP Servers table - stores server credentials and cached tools
export const mcpServers = sqliteTable('mcp_servers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // AI service name like 'github', 'slack'
  baseUrl: text('base_url').notNull(),
  authToken: text('auth_token').notNull(),
  cachedTools: text('cached_tools', { mode: 'json' }), // JSONB - stores tools from handshake
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// API Keys table - the proxy keys
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  keyString: text('key_string').notNull().unique(),
  label: text('label').notNull(),
  allowedTools: text('allowed_tools', { mode: 'json' }), // Array of tool names
  blacklistWords: text('blacklist_words', { mode: 'json' }), // Array of blacklisted words
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

// Audit Logs table - comprehensive request logging
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  apiKeyId: text('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  userId: text('user_id'),
  serverName: text('server_name'),
  toolName: text('tool_name'),
  status: text('status').notNull(),
  requestBody: text('request_body', { mode: 'json' }),
  responseBody: text('response_body', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});