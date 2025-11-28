'use client'

import { useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Loader2, AlertCircle, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CreateApiKeyDialogProps {
  projectId: string
  availableTools: string[]
  onKeyCreated: (key: any) => void
}

export function CreateApiKeyDialog({ projectId, availableTools, onKeyCreated }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [label, setLabel] = useState('')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [blacklistWords, setBlacklistWords] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleToolToggle = (tool: string) => {
    setSelectedTools(prev =>
      prev.includes(tool)
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!label.trim()) {
      toast.error('Label is required')
      return
    }

    setLoading(true)

    try {
      const blacklistArray = blacklistWords
        .split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0)

      const response = await fetch(`/api/projects/${projectId}/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: label.trim(),
          allowedTools: selectedTools.length > 0 ? selectedTools : null,
          blacklistWords: blacklistArray.length > 0 ? blacklistArray : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key')
      }

      setCreatedKey(data.keyString)
      onKeyCreated(data)
      toast.success('API key created successfully')
    } catch (error) {
      console.error('Error creating API key:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!createdKey) return
    
    try {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      toast.success('API key copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy API key')
    }
  }

  const handleClose = () => {
    setOpen(false)
    setLabel('')
    setSelectedTools([])
    setBlacklistWords('')
    setCreatedKey(null)
    setCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 max-w-2xl">
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-zinc-50">API Key Created</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Save this API key now. You won't be able to see it again.
              </DialogDescription>
            </DialogHeader>
            
            <Alert className="bg-green-500/10 border-green-500/50">
              <AlertCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400">
                <div className="font-mono text-sm break-all mb-2">{createdKey}</div>
                <Button
                  onClick={handleCopy}
                  size="sm"
                  variant="outline"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Key
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                onClick={handleClose}
                className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-zinc-50">Create API Key</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Create a proxy key with specific tool permissions
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="label" className="text-zinc-400">
                  Label <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="label"
                  placeholder="Production API Key"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                  disabled={loading}
                  required
                />
              </div>

              {availableTools.length > 0 && (
                <div className="grid gap-2">
                  <Label className="text-zinc-400">
                    Allowed Tools (optional)
                  </Label>
                  <p className="text-xs text-zinc-500 mb-2">
                    Select specific tools to allow. Leave empty to allow all tools.
                  </p>
                  <ScrollArea className="h-[200px] rounded-md border border-zinc-800 p-4">
                    <div className="space-y-3">
                      {availableTools.map((tool) => (
                        <div key={tool} className="flex items-center space-x-2">
                          <Checkbox
                            id={tool}
                            checked={selectedTools.includes(tool)}
                            onCheckedChange={() => handleToolToggle(tool)}
                            className="border-zinc-700"
                          />
                          <label
                            htmlFor={tool}
                            className="text-sm text-zinc-300 cursor-pointer"
                          >
                            {tool}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="blacklist" className="text-zinc-400">
                  Blacklist Words (optional)
                </Label>
                <Input
                  id="blacklist"
                  placeholder="word1, word2, word3"
                  value={blacklistWords}
                  onChange={(e) => setBlacklistWords(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                  disabled={loading}
                />
                <p className="text-xs text-zinc-500">
                  Comma-separated list of words to block in requests
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
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
                    Creating...
                  </>
                ) : (
                  'Create Key'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
