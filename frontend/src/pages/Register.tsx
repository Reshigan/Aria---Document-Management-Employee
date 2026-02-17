import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { UserPlus } from 'lucide-react'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const register = useAuthStore((state) => state.register)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await register(formData)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full mb-4">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create Account</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Get started with ARIA ERP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name
            </label>
            <input
              id="company_name"
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 dark:bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:text-blue-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
