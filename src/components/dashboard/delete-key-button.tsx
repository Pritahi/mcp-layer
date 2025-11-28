'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteApiKey } from '@/app/actions/keys'
import { Trash2 } from 'lucide-react'
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

export function DeleteKeyButton({ id, label }: { id: number; label: string }) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleDelete() {
    setIsLoading(true)
    const result = await deleteApiKey(String(id))
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('API key deleted successfully')
    }
    
    setIsLoading(false)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-zinc-800 bg-zinc-900 text-zinc-50">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-50">Delete API Key</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            Are you sure you want to delete <span className="font-semibold text-zinc-200">{label}</span>? 
            This action cannot be undone and will immediately revoke access.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-zinc-700 bg-zinc-800 text-zinc-50 hover:bg-zinc-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}