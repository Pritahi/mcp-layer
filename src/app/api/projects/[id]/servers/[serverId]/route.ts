import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mcpServers, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteContext {
  params: Promise<{
    id: string;
    serverId: string;
  }>;
}

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper function to perform MCP handshake
async function performMCPHandshake(baseUrl: string, authToken: string): Promise<any> {
  try {
    const response = await fetch(`${baseUrl}/list_tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`MCP handshake failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('MCP handshake error:', error);
    throw error;
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
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

    // Validate project ID is valid UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      );
    }

    // Validate server ID is valid UUID
    if (!isValidUUID(serverId)) {
      return NextResponse.json(
        { error: 'Invalid server ID format', code: 'INVALID_SERVER_ID' },
        { status: 400 }
      );
    }

    // Fetch the server
    const serverResult = await db
      .select()
      .from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, id)))
      .limit(1);

    if (serverResult.length === 0) {
      return NextResponse.json(
        { error: 'Server not found', code: 'SERVER_NOT_FOUND' },
        { status: 404 }
      );
    }

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

    return NextResponse.json(serverResult[0], { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id, serverId } = await context.params;
    
    // Validate serverId
    if (!serverId || !isValidUUID(serverId)) {
      return NextResponse.json({ 
        error: "Valid server ID is required",
        code: "INVALID_SERVER_ID" 
      }, { status: 400 });
    }

    // Validate projectId
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        error: "Valid project ID is required",
        code: "INVALID_PROJECT_ID" 
      }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { name, baseUrl, authToken, isActive } = body;

    // Check if server exists and belongs to project
    const existingServer = await db.select()
      .from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, id)))
      .limit(1);

    if (existingServer.length === 0) {
      return NextResponse.json({ 
        error: 'Server not found' 
      }, { status: 404 });
    }

    const currentServer = existingServer[0];

    // Prepare update object
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Add fields if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ 
          error: "Name must be a non-empty string",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json({ 
          error: "isActive must be a boolean",
          code: "INVALID_IS_ACTIVE" 
        }, { status: 400 });
      }
      updates.isActive = isActive;
    }

    // Check if baseUrl or authToken is being updated
    const needsHandshake = baseUrl !== undefined || authToken !== undefined;
    const finalBaseUrl = baseUrl !== undefined ? baseUrl : currentServer.baseUrl;
    const finalAuthToken = authToken !== undefined ? authToken : currentServer.authToken;

    if (baseUrl !== undefined) {
      if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
        return NextResponse.json({ 
          error: "Base URL must be a non-empty string",
          code: "INVALID_BASE_URL" 
        }, { status: 400 });
      }
      updates.baseUrl = baseUrl.trim();
    }

    if (authToken !== undefined) {
      if (typeof authToken !== 'string' || authToken.trim() === '') {
        return NextResponse.json({ 
          error: "Auth token must be a non-empty string",
          code: "INVALID_AUTH_TOKEN" 
        }, { status: 400 });
      }
      updates.authToken = authToken.trim();
    }

    // Perform MCP handshake if baseUrl or authToken changed
    if (needsHandshake) {
      try {
        const toolsResponse = await performMCPHandshake(finalBaseUrl, finalAuthToken);
        updates.cachedTools = toolsResponse;
      } catch (error) {
        console.error('MCP handshake failed:', error);
        return NextResponse.json({ 
          error: "MCP handshake failed. Please verify the base URL and auth token are correct.",
          code: "HANDSHAKE_FAILED",
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 });
      }
    }

    // Update server
    const updatedServer = await db.update(mcpServers)
      .set(updates)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, id)))
      .returning();

    if (updatedServer.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update server' 
      }, { status: 500 });
    }

    return NextResponse.json(updatedServer[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id, serverId } = await context.params;
    
    // Validate serverId
    if (!serverId || !isValidUUID(serverId)) {
      return NextResponse.json({ 
        error: "Valid server ID is required",
        code: "INVALID_SERVER_ID" 
      }, { status: 400 });
    }

    // Validate projectId
    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ 
        error: "Valid project ID is required",
        code: "INVALID_PROJECT_ID" 
      }, { status: 400 });
    }

    // Check if server exists and belongs to project
    const existingServer = await db.select()
      .from(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, id)))
      .limit(1);

    if (existingServer.length === 0) {
      return NextResponse.json({ 
        error: 'Server not found' 
      }, { status: 404 });
    }

    // Delete server
    const deleted = await db.delete(mcpServers)
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete server' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Server deleted successfully",
      id: serverId
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}