'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { login, signUp } from '@/app/actions/auth'
import { Github, Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')

  const handleGitHubLogin = async () => {
    await login('github')
  }

  const handleGoogleLogin = async () => {
    await login('google')
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await login('email', signInEmail, signInPassword)
      if (result?.error) {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signUp(signUpEmail, signUpPassword)
      if (result?.error) {
        toast.error(result.error)
      } else if (result?.success) {
        toast.success(result.message || 'Account created successfully!')
        setSignUpEmail('')
        setSignUpPassword('')
      }
    } catch (error) {
      toast.error('Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-3xl font-bold text-zinc-50">
            MCP Guard Login
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Sign in to manage your API keys and proxy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
              <TabsTrigger value="signin" className="data-[state=active]:bg-zinc-800">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-zinc-800">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-4">
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-zinc-200">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800 text-zinc-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-zinc-200">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800 text-zinc-50"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In with Email'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-950 px-2 text-zinc-500">Or continue with</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleGitHubLogin}
                  className="w-full bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                  type="button"
                >
                  <Github className="mr-2 h-5 w-5" />
                  Sign in with GitHub
                </Button>
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                  type="button"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Sign in with Google
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-zinc-200">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800 text-zinc-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-zinc-200">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-zinc-900 border-zinc-800 text-zinc-50"
                  />
                  <p className="text-xs text-zinc-500">Minimum 6 characters</p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Sign Up with Email'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-950 px-2 text-zinc-500">Or continue with</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleGitHubLogin}
                  className="w-full bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                  type="button"
                >
                  <Github className="mr-2 h-5 w-5" />
                  Sign up with GitHub
                </Button>
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full bg-zinc-800 text-zinc-50 hover:bg-zinc-700"
                  type="button"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Sign up with Google
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}