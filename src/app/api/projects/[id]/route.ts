import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, mcpServers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId is required for authorization',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    // Validate id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json(
        { 
          error: 'Valid project ID (UUID) is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Fetch project by id
    const projectResult = await db.select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    // Check if project exists
    if (projectResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const project = projectResult[0];

    // Verify userId matches
    if (project.userId !== userId) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'UNAUTHORIZED_ACCESS'
        },
        { status: 404 }
      );
    }

    // Fetch all MCP servers for this project
    const servers = await db.select()
      .from(mcpServers)
      .where(eq(mcpServers.projectId, id));

    return NextResponse.json({
      project,
      servers
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId is required for authorization',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    // Validate id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json(
        { 
          error: 'Valid project ID (UUID) is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name } = body;

    // Validate name is provided
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Name is required and must be a non-empty string',
          code: 'INVALID_NAME'
        },
        { status: 400 }
      );
    }

    // Fetch project by id
    const projectResult = await db.select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    // Check if project exists
    if (projectResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const project = projectResult[0];

    // Verify userId matches
    if (project.userId !== userId) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'UNAUTHORIZED_ACCESS'
        },
        { status: 404 }
      );
    }

    // Update project name
    const updatedProject = await db.update(projects)
      .set({ name: name.trim() })
      .where(eq(projects.id, id))
      .returning();

    if (updatedProject.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update project',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedProject[0], { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId is required for authorization',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    // Validate id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json(
        { 
          error: 'Valid project ID (UUID) is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Fetch project to verify it exists and userId matches
    const projectResult = await db.select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    // Check if project exists
    if (projectResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const project = projectResult[0];

    // Verify userId matches
    if (project.userId !== userId) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'UNAUTHORIZED_ACCESS'
        },
        { status: 404 }
      );
    }

    // Delete project (cascade will handle related records)
    const deleted = await db.delete(projects)
      .where(eq(projects.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to delete project',
          code: 'DELETE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Project deleted successfully',
      id
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}