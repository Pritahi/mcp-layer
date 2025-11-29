import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
async function performMCPHandshake(baseUrl: string, authToken: string | null): Promise<any> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Only add Authorization header if token is provided
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${baseUrl}/list_tools`, {
      method: 'POST',
      headers
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

    return NextResponse.json(server, { status: 200 });

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

    const supabase = await createClient();

    // Parse request body
    const body = await request.json();
    const { name, baseUrl, authToken, isActive } = body;

    // Check if server exists and belongs to project
    const { data: currentServer, error: fetchError } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('id', serverId)
      .eq('project_id', id)
      .single();

    if (fetchError || !currentServer) {
      return NextResponse.json({ 
        error: 'Server not found' 
      }, { status: 404 });
    }

    // Prepare update object
    const updates: any = {
      updated_at: new Date().toISOString()
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
      updates.is_active = isActive;
    }

    // Check if baseUrl or authToken is being updated
    const needsHandshake = baseUrl !== undefined || authToken !== undefined;
    const finalBaseUrl = baseUrl !== undefined ? baseUrl : currentServer.base_url;
    const finalAuthToken = authToken !== undefined ? authToken : currentServer.auth_token;

    if (baseUrl !== undefined) {
      if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
        return NextResponse.json({ 
          error: "Base URL must be a non-empty string",
          code: "INVALID_BASE_URL" 
        }, { status: 400 });
      }
      updates.base_url = baseUrl.trim();
    }

    if (authToken !== undefined) {
      // Allow null or empty string for optional authentication
      if (authToken !== null && typeof authToken === 'string') {
        updates.auth_token = authToken.trim() || null;
      } else if (authToken === null || authToken === '') {
        updates.auth_token = null;
      } else {
        return NextResponse.json({ 
          error: "Auth token must be a string or null",
          code: "INVALID_AUTH_TOKEN" 
        }, { status: 400 });
      }
    }

    // Perform MCP handshake if baseUrl or authToken changed
    if (needsHandshake) {
      try {
        const toolsResponse = await performMCPHandshake(finalBaseUrl, finalAuthToken);
        updates.cached_tools = toolsResponse;
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
    const { data: updatedServer, error: updateError } = await supabase
      .from('mcp_servers')
      .update(updates)
      .eq('id', serverId)
      .eq('project_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update server' 
      }, { status: 500 });
    }

    return NextResponse.json(updatedServer, { status: 200 });

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

    const supabase = await createClient();

    // Check if server exists and belongs to project
    const { data: existingServer, error: fetchError } = await supabase
      .from('mcp_servers')
      .select('id')
      .eq('id', serverId)
      .eq('project_id', id)
      .single();

    if (fetchError || !existingServer) {
      return NextResponse.json({ 
        error: 'Server not found' 
      }, { status: 404 });
    }

    // Delete server
    const { error: deleteError } = await supabase
      .from('mcp_servers')
      .delete()
      .eq('id', serverId)
      .eq('project_id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
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