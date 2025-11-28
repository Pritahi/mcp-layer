'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface Server {
  id: string
  name: string
  cachedTools: any[]
}

interface CreateKeyDialogProps {
  projectId: string
  userId: string
  servers: Server[]
}

export function CreateKeyDialog({ projectId, userId, servers }: CreateKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [label, setLabel] = useState('')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [blacklistWords, setBlacklistWords] = useState('')
  const [generatedKey, setGeneratedKey] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  // Get all tools from all servers
  const allTools = servers.flatMap(server => 
    (server.cachedTools || []).map((tool: any) => ({
      name: tool.name || tool,
      serverName: server.name,
      description: tool.description || '',
    }))
  )

  const handleToggleTool = (toolName: string) => {
    setSelectedTools(prev => 
      prev.includes(toolName) 
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName]
    )
  }

  const handleSelectAll = () => {
    if (selectedTools.length === allTools.length) {
      setSelectedTools([])
    } else {
      setSelectedTools(allTools.map(t => t.name))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!label.trim()) {
      toast.error('Label is required')
      return
    }

    if (selectedTools.length === 0) {
      toast.error('Please select at least one tool')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/projects/${projectId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          allowedTools: selectedTools,
          blacklistWords: blacklistWords.split(',').map(w => w.trim()).filter(Boolean),
          userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key')
      }

      setGeneratedKey(data.keyString)
      setStep('success')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedKey)
    setCopied(true)
    toast.success('API key copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(() => {
      setStep('form')
      setLabel('')
      setSelectedTools([])
      setBlacklistWords('')
      setGeneratedKey('')
      setCopied(false)
    }, 200)
  }

  // Group tools by server
  const toolsByServer = servers.map(server => ({
    serverName: server.name,
    tools: allTools.filter(t => t.serverName === server.name),
  })).filter(s => s.tools.length > 0)

  if (step === 'success') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">API Key Created</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Save this key now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <code className="flex-1 text-sm text-zinc-50 font-mono break-all">
                {generatedKey}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="shrink-0 text-zinc-400 hover:text-zinc-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleClose}
              className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="border-zinc-800 bg-zinc-900 max-w-2xl max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Create API Key</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure granular permissions for this API key.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="label" className="text-zinc-400">
                Label
              </Label>
              <Input
                id="label"
                placeholder="Production Key"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-50"
                disabled={loading}
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400">Allowed Tools</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs text-zinc-400 hover:text-zinc-50"
                >
                  {selectedTools.length === allTools.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              {allTools.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center border border-dashed border-zinc-800 rounded-lg">
                  No tools available. Add MCP server connections first.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-4 border border-zinc-800 rounded-lg p-4">
                  {toolsByServer.map(({ serverName, tools }) => (
                    <div key={serverName} className="space-y-2">
                      <div className="text-sm font-medium text-zinc-300">
                        {serverName}
                      </div>
                      {tools.map((tool) => (
                        <div key={tool.name} className="flex items-start space-x-2 pl-4">
                          <Checkbox
                            id={tool.name}
                            checked={selectedTools.includes(tool.name)}
                            onCheckedChange={() => handleToggleTool(tool.name)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={tool.name}
                              className="text-sm font-medium leading-none text-zinc-400 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {tool.name}
                            </label>
                            {tool.description && (
                              <p className="text-xs text-zinc-600 mt-0.5">
                                {tool.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="blacklist" className="text-zinc-400">
                Blacklist Words <span className="text-zinc-600">(comma-separated, optional)</span>
              </Label>
              <Input
                id="blacklist"
                placeholder="secret, password, token"
                value={blacklistWords}
                onChange={(e) => setBlacklistWords(e.target.value)}
                className="border-zinc-800 bg-zinc-950 text-zinc-50"
                disabled={loading}
              />
              <p className="text-xs text-zinc-600">
                Block requests containing these words
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
              disabled={loading || allTools.length === 0}
              className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
            >
              {loading ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
