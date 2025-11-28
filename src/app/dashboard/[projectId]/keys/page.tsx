import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CreateKeyDialog } from '@/components/projects/create-key-dialog'
import { DeleteKeyButton } from '@/components/dashboard/delete-key-button'
import { Key } from 'lucide-react'

interface KeysPageProps {
  params: { projectId: string }
}

export default async function KeysPage({ params }: KeysPageProps) {
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

  // Fetch servers (for tool selection in create dialog)
  const serversResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${projectId}/servers?userId=${user.id}`,
    { cache: 'no-store' }
  )

  const servers = serversResponse.ok ? await serversResponse.json() : []

  // Fetch API keys
  const keysResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${projectId}/keys?userId=${user.id}`,
    { cache: 'no-store' }
  )

  if (!keysResponse.ok) {
    redirect('/dashboard')
  }

  const keys = await keysResponse.json()

  const maskKey = (key: string) => {
    if (key.length <= 12) return key
    return `${key.substring(0, 12)}${'•'.repeat(20)}`
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50">API Keys</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage API keys with granular tool permissions
          </p>
        </div>
        <CreateKeyDialog projectId={projectId} userId={user.id} servers={servers} />
      </div>

      {/* Keys Table */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Key className="h-12 w-12 text-zinc-700 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-400 mb-2">
                No API keys yet
              </h3>
              <p className="text-sm text-zinc-500 mb-6 max-w-md">
                Create your first API key to start using the MCP proxy.
              </p>
              <CreateKeyDialog projectId={projectId} userId={user.id} servers={servers} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Label</TableHead>
                  <TableHead className="text-zinc-400">Key</TableHead>
                  <TableHead className="text-zinc-400">Allowed Tools</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key: any) => (
                  <TableRow key={key.id} className="border-zinc-800">
                    <TableCell className="font-medium text-zinc-50">
                      {key.label}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-zinc-400">
                      {maskKey(key.keyString)}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      <span className="text-xs">
                        {key.allowedTools?.length || 0} tools
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={key.isActive ? 'default' : 'secondary'}
                        className={
                          key.isActive
                            ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                        }
                      >
                        {key.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteKeyButton id={key.id} label={key.label} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
