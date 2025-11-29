import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required', code: 'MISSING_PROJECT_ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify project exists
    const { data: projectExists, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectExists) {
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
    const { data: newApiKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        project_id: projectId,
        key_string: keyString,
        label: label.trim(),
        allowed_tools: allowedTools || null,
        blacklist_words: blacklistWords || null,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    return NextResponse.json(newApiKey, { status: 201 });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
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

    const supabase = await createClient();

    // Fetch API keys for the project
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('project_id', projectId)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Fetch keys error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json(keys || [], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}