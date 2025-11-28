import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { apiKeys, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

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

    // Verify project exists
    const projectExists = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectExists.length === 0) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { label, allowedTools, blacklistWords } = body;

    // Validate required fields
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return NextResponse.json(
        { error: 'Label is required and must be a non-empty string', code: 'INVALID_LABEL' },
        { status: 400 }
      );
    }

    // Validate optional array fields
    if (allowedTools !== undefined && !Array.isArray(allowedTools)) {
      return NextResponse.json(
        { error: 'allowedTools must be an array', code: 'INVALID_ALLOWED_TOOLS' },
        { status: 400 }
      );
    }

    if (blacklistWords !== undefined && !Array.isArray(blacklistWords)) {
      return NextResponse.json(
        { error: 'blacklistWords must be an array', code: 'INVALID_BLACKLIST_WORDS' },
        { status: 400 }
      );
    }

    // Generate unique API key string
    const keyString = `sk_live_${randomBytes(16).toString('hex')}`;

    // Create new API key
    const newApiKey = await db
      .insert(apiKeys)
      .values({
        projectId,
        keyString,
        label: label.trim(),
        allowedTools: allowedTools || null,
        blacklistWords: blacklistWords || null,
        isActive: true,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newApiKey[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
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
    const { searchParams } = new URL(request.url);

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', code: 'MISSING_PROJECT_ID' },
        { status: 400 }
      );
    }

    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Fetch API keys for the project
    const keys = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.projectId, projectId))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(keys, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}