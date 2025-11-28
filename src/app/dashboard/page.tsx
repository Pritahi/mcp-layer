import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { ProjectCard } from '@/components/projects/project-card'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut, FolderPlus } from 'lucide-react'

interface Project {
  id: string
  name: string
  createdAt: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch projects
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/projects?userId=${user.id}`, {
    cache: 'no-store'
  })
  
  let projects: Project[] = []
  let serverCounts: Record<string, number> = {}
  let keyCounts: Record<string, number> = {}

  if (response.ok) {
    projects = await response.json()
    
    // Fetch counts for each project
    await Promise.all(projects.map(async (project) => {
      const detailsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${project.id}?userId=${user.id}`,
        { cache: 'no-store' }
      )
      if (detailsResponse.ok) {
        const data = await detailsResponse.json()
        serverCounts[project.id] = data.servers?.length || 0
      }

      const keysResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${project.id}/keys?userId=${user.id}`,
        { cache: 'no-store' }
      )
      if (keysResponse.ok) {
        const keys = await keysResponse.json()
        keyCounts[project.id] = keys.length || 0
      }
    }))
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-50">Projects</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage your MCP Guard projects and configurations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CreateProjectDialog userId={user.id} />
            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 mb-6">
              <FolderPlus className="h-10 w-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-400 mb-2">
              No projects yet
            </h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-md">
              Get started by creating your first project. Projects help you organize MCP servers and API keys.
            </p>
            <CreateProjectDialog userId={user.id} />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                createdAt={project.createdAt}
                serverCount={serverCounts[project.id]}
                keyCount={keyCounts[project.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}