import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const supabase = await createClient();

    // Fetch project by id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    // Check if project exists
    if (projectError || !project) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Verify userId matches
    if (project.user_id !== userId) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'UNAUTHORIZED_ACCESS'
        },
        { status: 404 }
      );
    }

    // Fetch all MCP servers for this project
    const { data: servers } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('project_id', id);

    return NextResponse.json({
      project,
      servers: servers || []
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const supabase = await createClient();

    // Fetch project by id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    // Check if project exists
    if (projectError || !project) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Verify userId matches
    if (project.user_id !== userId) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'UNAUTHORIZED_ACCESS'
        },
        { status: 404 }
      );
    }

    // Update project name
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { 
          error: 'Failed to update project',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedProject, { status: 200 });

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const supabase = await createClient();

    // Fetch project to verify it exists and userId matches
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', id)
      .single();

    // Check if project exists
    if (projectError || !project) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Verify userId matches
    if (project.user_id !== userId) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'UNAUTHORIZED_ACCESS'
        },
        { status: 404 }
      );
    }

    // Delete project (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (deleteError) {
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