import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { apiKeys, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteContext {
  params: Promise<{ id: string; keyId: string; }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, keyId } = await context.params;
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
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format', code: 'INVALID_PROJECT_ID' },
        { status: 400 }
      );
    }

    // Validate key ID is valid UUID
    if (!UUID_REGEX.test(keyId)) {
      return NextResponse.json(
        { error: 'Invalid API key ID format', code: 'INVALID_KEY_ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { label, allowedTools, blacklistWords, isActive } = body;

    // Validate field types if provided
    if (label !== undefined) {
      if (typeof label !== 'string' || label.trim() === '') {
        return NextResponse.json(
          { error: 'Label must be a non-empty string', code: 'INVALID_LABEL' },
          { status: 400 }
        );
      }
    }

    if (allowedTools !== undefined) {
      if (!Array.isArray(allowedTools)) {
        return NextResponse.json(
          { error: 'Allowed tools must be an array', code: 'INVALID_ALLOWED_TOOLS' },
          { status: 400 }
        );
      }
    }

    if (blacklistWords !== undefined) {
      if (!Array.isArray(blacklistWords)) {
        return NextResponse.json(
          { error: 'Blacklist words must be an array', code: 'INVALID_BLACKLIST_WORDS' },
          { status: 400 }
        );
      }
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json(
          { error: 'Is active must be a boolean', code: 'INVALID_IS_ACTIVE' },
          { status: 400 }
        );
      }
    }

    // Fetch the API key
    const existingKey = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, id)))
      .limit(1);

    if (existingKey.length === 0) {
      return NextResponse.json(
        { error: 'API key not found', code: 'KEY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch the project to verify userId
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (project.length === 0 || project[0].userId !== userId) {
      return NextResponse.json(
        { error: 'API key not found', code: 'KEY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Build updates object with only provided fields
    const updates: {
      label?: string;
      allowedTools?: string[];
      blacklistWords?: string[];
      isActive?: boolean;
    } = {};

    if (label !== undefined) {
      updates.label = label.trim();
    }

    if (allowedTools !== undefined) {
      updates.allowedTools = allowedTools;
    }

    if (blacklistWords !== undefined) {
      updates.blacklistWords = blacklistWords;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    // Update the API key
    const updatedKey = await db
      .update(apiKeys)
      .set(updates)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, id)))
      .returning();

    return NextResponse.json(updatedKey[0], { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}