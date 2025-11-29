import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = await createClient();

    // Fetch the API key
    const { data: existingKey, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .eq('project_id', id)
      .single();

    if (keyError || !existingKey) {
      return NextResponse.json(
        { error: 'API key not found', code: 'KEY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch the project to verify userId
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', id)
      .single();

    if (projectError || !project || project.user_id !== userId) {
      return NextResponse.json(
        { error: 'API key not found', code: 'KEY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Build updates object with only provided fields
    const updates: {
      label?: string;
      allowed_tools?: string[];
      blacklist_words?: string[];
      is_active?: boolean;
    } = {};

    if (label !== undefined) {
      updates.label = label.trim();
    }

    if (allowedTools !== undefined) {
      updates.allowed_tools = allowedTools;
    }

    if (blacklistWords !== undefined) {
      updates.blacklist_words = blacklistWords;
    }

    if (isActive !== undefined) {
      updates.is_active = isActive;
    }

    // Update the API key
    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', keyId)
      .eq('project_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update API key' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedKey, { status: 200 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}