'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface EditProjectFormProps {
  project: {
    id: string
    name: string
  }
  userId: string
}

export function EditProjectForm({ project, userId }: EditProjectFormProps) {
  const [name, setName] = useState(project.name)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Project name is required')
      return
    }

    if (name.trim() === project.name) {
      toast.info('No changes detected')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/projects/${project.id}?userId=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update project')
      }

      toast.success('Project updated successfully')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="projectName" className="text-zinc-400">
          Project Name
        </Label>
        <Input
          id="projectName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-zinc-800 bg-zinc-950 text-zinc-50"
          disabled={loading}
        />
      </div>
      <Button
        type="submit"
        disabled={loading || name.trim() === project.name}
        className="bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
