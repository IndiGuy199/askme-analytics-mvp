'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getRedirectUrl } from '@/lib/auth-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, ArrowRight, Sparkles, BarChart3, Users, Zap, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setError('')

    // 📊 Track pre-auth anonymous ID for session merging
    if (typeof window !== 'undefined' && window.AMA?.preAuthMark) {
      window.AMA.preAuthMark()
    }

    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectUrl()
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setIsSuccess(true)
    }

    setIsLoading(false)
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-8 mobile-safe-area">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  We've sent you a magic link to sign in to your account. Click the link to get started instantly.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 font-medium">
                    💡 Tip: Check your spam folder if you don't see it in a few minutes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col mobile-safe-area">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative">
        <div className="w-full max-w-md space-y-8">
          {/* Back to Home Link */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>

          {/* Logo/Brand */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AskMe Analytics
                </h1>
                <p className="text-sm text-gray-500 -mt-1">AI-Powered Insights</p>
              </div>
            </div>
            <p className="text-gray-600 text-lg">
              Transform your data into actionable insights
            </p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl text-center text-gray-900">Welcome back</CardTitle>
              <CardDescription className="text-center text-base">
                Enter your email to receive a secure magic link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 text-base border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      {error}
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-12 text-base bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-200 ph-track-auth-login"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                      Sending magic link...
                    </>
                  ) : (
                    <>
                      Send magic link
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Don't have an account? <span className="font-medium text-indigo-600">The magic link will create one for you.</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features preview */}
          <div className="text-center space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Trusted by growing teams worldwide
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col items-center gap-2 p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/60">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">AI Insights</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/60">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Team Collaboration</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/60">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Real-time Data</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center py-6 px-4">
        <p className="text-xs text-gray-400">
          Secure authentication powered by Supabase • Privacy-first analytics
        </p>
      </div>
    </div>
  )
}
