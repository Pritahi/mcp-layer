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
      // Check if error is due to email not confirmed
      if (error.message.includes('Email not confirmed')) {
        return { error: 'Please verify your email first. Check your inbox for the confirmation link.' }
      }
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
    }
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

  // If user is created successfully
  if (data.user) {
    // If we have a session, user is auto-confirmed and logged in
    if (data.session) {
      redirect('/dashboard')
    }
    
    // If no session but user exists, email confirmation is required
    // This is SUCCESS - just needs email verification
    return { 
      success: true, 
      message: 'Account created! Please check your email and click the confirmation link to sign in.' 
    }
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