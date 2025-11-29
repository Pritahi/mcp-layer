import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    // Required userId for authorization
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId is required for authorization',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    // Pagination parameters
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '50'),
      200
    );
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Optional filter parameters
    const status = searchParams.get('status');
    const serverName = searchParams.get('serverName');
    const toolName = searchParams.get('toolName');

    const supabase = await createClient();

    // Verify project exists and belongs to userId
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    if (project.user_id !== userId) {
      return NextResponse.json(
        { 
          error: 'Unauthorized access to project',
          code: 'UNAUTHORIZED'
        },
        { status: 404 }
      );
    }

    // Build query with filters
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (serverName) {
      query = query.eq('server_name', serverName);
    }

    if (toolName) {
      query = query.eq('tool_name', toolName);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Fetch audit logs error:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }

    return NextResponse.json(logs || [], { status: 200 });

  } catch (error) {
    console.error('GET audit logs error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}