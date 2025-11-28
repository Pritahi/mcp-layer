import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteProjectButton } from '@/components/projects/delete-project-button'
import { EditProjectForm } from '@/components/projects/edit-project-form'

interface SettingsPageProps {
  params: { projectId: string }
}

export default async function SettingsPage({ params }: SettingsPageProps) {
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

  // Fetch project details
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/projects/${projectId}?userId=${user.id}`,
    { cache: 'no-store' }
  )

  if (!response.ok) {
    redirect('/dashboard')
  }

  const data = await response.json()
  const project = data.project

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-50">Project Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage project configuration and danger zone
        </p>
      </div>

      {/* General Settings */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">General</CardTitle>
          <CardDescription className="text-zinc-400">
            Update project details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditProjectForm project={project} userId={user.id} />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900/50 bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
          <CardDescription className="text-zinc-400">
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-red-900/50 bg-red-950/20">
            <div>
              <h3 className="text-sm font-medium text-zinc-50">Delete Project</h3>
              <p className="text-xs text-zinc-400 mt-1">
                This will permanently delete the project, all servers, API keys, and audit logs.
              </p>
            </div>
            <DeleteProjectButton projectId={projectId} projectName={project.name} userId={user.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
