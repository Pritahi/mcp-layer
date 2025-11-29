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
  created_at: string
  user_id: string
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

  // Fetch projects directly from Supabase
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (projectsError) {
    console.error('Error fetching projects:', projectsError)
  }

  const projectsList: Project[] = projects || []
  const serverCounts: Record<string, number> = {}
  const keyCounts: Record<string, number> = {}

  // Fetch counts for each project
  if (projectsList.length > 0) {
    await Promise.all(projectsList.map(async (project) => {
      // Fetch server count
      const { data: servers } = await supabase
        .from('mcp_servers')
        .select('id')
        .eq('project_id', project.id)
      
      serverCounts[project.id] = servers?.length || 0

      // Fetch keys count
      const { data: keys } = await supabase
        .from('api_keys')
        .select('id')
        .eq('project_id', project.id)
      
      keyCounts[project.id] = keys?.length || 0
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
        {projectsList.length === 0 ? (
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
            {projectsList.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                createdAt={project.created_at}
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