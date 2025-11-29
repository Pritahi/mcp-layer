'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProject(name: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  if (!name || !name.trim()) {
    return { error: 'Project name is required' }
  }

  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: name.trim(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true, project: newProject }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
