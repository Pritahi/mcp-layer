'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(provider: 'github' | 'google' | 'email', email?: string, password?: string) {
  const supabase = await createClient()

  if (provider === 'email' && email && password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    redirect('/dashboard')
  } else {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (data.url) {
      redirect(data.url)
    }
  }
}

export async function signUp(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Check if email already exists
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { 
      error: 'An account with this email already exists. Please sign in instead.' 
    }
  }

  // If email confirmation is disabled, user is automatically signed in
  if (data.session) {
    redirect('/dashboard')
  }

  return { 
    success: true, 
    message: 'Account created successfully!' 
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}