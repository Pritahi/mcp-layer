import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Server, Key, Activity, CheckCircle } from 'lucide-react'

interface ProjectOverviewProps {
  params: { projectId: string }
}

export default async function ProjectOverviewPage({ params }: ProjectOverviewProps) {
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

  // Fetch project details
  const projectResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${projectId}?userId=${user.id}`,
    { cache: 'no-store' }
  )

  if (!projectResponse.ok) {
    redirect('/dashboard')
  }

  const projectData = await projectResponse.json()
  const servers = projectData.servers || []

  // Fetch API keys
  const keysResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${projectId}/keys?userId=${user.id}`,
    { cache: 'no-store' }
  )

  const keys = keysResponse.ok ? await keysResponse.json() : []

  // Fetch audit logs count
  const logsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${projectId}/audit-logs?userId=${user.id}&limit=1`,
    { cache: 'no-store' }
  )

  const logsData = logsResponse.ok ? await logsResponse.json() : { total: 0 }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-50">Overview</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Project statistics and quick access
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              MCP Servers
            </CardTitle>
            <Server className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-50">{servers.length}</div>
            <p className="text-xs text-zinc-500 mt-1">
              {servers.filter((s: any) => s.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              API Keys
            </CardTitle>
            <Key className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-50">{keys.length}</div>
            <p className="text-xs text-zinc-500 mt-1">
              {keys.filter((k: any) => k.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-50">
              {logsData.total?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-zinc-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Status
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-50">Active</div>
            <p className="text-xs text-zinc-500 mt-1">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-50">Connected Servers</CardTitle>
          </CardHeader>
          <CardContent>
            {servers.length === 0 ? (
              <p className="text-sm text-zinc-500">No servers connected yet</p>
            ) : (
              <div className="space-y-2">
                {servers.map((server: any) => (
                  <div
                    key={server.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-50">{server.name}</p>
                      <p className="text-xs text-zinc-500">{server.baseUrl}</p>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {server.cachedTools?.length || 0} tools
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-50">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              {logsData.total === 0 ? 'No activity yet' : `${logsData.total} total requests`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
