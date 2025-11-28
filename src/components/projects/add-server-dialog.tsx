'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AddServerDialogProps {
  projectId: string
  userId: string
}

export function AddServerDialog({ projectId, userId }: AddServerDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    authToken: '',
  })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!formData.name.trim() || !formData.baseUrl.trim() || !formData.authToken.trim()) {
      setError('All fields are required')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/projects/${projectId}/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          baseUrl: formData.baseUrl.trim(),
          authToken: formData.authToken.trim(),
          userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add server')
      }

      toast.success('MCP server added successfully', {
        description: `Found ${data.cachedTools?.length || 0} tools via handshake`,
      })
      setOpen(false)
      setFormData({ name: '', baseUrl: '', authToken: '' })
      router.refresh()
    } catch (error) {
      console.error('Error adding server:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add server'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
          <Plus className="mr-2 h-4 w-4" />
          Add Server
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Add MCP Server</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Connect an MCP server to this project. We'll perform a handshake to fetch available tools.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400 mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-zinc-400">
                Server Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder="github"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                disabled={loading}
                required
              />
              <p className="text-xs text-zinc-500">
                ⚠️ Must match the AI service name (e.g., 'github', 'slack', 'notion')
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="baseUrl" className="text-zinc-400">
                Base URL <span className="text-red-400">*</span>
              </Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder="https://mcp-server.example.com"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                disabled={loading}
                required
              />
              <p className="text-xs text-zinc-500">
                The endpoint where the MCP server is hosted
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="authToken" className="text-zinc-400">
                Auth Token <span className="text-red-400">*</span>
              </Label>
              <Input
                id="authToken"
                type="password"
                placeholder="Bearer token for authentication"
                value={formData.authToken}
                onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                disabled={loading}
                required
              />
              <p className="text-xs text-zinc-500">
                Authentication token for the MCP server
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating & Adding...
                </>
              ) : (
                'Add Server'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}