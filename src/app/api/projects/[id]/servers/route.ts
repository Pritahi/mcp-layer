import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mcpServers, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', code: 'MISSING_PROJECT_ID' },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (existingProject.length === 0) {
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

    if (!authToken || typeof authToken !== 'string' || authToken.trim().length === 0) {
      return NextResponse.json(
        { error: 'Auth token is required', code: 'INVALID_AUTH_TOKEN' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedBaseUrl = baseUrl.trim();
    const sanitizedAuthToken = authToken.trim();

    // CRITICAL: Perform MCP handshake - call list_tools endpoint
    let cachedTools: any = null;
    try {
      const handshakeResponse = await fetch(sanitizedBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sanitizedAuthToken}`,
        },
        body: JSON.stringify({
          method: 'list_tools',
          params: {},
        }),
      });

      if (!handshakeResponse.ok) {
        const errorText = await handshakeResponse.text().catch(() => 'Unknown error');
        
        if (handshakeResponse.status === 401) {
          return NextResponse.json(
            { 
              error: 'MCP handshake failed: Invalid authentication token', 
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
            details: errorText
          },
          { status: 400 }
        );
      }

      const handshakeData = await handshakeResponse.json();
      
      // Extract tools array from response
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
    const newServer = await db
      .insert(mcpServers)
      .values({
        projectId,
        name: sanitizedName,
        baseUrl: sanitizedBaseUrl,
        authToken: sanitizedAuthToken,
        cachedTools: cachedTools,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newServer[0], { status: 201 });

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
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', code: 'MISSING_PROJECT_ID' },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (existingProject.length === 0) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const servers = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.projectId, projectId))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(servers, { status: 200 });

  } catch (error: any) {
    console.error('GET MCP servers error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}