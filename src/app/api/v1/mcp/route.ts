import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { apiKeys, mcpServers, projects, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Step 1: Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const apiKeyString = authHeader.substring(7); // Remove 'Bearer '

    // Step 2: Look up API key and get project_id
    const apiKeyResult = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyString, apiKeyString))
      .limit(1);

    if (apiKeyResult.length === 0) {
      return NextResponse.json(
        { error: 'Invalid API key', code: 'INVALID_API_KEY' },
        { status: 401 }
      );
    }

    const apiKey = apiKeyResult[0];

    if (!apiKey.isActive) {
      return NextResponse.json(
        { error: 'API key is inactive', code: 'INACTIVE_API_KEY' },
        { status: 403 }
      );
    }

    const projectId = apiKey.projectId;

    // Step 3: Parse request body to find server_name or tool name
    const body = await request.json();
    let serverName: string | null = null;
    let toolName: string | null = null;

    // Try to extract server name from request
    if (body.server_name) {
      serverName = body.server_name;
    } else if (body.tool) {
      toolName = body.tool;
      // If we have a tool name, we need to find which server has this tool
      // For now, we'll try to match by checking cached_tools
    } else if (body.method) {
      // Extract tool name from method if available
      toolName = body.method;
    }

    // Step 4: Look up the MCP server
    let server: any = null;

    if (serverName) {
      // Direct lookup by server name
      const serverResult = await db
        .select()
        .from(mcpServers)
        .where(
          and(
            eq(mcpServers.projectId, projectId),
            eq(mcpServers.name, serverName),
            eq(mcpServers.isActive, true)
          )
        )
        .limit(1);

      if (serverResult.length === 0) {
        await logAuditEntry(projectId, apiKey.id, serverName, toolName, 'error', body, {
          error: 'Server not found',
        });

        return NextResponse.json(
          { error: `MCP server '${serverName}' not found in this project`, code: 'SERVER_NOT_FOUND' },
          { status: 404 }
        );
      }

      server = serverResult[0];
    } else if (toolName) {
      // Search all servers in the project to find one with this tool
      const allServers = await db
        .select()
        .from(mcpServers)
        .where(
          and(
            eq(mcpServers.projectId, projectId),
            eq(mcpServers.isActive, true)
          )
        );

      for (const s of allServers) {
        if (s.cachedTools) {
          let tools: any[] = [];
          
          if (Array.isArray(s.cachedTools)) {
            tools = s.cachedTools;
          } else if (s.cachedTools.tools && Array.isArray(s.cachedTools.tools)) {
            tools = s.cachedTools.tools;
          }

          const hasToolName = tools.some((tool: any) => {
            const tName = typeof tool === 'string' ? tool : tool.name;
            return tName === toolName;
          });

          if (hasToolName) {
            server = s;
            serverName = s.name;
            break;
          }
        }
      }

      if (!server) {
        await logAuditEntry(projectId, apiKey.id, null, toolName, 'error', body, {
          error: 'No server found with requested tool',
        });

        return NextResponse.json(
          { error: `No MCP server found with tool '${toolName}'`, code: 'TOOL_NOT_FOUND' },
          { status: 404 }
        );
      }
    } else {
      await logAuditEntry(projectId, apiKey.id, null, null, 'error', body, {
        error: 'Missing server_name or tool identifier',
      });

      return NextResponse.json(
        { 
          error: 'Missing server_name or tool identifier in request', 
          code: 'MISSING_SERVER_IDENTIFIER',
          hint: 'Include server_name, tool, or method in your request body'
        },
        { status: 400 }
      );
    }

    // Step 5: Check allowed tools if specified
    if (apiKey.allowedTools && Array.isArray(apiKey.allowedTools) && apiKey.allowedTools.length > 0) {
      if (toolName && !apiKey.allowedTools.includes(toolName)) {
        await logAuditEntry(projectId, apiKey.id, serverName, toolName, 'error', body, {
          error: 'Tool not allowed',
        });

        return NextResponse.json(
          { error: `Tool '${toolName}' is not allowed for this API key`, code: 'TOOL_NOT_ALLOWED' },
          { status: 403 }
        );
      }
    }

    // Step 6: Check blacklist words
    if (apiKey.blacklistWords && Array.isArray(apiKey.blacklistWords) && apiKey.blacklistWords.length > 0) {
      const bodyString = JSON.stringify(body).toLowerCase();
      for (const word of apiKey.blacklistWords) {
        if (bodyString.includes(word.toLowerCase())) {
          await logAuditEntry(projectId, apiKey.id, serverName, toolName, 'error', body, {
            error: 'Blacklisted word detected',
            word,
          });

          return NextResponse.json(
            { error: 'Request contains blacklisted content', code: 'BLACKLIST_VIOLATION' },
            { status: 403 }
          );
        }
      }
    }

    // Step 7: Forward request to MCP server with token swap
    try {
      const response = await fetch(server.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${server.authToken}`,
        },
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      // Log successful request
      await logAuditEntry(projectId, apiKey.id, serverName, toolName, 'success', body, responseData);

      return NextResponse.json(responseData, { status: response.status });
    } catch (error) {
      console.error('Error forwarding to MCP server:', error);

      await logAuditEntry(projectId, apiKey.id, serverName, toolName, 'error', body, {
        error: 'Failed to forward request',
        details: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        { 
          error: 'Failed to forward request to MCP server', 
          code: 'FORWARD_FAILED',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Internal proxy error', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to log audit entries
async function logAuditEntry(
  projectId: string,
  apiKeyId: string,
  serverName: string | null,
  toolName: string | null,
  status: string,
  requestBody: any,
  responseBody: any
) {
  try {
    // Get project to find userId
    const projectResult = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const userId = projectResult.length > 0 ? projectResult[0].userId : null;

    await db.insert(auditLogs).values({
      projectId,
      apiKeyId,
      userId,
      serverName,
      toolName,
      status,
      requestBody,
      responseBody,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}
