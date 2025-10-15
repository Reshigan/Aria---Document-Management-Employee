import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    
    if (token) {
      // Redirect to dashboard if logged in
      router.push('/dashboard')
    } else {
      // Redirect to login if not logged in
      router.push('/login')
    }
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}