"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectSidebar } from '@/components/projects/project-sidebar'
import { createClient } from '@/lib/supabase/client'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string>('')
  const [projectName, setProjectName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(p => setProjectId(p.projectId))
  }, [params])

  useEffect(() => {
    if (!projectId) return

    const checkAuth = async () => {
      try {
        const supabase = createClient()

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          router.push('/login')
          return
        }

        // Fetch project details
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .single()

        if (projectError || !project) {
          router.push('/dashboard')
          return
        }

        setProjectName(project.name)
      } catch (error) {
        console.error('Layout auth error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [projectId, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <ProjectSidebar projectId={projectId} projectName={projectName} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}