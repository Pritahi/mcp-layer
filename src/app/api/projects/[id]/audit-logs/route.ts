import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs, projects } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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

    // Verify project exists and belongs to userId
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    if (project[0].userId !== userId) {
      return NextResponse.json(
        { 
          error: 'Unauthorized access to project',
          code: 'UNAUTHORIZED'
        },
        { status: 404 }
      );
    }

    // Build dynamic query with filters
    const conditions = [eq(auditLogs.projectId, id)];

    if (status) {
      conditions.push(eq(auditLogs.status, status));
    }

    if (serverName) {
      conditions.push(eq(auditLogs.serverName, serverName));
    }

    if (toolName) {
      conditions.push(eq(auditLogs.toolName, toolName));
    }

    // Execute query with all filters
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(logs, { status: 200 });

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