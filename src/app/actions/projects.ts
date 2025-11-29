'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProject(name: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('User error:', userError)
    redirect('/login')
  }

  if (!name || !name.trim()) {
    return { error: 'Project name is required' }
  }

  console.log('Creating project for user:', user.id, 'with name:', name.trim())

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
    console.error('Project creation error:', error)
    return { error: error.message }
  }

  console.log('Project created successfully:', newProject)

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