import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FolderOpen, LogOut } from 'lucide-react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'

interface Project {
  id: string
  name: string
  createdAt: string
}

export default async function ProjectsPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch projects from the new API
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/projects?userId=${user.id}`,
    {
      cache: 'no-store',
    }
  )

  const projects: Project[] = response.ok ? await response.json() : []

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-50">Projects</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Organize your MCP servers into projects
            </p>
          </div>
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

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-16 w-16 text-zinc-700 mb-4" />
              <h3 className="text-xl font-semibold text-zinc-400 mb-2">
                No projects yet
              </h3>
              <p className="text-sm text-zinc-500 mb-6 max-w-md">
                Create your first project to organize MCP servers and manage API keys
              </p>
              <NewProjectDialog userId={user.id} />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-end">
              <NewProjectDialog userId={user.id} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="border-zinc-800 bg-zinc-900 hover:bg-zinc-850 transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <FolderOpen className="h-8 w-8 text-zinc-400 mb-2" />
                      </div>
                      <CardTitle className="text-zinc-50 text-xl">{project.name}</CardTitle>
                      <CardDescription className="text-zinc-500">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
