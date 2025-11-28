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
import { Key, Trash2, Copy, Check } from 'lucide-react'
import { CreateApiKeyDialog } from './create-api-key-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ApiKey {
  id: string
  keyString: string
  label: string
  allowedTools: string[] | null
  blacklistWords: string[] | null
  isActive: boolean
  createdAt: string
}

interface ApiKeysTabProps {
  projectId: string
  userId: string
  initialKeys: ApiKey[]
  servers: any[]
}

export function ApiKeysTab({ projectId, userId, initialKeys, servers }: ApiKeysTabProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const router = useRouter()

  const maskKey = (key: string) => {
    if (key.length <= 15) return key
    return `${key.substring(0, 15)}${'•'.repeat(20)}`
  }

  const handleCopy = async (keyString: string, id: string) => {
    try {
      await navigator.clipboard.writeText(keyString)
      setCopiedId(id)
      toast.success('API key copied to clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error('Failed to copy API key')
    }
  }

  const handleDelete = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return
    }

    setDeletingId(keyId)

    try {
      const response = await fetch(`/api/keys/${keyId}?userId=${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete API key')
      }

      toast.success('API key deleted successfully')
      setKeys(keys.filter(k => k.id !== keyId))
      router.refresh()
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete API key')
    } finally {
      setDeletingId(null)
    }
  }

  // Extract all tools from all servers
  const allTools = servers.flatMap(server => {
    if (!server.cachedTools) return []
    if (Array.isArray(server.cachedTools)) {
      return server.cachedTools.map((tool: any) => tool.name || tool)
    }
    if (server.cachedTools.tools && Array.isArray(server.cachedTools.tools)) {
      return server.cachedTools.tools.map((tool: any) => tool.name || tool)
    }
    return []
  })

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-zinc-50">API Keys</CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              Create proxy API keys with granular tool permissions
            </CardDescription>
          </div>
          <CreateApiKeyDialog 
            projectId={projectId} 
            availableTools={allTools}
            onKeyCreated={(key) => {
              setKeys([...keys, key])
              router.refresh()
            }} 
          />
        </div>
      </CardHeader>
      <CardContent>
        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Key className="h-12 w-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">
              No API keys yet
            </h3>
            <p className="text-sm text-zinc-500 mb-4 max-w-md">
              {servers.length === 0 
                ? 'Add MCP servers first, then create API keys to access them'
                : 'Create your first API key to start using your MCP servers'}
            </p>
            {servers.length > 0 && (
              <CreateApiKeyDialog 
                projectId={projectId} 
                availableTools={allTools}
                onKeyCreated={(key) => {
                  setKeys([key])
                  router.refresh()
                }} 
              />
            )}
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
              {keys.map((key) => (
                <TableRow key={key.id} className="border-zinc-800">
                  <TableCell className="font-medium text-zinc-50">
                    {key.label}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      {maskKey(key.keyString)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(key.keyString, key.id)}
                      >
                        {copiedId === key.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {key.allowedTools && key.allowedTools.length > 0 ? (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        {key.allowedTools.length} tools
                      </Badge>
                    ) : (
                      <span className="text-zinc-600">All tools</span>
                    )}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(key.id)}
                      disabled={deletingId === key.id}
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
