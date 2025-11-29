import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = await createClient();

    // Step 2: Look up API key and get project_id
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_string', apiKeyString)
      .single();

    if (keyError || !apiKey) {
      return NextResponse.json(
        { error: 'Invalid API key', code: 'INVALID_API_KEY' },
        { status: 401 }
      );
    }

    if (!apiKey.is_active) {
      return NextResponse.json(
        { error: 'API key is inactive', code: 'INACTIVE_API_KEY' },
        { status: 403 }
      );
    }

    const projectId = apiKey.project_id;

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
      const { data: serverResult, error: serverError } = await supabase
        .from('mcp_servers')
        .select('*')
        .eq('project_id', projectId)
        .eq('name', serverName)
        .eq('is_active', true)
        .single();

      if (serverError || !serverResult) {
        await logAuditEntry(supabase, projectId, apiKey.id, serverName, toolName, 'error', body, {
          error: 'Server not found',
        });

        return NextResponse.json(
          { error: `MCP server '${serverName}' not found in this project`, code: 'SERVER_NOT_FOUND' },
          { status: 404 }
        );
      }

      server = serverResult;
    } else if (toolName) {
      // Search all servers in the project to find one with this tool
      const { data: allServers } = await supabase
        .from('mcp_servers')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (allServers) {
        for (const s of allServers) {
          if (s.cached_tools) {
            let tools: any[] = [];
            
            if (Array.isArray(s.cached_tools)) {
              tools = s.cached_tools;
            } else if (s.cached_tools.tools && Array.isArray(s.cached_tools.tools)) {
              tools = s.cached_tools.tools;
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
      }

      if (!server) {
        await logAuditEntry(supabase, projectId, apiKey.id, null, toolName, 'error', body, {
          error: 'No server found with requested tool',
        });

        return NextResponse.json(
          { error: `No MCP server found with tool '${toolName}'`, code: 'TOOL_NOT_FOUND' },
          { status: 404 }
        );
      }
    } else {
      await logAuditEntry(supabase, projectId, apiKey.id, null, null, 'error', body, {
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
    if (apiKey.allowed_tools && Array.isArray(apiKey.allowed_tools) && apiKey.allowed_tools.length > 0) {
      if (toolName && !apiKey.allowed_tools.includes(toolName)) {
        await logAuditEntry(supabase, projectId, apiKey.id, serverName, toolName, 'error', body, {
          error: 'Tool not allowed',
        });

        return NextResponse.json(
          { error: `Tool '${toolName}' is not allowed for this API key`, code: 'TOOL_NOT_ALLOWED' },
          { status: 403 }
        );
      }
    }

    // Step 6: Check blacklist words
    if (apiKey.blacklist_words && Array.isArray(apiKey.blacklist_words) && apiKey.blacklist_words.length > 0) {
      const bodyString = JSON.stringify(body).toLowerCase();
      for (const word of apiKey.blacklist_words) {
        if (bodyString.includes(word.toLowerCase())) {
          await logAuditEntry(supabase, projectId, apiKey.id, serverName, toolName, 'error', body, {
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

    // Step 7: Forward request to MCP server with optional token
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Only add Authorization header if token exists
      if (server.auth_token) {
        headers['Authorization'] = `Bearer ${server.auth_token}`;
      }

      const response = await fetch(server.base_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      // Log successful request
      await logAuditEntry(supabase, projectId, apiKey.id, serverName, toolName, 'success', body, responseData);

      return NextResponse.json(responseData, { status: response.status });
    } catch (error) {
      console.error('Error forwarding to MCP server:', error);

      await logAuditEntry(supabase, projectId, apiKey.id, serverName, toolName, 'error', body, {
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
  supabase: any,
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
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    const userId = project ? project.user_id : null;

    await supabase
      .from('audit_logs')
      .insert({
        project_id: projectId,
        api_key_id: apiKeyId,
        user_id: userId,
        server_name: serverName,
        tool_name: toolName,
        status,
        request_body: requestBody,
        response_body: responseBody,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}