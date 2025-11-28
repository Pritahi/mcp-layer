import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { apiKeys, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    // Step 1: Fetch API key by id
    const apiKey = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    // Step 2: If not found, return 404
    if (apiKey.length === 0) {
      return NextResponse.json(
        { 
          error: 'API key not found',
          code: 'KEY_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Step 3: Fetch project using key's projectId
    const project = await db.select()
      .from(projects)
      .where(eq(projects.id, apiKey[0].projectId))
      .limit(1);

    // Step 4 & 5: Verify project.userId matches provided userId
    if (project.length === 0 || project[0].userId !== userId) {
      return NextResponse.json(
        { 
          error: 'API key not found',
          code: 'UNAUTHORIZED' 
        },
        { status: 404 }
      );
    }

    // Step 6: Proceed with deletion
    const deleted = await db.delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning();

    if (deleted.length === 0) {
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
        id: deleted[0].id
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