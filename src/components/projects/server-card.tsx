'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Server, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ServerCardProps {
  server: {
    id: string
    name: string
    baseUrl: string
    isActive: boolean
    cachedTools: any[]
  }
  projectId: string
  userId: string
}

export function ServerCard({ server, projectId, userId }: ServerCardProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/servers/${server.id}/refresh?userId=${userId}`,
        { method: 'POST' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh tools')
      }

      toast.success('Tools refreshed successfully', {
        description: `Found ${data.cachedTools?.length || 0} tools`,
      })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh tools')
    } finally {
      setRefreshing(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/servers/${server.id}?userId=${userId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete server')
      }

      toast.success('Server deleted successfully')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete server')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
              <Server className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <CardTitle className="text-zinc-50">{server.name}</CardTitle>
              <CardDescription className="text-zinc-500 text-xs mt-1">
                {server.baseUrl}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={server.isActive ? 'default' : 'secondary'}
            className={
              server.isActive
                ? 'bg-green-500/10 text-green-500'
                : 'bg-zinc-800 text-zinc-400'
            }
          >
            {server.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-zinc-500 mb-2">Cached Tools</p>
          <p className="text-sm font-medium text-zinc-400">
            {server.cachedTools?.length || 0} tools available
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Tools'}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={deleting}
                className="border-red-900/50 text-red-400 hover:bg-red-950/20 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-zinc-800 bg-zinc-900">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-zinc-50">Delete Server</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  Are you sure you want to delete "{server.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-500 text-white hover:bg-red-600"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
