import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string; serverId: string; }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, serverId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    // Validate UUID format for id and serverId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      );
    }

    if (!uuidRegex.test(serverId)) {
      return NextResponse.json(
        { error: 'Invalid server ID format', code: 'INVALID_SERVER_ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the server
    const { data: server, error: serverError } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('id', serverId)
      .eq('project_id', id)
      .single();

    if (serverError || !server) {
      return NextResponse.json(
        { error: 'Server not found', code: 'SERVER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', id)
      .single();

    if (projectError || !project || project.user_id !== userId) {
      return NextResponse.json(
        { error: 'Server not found', code: 'SERVER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Perform MCP handshake
    let cachedTools: any[] = [];
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Only add Authorization header if token is provided
      if (server.auth_token) {
        headers['Authorization'] = `Bearer ${server.auth_token}`;
      }

      const handshakeResponse = await fetch(server.base_url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: `refresh-${Date.now()}`,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (handshakeResponse.status === 401) {
        return NextResponse.json(
          { 
            error: 'MCP handshake failed: Authentication required or invalid token',
            code: 'HANDSHAKE_AUTH_FAILED'
          },
          { status: 400 }
        );
      }

      if (handshakeResponse.status === 403) {
        return NextResponse.json(
          { 
            error: 'MCP handshake failed: Access forbidden',
            code: 'HANDSHAKE_FORBIDDEN'
          },
          { status: 400 }
        );
      }

      if (!handshakeResponse.ok) {
        const errorText = await handshakeResponse.text().catch(() => 'Unknown error');
        return NextResponse.json(
          { 
            error: `MCP handshake failed: Server returned status ${handshakeResponse.status}`,
            code: 'HANDSHAKE_ERROR',
            details: errorText,
            hint: 'Check if the Base URL is correct and if authentication is required'
          },
          { status: 400 }
        );
      }

      const handshakeData = await handshakeResponse.json();
      
      // Extract tools from JSON-RPC response
      if (handshakeData.result?.tools) {
        cachedTools = handshakeData.result.tools;
      } else if (handshakeData.tools) {
        cachedTools = handshakeData.tools;
      } else if (handshakeData.result && Array.isArray(handshakeData.result)) {
        cachedTools = handshakeData.result;
      } else {
        cachedTools = [];
      }

    } catch (error: any) {
      console.error('MCP handshake error:', error);
      
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'MCP handshake failed: Request timeout',
            code: 'HANDSHAKE_TIMEOUT'
          },
          { status: 400 }
        );
      }
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            error: 'MCP handshake failed: Connection refused',
            code: 'HANDSHAKE_CONNECTION_REFUSED'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `MCP handshake failed: ${error.message}`,
          code: 'HANDSHAKE_ERROR'
        },
        { status: 400 }
      );
    }

    // Update server with cached tools
    const { data: updatedServer, error: updateError } = await supabase
      .from('mcp_servers')
      .update({
        cached_tools: cachedTools,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serverId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update server', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedServer, { status: 200 });

  } catch (error: any) {
    console.error('POST /api/projects/[id]/servers/[serverId]/refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}