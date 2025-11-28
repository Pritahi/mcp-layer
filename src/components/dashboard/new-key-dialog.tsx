'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createApiKey } from '@/app/actions/keys'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export function NewKeyDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await createApiKey(formData)

    if (result.error) {
      toast.error(result.error)
    } else if (result.success && result.key) {
      setGeneratedKey(result.key)
      toast.success('API key created successfully!')
      // Reset form
      ;(e.target as HTMLFormElement).reset()
    }

    setIsLoading(false)
  }

  function handleCopyKey() {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey)
      toast.success('API key copied to clipboard!')
    }
  }

  function handleClose() {
    setOpen(false)
    setGeneratedKey(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
          <Plus className="mr-2 h-4 w-4" />
          New Key
        </Button>
      </DialogTrigger>
      <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-50 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">Create New API Key</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {generatedKey ? 'Your API key has been created. Copy it now - you won\'t be able to see it again.' : 'Configure your new API key settings.'}
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <Label className="mb-2 block text-xs text-zinc-400">Your API Key</Label>
              <code className="break-all text-sm text-zinc-50">{generatedKey}</code>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleCopyKey}
                className="flex-1 bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
              >
                Copy Key
              </Button>
              <Button 
                onClick={handleClose}
                variant="outline"
                className="flex-1 border-zinc-700 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label" className="text-zinc-200">Label</Label>
              <Input
                id="label"
                name="label"
                placeholder="e.g., Production API"
                required
                className="border-zinc-700 bg-zinc-800 text-zinc-50 placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_url" className="text-zinc-200">Target URL</Label>
              <Input
                id="target_url"
                name="target_url"
                type="url"
                placeholder="https://api.example.com"
                required
                className="border-zinc-700 bg-zinc-800 text-zinc-50 placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="real_auth_token" className="text-zinc-200">Real Auth Token</Label>
              <Input
                id="real_auth_token"
                name="real_auth_token"
                type="password"
                placeholder="Enter the actual authentication token"
                required
                className="border-zinc-700 bg-zinc-800 text-zinc-50 placeholder:text-zinc-500"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1 bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
              >
                {isLoading ? 'Creating...' : 'Create Key'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 border-zinc-700 bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
