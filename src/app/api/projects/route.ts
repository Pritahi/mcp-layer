import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Utility function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, userId } = body;

    // Validate name
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { 
          error: 'Name is required and must be a string',
          code: 'MISSING_NAME'
        },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { 
          error: 'Name cannot be empty',
          code: 'EMPTY_NAME'
        },
        { status: 400 }
      );
    }

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { 
          error: 'User ID is required and must be a string',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { 
          error: 'User ID must be a valid UUID',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Create new project
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: trimmedName,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create project: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newProject, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Validate userId
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { 
          error: 'User ID must be a valid UUID',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    // Parse pagination parameters
    const limit = Math.min(parseInt(limitParam ?? '10'), 100);
    const offset = parseInt(offsetParam ?? '0');

    // Create Supabase client
    const supabase = await createClient();

    // Fetch projects filtered by userId
    const { data: projectsList, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase select error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(projectsList || [], { status: 200 });

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