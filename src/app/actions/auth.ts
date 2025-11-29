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

  // Sign up with explicit option to skip email confirmation
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined,
      // This tells Supabase client to not expect email confirmation
      data: {
        email_confirmed: true
      }
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

  // Check if user is created and email is confirmed
  if (data.user) {
    // If email is NOT confirmed, it means Supabase requires confirmation in settings
    if (!data.user.email_confirmed_at && data.session === null) {
      return { 
        error: 'Email confirmation is required. Please disable "Enable email confirmations" in your Supabase Dashboard (Authentication → Settings) to allow instant signup.' 
      }
    }

    // If we have a session, user is logged in automatically
    if (data.session) {
      redirect('/dashboard')
    }

    // Try to sign in if no session but user exists
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // If sign in fails due to confirmation, tell user
      if (signInError.message.includes('Email not confirmed')) {
        return { 
          error: 'Please verify your email first. Check your inbox for the confirmation link, or disable email confirmation in Supabase settings.' 
        }
      }
      return { 
        success: true, 
        message: 'Account created! Please sign in to continue.' 
      }
    }

    // Successfully signed in
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