import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mcpServers, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // Fetch the server
    const serverResult = await db
      .select()
      .from(mcpServers)
      .where(
        and(
          eq(mcpServers.id, serverId),
          eq(mcpServers.projectId, id)
        )
      )
      .limit(1);

    if (serverResult.length === 0) {
      return NextResponse.json(
        { error: 'Server not found', code: 'SERVER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const server = serverResult[0];

    // Verify project ownership
    const projectResult = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (projectResult.length === 0 || projectResult[0].userId !== userId) {
      return NextResponse.json(
        { error: 'Server not found', code: 'SERVER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Perform MCP handshake
    let cachedTools: any[] = [];
    
    try {
      const handshakeResponse = await fetch(server.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${server.authToken}`,
        },
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
            error: 'MCP handshake failed: Invalid authentication token',
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
            hint: 'Check if the Base URL and Auth Token are correct'
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
    const updatedServer = await db
      .update(mcpServers)
      .set({
        cachedTools: cachedTools,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(mcpServers.id, serverId))
      .returning();

    if (updatedServer.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update server', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedServer[0], { status: 200 });

  } catch (error: any) {
    console.error('POST /api/projects/[id]/servers/[serverId]/refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}