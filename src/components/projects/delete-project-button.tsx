'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

interface DeleteProjectButtonProps {
  projectId: string
  projectName: string
  userId: string
}

export function DeleteProjectButton({ projectId, projectName, userId }: DeleteProjectButtonProps) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (confirmText !== projectName) {
      toast.error('Project name does not match')
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(`/api/projects/${projectId}?userId=${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete project')
      }

      toast.success('Project deleted successfully')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project')
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="border-red-900/50 text-red-400 hover:bg-red-950/20 hover:text-red-400"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Project
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-zinc-800 bg-zinc-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-50">Delete Project</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            This action cannot be undone. This will permanently delete the project,
            all MCP server connections, API keys, and audit logs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="confirmName" className="text-zinc-400">
            Type <span className="font-mono text-zinc-50">{projectName}</span> to confirm
          </Label>
          <Input
            id="confirmName"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-2 border-zinc-800 bg-zinc-950 text-zinc-50"
            disabled={deleting}
            placeholder={projectName}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
            disabled={deleting}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting || confirmText !== projectName}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {deleting ? 'Deleting...' : 'Delete Project'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
