import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProjectSidebar } from '@/components/projects/project-sidebar'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: { projectId: string }
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const supabase = await createClient()
  const { projectId } = await params

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch project details to verify ownership and get name
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${projectId}?userId=${user.id}`,
    { cache: 'no-store' }
  )

  if (!response.ok) {
    redirect('/dashboard')
  }

  const data = await response.json()

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <ProjectSidebar projectId={projectId} projectName={data.project.name} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
