import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Play } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Input, Card, CardContent } from '@/components/common'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signInDemo } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    setLoading(true)

    const { error } = await signIn(data.email, data.password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  const handleDemoLogin = () => {
    signInDemo()
    navigate('/')
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
          Welcome back
        </h2>

        {/* Demo Login Button */}
        <button
          onClick={handleDemoLogin}
          className="w-full mb-6 p-4 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors"
        >
          <Play className="h-5 w-5" />
          Try demo (no account needed)
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-primary font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
