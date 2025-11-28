import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // Create new project
    const newProject = await db.insert(projects)
      .values({
        userId: userId,
        name: trimmedName,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newProject[0], { status: 201 });

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

    // Fetch projects filtered by userId
    const projectsList = await db.select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(projectsList, { status: 200 });

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