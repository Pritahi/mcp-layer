import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Server, Key } from 'lucide-react'
import Link from 'next/link'
import { ServersTab } from '@/components/projects/servers-tab'
import { ApiKeysTab } from '@/components/projects/api-keys-tab'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch project details
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/projects/${id}?userId=${user.id}`,
    {
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    redirect('/projects')
  }

  const { project, servers } = await response.json()

  // Fetch API keys
  const keysResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/projects/${id}/keys`,
    {
      cache: 'no-store',
    }
  )

  const apiKeys = keysResponse.ok ? await keysResponse.json() : []

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button
              variant="outline"
              size="icon"
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-zinc-50">{project.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage MCP servers and API keys
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
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
              <div className="text-3xl font-bold text-zinc-50">{apiKeys.length}</div>
              <p className="text-xs text-zinc-500 mt-1">
                {apiKeys.filter((k: any) => k.isActive).length} active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="connections" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger
              value="connections"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-50"
            >
              <Server className="mr-2 h-4 w-4" />
              Connections
            </TabsTrigger>
            <TabsTrigger
              value="access"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-50"
            >
              <Key className="mr-2 h-4 w-4" />
              Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections">
            <ServersTab projectId={id} initialServers={servers} />
          </TabsContent>

          <TabsContent value="access">
            <ApiKeysTab projectId={id} userId={user.id} initialKeys={apiKeys} servers={servers} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
