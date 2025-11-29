import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Validate id is valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json(
        { 
          error: 'Valid API key ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Step 1: Fetch API key by id
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('id, project_id')
      .eq('id', id)
      .single();

    // Step 2: If not found, return 404
    if (keyError || !apiKey) {
      return NextResponse.json(
        { 
          error: 'API key not found',
          code: 'KEY_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Step 3: Fetch project using key's projectId
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', apiKey.project_id)
      .single();

    // Step 4 & 5: Verify project.userId matches provided userId
    if (projectError || !project || project.user_id !== userId) {
      return NextResponse.json(
        { 
          error: 'API key not found',
          code: 'UNAUTHORIZED' 
        },
        { status: 404 }
      );
    }

    // Step 6: Proceed with deletion
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { 
          error: 'Failed to delete API key',
          code: 'DELETE_FAILED' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'API key deleted successfully',
        id
      },
      { status: 200 }
    );

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