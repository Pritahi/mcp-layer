'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Server, Trash2 } from 'lucide-react'
import { AddServerDialog } from './add-server-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface McpServer {
  id: string
  name: string
  baseUrl: string
  isActive: boolean
  cachedTools: any
  createdAt: string
}

interface ServersTabProps {
  projectId: string
  initialServers: McpServer[]
}

export function ServersTab({ projectId, initialServers }: ServersTabProps) {
  const [servers, setServers] = useState<McpServer[]>(initialServers)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this server?')) {
      return
    }

    setDeletingId(serverId)

    try {
      const response = await fetch(`/api/projects/${projectId}/servers/${serverId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete server')
      }

      toast.success('Server deleted successfully')
      setServers(servers.filter(s => s.id !== serverId))
      router.refresh()
    } catch (error) {
      console.error('Error deleting server:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete server')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-zinc-50">MCP Servers</CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              Add MCP servers to this project. Each server will be validated via handshake.
            </CardDescription>
          </div>
          <AddServerDialog projectId={projectId} onServerAdded={(server) => {
            setServers([...servers, server])
            router.refresh()
          }} />
        </div>
      </CardHeader>
      <CardContent>
        {servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Server className="h-12 w-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">
              No MCP servers yet
            </h3>
            <p className="text-sm text-zinc-500 mb-4 max-w-md">
              Add your first MCP server. The name must match the service name used by AI (e.g., 'github', 'slack').
            </p>
            <AddServerDialog projectId={projectId} onServerAdded={(server) => {
              setServers([server])
              router.refresh()
            }} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Base URL</TableHead>
                <TableHead className="text-zinc-400">Tools</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id} className="border-zinc-800">
                  <TableCell className="font-medium text-zinc-50">
                    {server.name}
                  </TableCell>
                  <TableCell className="text-zinc-400 font-mono text-sm max-w-xs truncate">
                    {server.baseUrl}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {server.cachedTools ? (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        {Array.isArray(server.cachedTools) 
                          ? server.cachedTools.length 
                          : Object.keys(server.cachedTools).length} tools
                      </Badge>
                    ) : (
                      <span className="text-zinc-600">No tools</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={server.isActive ? 'default' : 'secondary'}
                      className={
                        server.isActive
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }
                    >
                      {server.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(server.id)}
                      disabled={deletingId === server.id}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
