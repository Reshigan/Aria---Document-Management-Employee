import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import axios from 'axios'
import Button from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'

const LoginPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/enterprise-dashboard')
    }
  }, [router])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        username: formData.username,
        password: formData.password
      })

      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token)
        localStorage.setItem('user', JSON.stringify({
          username: formData.username,
          role: 'Administrator'
        }))
        
        // Redirect to dashboard
        router.push('/enterprise-dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(
        error.response?.data?.detail || 
        'Login failed. Please check your credentials and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ open }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
      )}
    </svg>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <span className="text-white font-bold text-2xl">A</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to ARIA</h1>
          <p className="text-gray-600">Enterprise Document Management System</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  placeholder="Enter your username"
                />
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            {/* Demo credentials */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
            >
              <p className="text-sm text-blue-800 font-medium mb-2">Demo Credentials:</p>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Username:</strong> admin</p>
                <p><strong>Password:</strong> admin123</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ username: 'admin', password: 'admin123' })}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Fill demo credentials
              </button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-8 text-sm text-gray-500"
        >
          <p>© 2024 ARIA Document Management. All rights reserved.</p>
          <p className="mt-1">Powered by VantaX Technology</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default LoginPage