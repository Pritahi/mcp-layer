'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createApiKey } from '@/app/actions/keys'
import { Plus, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

export function NewKeyDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createApiKey(formData)
      
      if (result?.error) {
        toast.error(result.error)
      } else if (result?.key) {
        setGeneratedKey(result.key)
        toast.success('API key created successfully!')
      }
    })
  }

  const handleCopy = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Key copied to clipboard!')
    }
  }

  const handleClose = () => {
    setOpen(false)
    setGeneratedKey(null)
    setCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
          <Plus className="mr-2 h-4 w-4" />
          New Key
        </Button>
      </DialogTrigger>
      <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {generatedKey
              ? 'Your API key has been generated. Copy it now, you won\'t be able to see it again.'
              : 'Enter the details for your new API key.'}
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedKey}
                  readOnly
                  className="border-zinc-800 bg-zinc-900 font-mono text-sm"
                />
                <Button
                  onClick={handleCopy}
                  size="icon"
                  variant="outline"
                  className="border-zinc-800 hover:bg-zinc-800"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                name="label"
                placeholder="My API Key"
                required
                className="border-zinc-800 bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_url">Target URL</Label>
              <Input
                id="target_url"
                name="target_url"
                placeholder="https://api.example.com"
                type="url"
                required
                className="border-zinc-800 bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="real_auth_token">Real Auth Token</Label>
              <Input
                id="real_auth_token"
                name="real_auth_token"
                placeholder="Bearer token or API key"
                required
                className="border-zinc-800 bg-zinc-900"
              />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
            >
              {isPending ? 'Creating...' : 'Create API Key'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
