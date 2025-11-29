import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Server, Key, Activity, CheckCircle } from 'lucide-react'

interface ProjectOverviewProps {
  params: Promise<{ projectId: string }>
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
    console.error('Auth error on project page:', userError)
    redirect('/login')
  }

  console.log('User authenticated, fetching project:', projectId, 'for user:', user.id)

  // Fetch project directly from Supabase instead of API
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    console.error('Project fetch error:', projectError)
    redirect('/dashboard')
  }

  // Fetch servers directly from Supabase
  const { data: servers } = await supabase
    .from('mcp_servers')
    .select('*')
    .eq('project_id', projectId)

  const serversList = servers || []

  // Fetch API keys directly from Supabase
  const { data: keys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('project_id', projectId)

  const keysList = keys || []

  // Fetch audit logs count directly from Supabase
  const { count: logsCount } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

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
            <div className="text-3xl font-bold text-zinc-50">{serversList.length}</div>
            <p className="text-xs text-zinc-500 mt-1">
              {serversList.filter((s: any) => s.is_active).length} active
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
            <div className="text-3xl font-bold text-zinc-50">{keysList.length}</div>
            <p className="text-xs text-zinc-500 mt-1">
              {keysList.filter((k: any) => k.is_active).length} active
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
              {logsCount?.toLocaleString() || '0'}
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
            {serversList.length === 0 ? (
              <p className="text-sm text-zinc-500">No servers connected yet</p>
            ) : (
              <div className="space-y-2">
                {serversList.map((server: any) => (
                  <div
                    key={server.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-50">{server.name}</p>
                      <p className="text-xs text-zinc-500">{server.base_url}</p>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {server.cached_tools?.length || 0} tools
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
              {logsCount === 0 ? 'No activity yet' : `${logsCount} total requests`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}