import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', code: 'MISSING_PROJECT_ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if project exists
    const { data: existingProject, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !existingProject) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, baseUrl, authToken } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be at least 1 character', code: 'INVALID_NAME' },
        { status: 400 }
      );
    }

    if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'Base URL is required', code: 'INVALID_BASE_URL' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(baseUrl.trim());
    } catch {
      return NextResponse.json(
        { error: 'Base URL must be a valid URL', code: 'INVALID_URL_FORMAT' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedBaseUrl = baseUrl.trim();
    const sanitizedAuthToken = authToken && typeof authToken === 'string' ? authToken.trim() : null;

    // CRITICAL: Perform MCP handshake - call list_tools endpoint
    let cachedTools: any = null;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Only add Authorization header if token is provided
      if (sanitizedAuthToken) {
        headers['Authorization'] = `Bearer ${sanitizedAuthToken}`;
      }

      const handshakeResponse = await fetch(sanitizedBaseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: `handshake-${Date.now()}`,
        }),
      });

      if (!handshakeResponse.ok) {
        const errorText = await handshakeResponse.text().catch(() => 'Unknown error');
        
        if (handshakeResponse.status === 401) {
          return NextResponse.json(
            { 
              error: 'MCP handshake failed: Authentication required or invalid token', 
              code: 'HANDSHAKE_AUTH_FAILED',
              details: errorText
            },
            { status: 400 }
          );
        }

        if (handshakeResponse.status === 403) {
          return NextResponse.json(
            { 
              error: 'MCP handshake failed: Access forbidden', 
              code: 'HANDSHAKE_FORBIDDEN',
              details: errorText
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { 
            error: `MCP handshake failed: Server returned status ${handshakeResponse.status}`, 
            code: 'HANDSHAKE_FAILED',
            details: errorText,
            hint: 'Check if the Base URL is correct and if authentication is required'
          },
          { status: 400 }
        );
      }

      const handshakeData = await handshakeResponse.json();
      
      // Extract tools array from JSON-RPC response
      if (handshakeData && handshakeData.result && Array.isArray(handshakeData.result.tools)) {
        cachedTools = handshakeData.result.tools;
      } else if (handshakeData && Array.isArray(handshakeData.tools)) {
        cachedTools = handshakeData.tools;
      } else if (handshakeData && handshakeData.result) {
        cachedTools = handshakeData.result;
      } else {
        cachedTools = handshakeData;
      }

    } catch (error: any) {
      console.error('MCP handshake error:', error);
      
      if (error.cause?.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { 
            error: 'MCP handshake failed: Connection refused. Check if the server is running.', 
            code: 'HANDSHAKE_CONNECTION_REFUSED',
            details: error.message
          },
          { status: 400 }
        );
      }

      if (error.cause?.code === 'ENOTFOUND') {
        return NextResponse.json(
          { 
            error: 'MCP handshake failed: Server not found. Check the URL.', 
            code: 'HANDSHAKE_NOT_FOUND',
            details: error.message
          },
          { status: 400 }
        );
      }

      if (error.name === 'AbortError' || error.cause?.code === 'ETIMEDOUT') {
        return NextResponse.json(
          { 
            error: 'MCP handshake failed: Request timeout', 
            code: 'HANDSHAKE_TIMEOUT',
            details: error.message
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: 'MCP handshake failed: ' + error.message, 
          code: 'HANDSHAKE_ERROR',
          details: error.message
        },
        { status: 400 }
      );
    }

    // Create MCP server record with handshake results
    const now = new Date().toISOString();
    const { data: newServer, error: insertError } = await supabase
      .from('mcp_servers')
      .insert({
        project_id: projectId,
        name: sanitizedName,
        base_url: sanitizedBaseUrl,
        auth_token: sanitizedAuthToken,
        cached_tools: cachedTools,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert server error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create server' },
        { status: 500 }
      );
    }

    return NextResponse.json(newServer, { status: 201 });

  } catch (error: any) {
    console.error('POST MCP server error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', code: 'MISSING_PROJECT_ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if project exists
    const { data: existingProject, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !existingProject) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const { data: servers, error: serversError } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('project_id', projectId)
      .range(offset, offset + limit - 1);

    if (serversError) {
      console.error('Fetch servers error:', serversError);
      return NextResponse.json(
        { error: 'Failed to fetch servers' },
        { status: 500 }
      );
    }

    return NextResponse.json(servers || [], { status: 200 });

  } catch (error: any) {
    console.error('GET MCP servers error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}