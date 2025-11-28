import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddServerDialog } from '@/components/projects/add-server-dialog'
import { ServerCard } from '@/components/projects/server-card'
import { Server as ServerIcon } from 'lucide-react'

interface ConnectionsPageProps {
  params: { projectId: string }
}

export default async function ConnectionsPage({ params }: ConnectionsPageProps) {
  const supabase = await createClient()
  const { projectId } = await params

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch servers
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${projectId}/servers?userId=${user.id}`,
    { cache: 'no-store' }
  )

  if (!response.ok) {
    redirect('/dashboard')
  }

  const servers = await response.json()

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50">MCP Server Connections</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage MCP servers and their cached tools
          </p>
        </div>
        <AddServerDialog projectId={projectId} userId={user.id} />
      </div>

      {/* Servers List */}
      {servers.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ServerIcon className="h-12 w-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">
              No MCP servers connected
            </h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-md">
              Add your first MCP server connection. We'll perform a handshake to fetch available tools.
            </p>
            <AddServerDialog projectId={projectId} userId={user.id} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {servers.map((server: any) => (
            <ServerCard
              key={server.id}
              server={server}
              projectId={projectId}
              userId={user.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
