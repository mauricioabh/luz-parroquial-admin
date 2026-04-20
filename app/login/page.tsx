'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithMagicLink, signInWithPassword } from '@/lib/supabase/auth'
import { supabase } from '@/lib/supabase/client'
import { bootstrapSession, getRedirectPath } from '@/lib/supabase/session'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { translateError } from '@/lib/errors'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const registered = searchParams.get('registered')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [usePassword, setUsePassword] = useState(true) // Default to password login

  useEffect(() => {
    // Store redirect in sessionStorage so auth callback can use it
    if (redirectTo) {
      sessionStorage.setItem('redirectAfterLogin', redirectTo)
    }

    // Check initial session and bootstrap
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          return
        }
        
        if (session) {
          try {
            const bootstrap = await bootstrapSession()
            const storedRedirect = sessionStorage.getItem('redirectAfterLogin')
            router.push(getRedirectPath(bootstrap.role, storedRedirect || undefined))
            sessionStorage.removeItem('redirectAfterLogin')
          } catch (bootstrapError: any) {
            // Profile missing or bootstrap failed - stay on login page
          }
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.error?.message || 'Unknown error'
        if (!errorMessage.includes('Profile not found') && !errorMessage.includes('recursion')) {
          console.error('Session check error:', errorMessage)
        }
      }
    }

    checkSession()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          const bootstrap = await bootstrapSession()
          const storedRedirect = sessionStorage.getItem('redirectAfterLogin')
          router.push(getRedirectPath(bootstrap.role, storedRedirect || undefined))
          sessionStorage.removeItem('redirectAfterLogin')
        } catch (error: any) {
          const errorMessage = error?.message || error?.error?.message || 'Error al cargar el perfil'
          console.error('Bootstrap error:', errorMessage)
          setError(errorMessage)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, redirectTo])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (usePassword) {
        await signInWithPassword(email, password)
        // Password login succeeds immediately - bootstrapSession will handle redirect
      } else {
        await signInWithMagicLink(email)
        setEmailSent(true)
      }
    } catch (err: any) {
      const context = usePassword 
        ? { action: 'sign in', resource: 'account' }
        : { action: 'send sign-in link', resource: 'sign-in link' }
      setError(translateError(err, context))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-[var(--primary)] rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <CardTitle className="text-2xl">Bienvenido a Luz Parroquial</CardTitle>
          <CardDescription className="text-base">
            Tu centro de gestión de la comunidad parroquial
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registered === 'true' && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              <p className="font-medium">¡Bienvenido! Tu parroquia ha sido registrada.</p>
              <p className="mt-1">Por favor inicia sesión con tu correo electrónico para comenzar.</p>
            </div>
          )}
          {emailSent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Por favor revisa tu correo electrónico</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  Hemos enviado un enlace de inicio de sesión a <strong>{email}</strong>
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Haz clic en el enlace de tu correo electrónico para continuar. El enlace permanecerá válido por una hora.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
                className="w-full"
              >
                Usar un correo diferente
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[var(--foreground)]">
                  Dirección de correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              {usePassword && (
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-[var(--foreground)]">
                    Contraseña
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading 
                  ? (usePassword ? 'Iniciando sesión...' : 'Enviando...') 
                  : (usePassword ? 'Iniciar sesión' : 'Enviar enlace de inicio de sesión')
                }
              </Button>

              <div className="flex items-center justify-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUsePassword(!usePassword)
                    setPassword('')
                    setError(null)
                  }}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  {usePassword 
                    ? 'Usar enlace de correo en su lugar' 
                    : 'Usar contraseña en su lugar'
                  }
                </button>
              </div>

              {!usePassword && (
                <p className="text-xs text-center text-[var(--muted-foreground)] pt-2">
                  Te enviaremos un enlace seguro de inicio de sesión por correo electrónico para acceder a tu cuenta.
                </p>
              )}
            </form>
          )}

          {!emailSent && (
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <p className="text-sm text-center text-[var(--muted-foreground)] mb-3">
                ¿Nuevo en Luz Parroquial?
              </p>
              <Button
                variant="outline"
                onClick={() => router.push('/register-parish')}
                className="w-full"
              >
                Registra Tu Parroquia
              </Button>
              <p className="text-xs text-center text-[var(--muted-foreground)] mt-2">
                Configúrate en menos de 30 minutos
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Cargando...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
