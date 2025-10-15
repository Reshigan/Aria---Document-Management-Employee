import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"
import AppLayout from "../components/layout/AppLayout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card"

const Dashboard = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalDocuments: 0,
    recentUploads: 0,
    processingQueue: 0,
    storageUsed: "0 MB"
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")
    
    if (!token) {
      router.push("/login")
      return
    }

    if (userData) {
      setUser(JSON.parse(userData))
    }

    fetchDashboardData()
  }, [router, mounted])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token")
      
      // Fetch documents for stats
      const documentsResponse = await axios.get("/api/documents/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const documents = Array.isArray(documentsResponse.data) ? documentsResponse.data : []
      
      setStats({
        totalDocuments: documents.length,
        recentUploads: documents.filter(doc => {
          const uploadDate = new Date(doc.created_at)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return uploadDate > weekAgo
        }).length,
        processingQueue: Math.floor(Math.random() * 5),
        storageUsed: `${(documents.length * 2.5).toFixed(1)} MB`
      })

      // Mock recent activity
      setRecentActivity([
        { id: 1, action: "Document uploaded", file: "Invoice_2024.pdf", time: "2 minutes ago", type: "upload" },
        { id: 2, action: "OCR processing completed", file: "Contract_ABC.pdf", time: "15 minutes ago", type: "process" },
        { id: 3, action: "Document shared", file: "Report_Q4.xlsx", time: "1 hour ago", type: "share" },
        { id: 4, action: "User login", file: "System", time: "2 hours ago", type: "login" },
        { id: 5, action: "Document deleted", file: "Old_file.txt", time: "3 hours ago", type: "delete" }
      ])

      setLoading(false)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setLoading(false)
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case "upload":
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        )
      case "process":
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        )
      case "share":
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </div>
        )
      case "login":
        return (
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        )
    }
  }

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto"
          >
            {/* Welcome Header */}
            <div className="mb-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent mb-2">
                  Welcome back, {user?.username || "User"}!
                </h1>
                <p className="text-slate-600 text-lg">Here\u0027s what\u0027s happening with your documents today.</p>
              </motion.div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                {
                  title: "Total Documents",
                  value: stats.totalDocuments,
                  icon: "📄",
                  color: "from-blue-500 to-blue-600",
                  bgColor: "bg-blue-50",
                  change: "+12%"
                },
                {
                  title: "Recent Uploads",
                  value: stats.recentUploads,
                  icon: "📤",
                  color: "from-green-500 to-green-600",
                  bgColor: "bg-green-50",
                  change: "+8%"
                },
                {
                  title: "Processing Queue",
                  value: stats.processingQueue,
                  icon: "⚡",
                  color: "from-yellow-500 to-orange-500",
                  bgColor: "bg-yellow-50",
                  change: "-3%"
                },
                {
                  title: "Storage Used",
                  value: stats.storageUsed,
                  icon: "💾",
                  color: "from-purple-500 to-purple-600",
                  bgColor: "bg-purple-50",
                  change: "+15%"
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Card className={`${stat.bgColor} border-0 shadow-lg hover:shadow-xl transition-all duration-300`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                          <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                          <p className="text-sm text-green-600 font-medium mt-1">{stat.change} from last week</p>
                        </div>
                        <div className={`text-4xl bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                          {stat.icon}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="lg:col-span-2"
              >
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-slate-800 flex items-center">
                      <span className="mr-3">📊</span>
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Latest actions and updates in your system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <AnimatePresence>
                        {recentActivity.map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                            className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                          >
                            {getActivityIcon(activity.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {activity.action}
                              </p>
                              <p className="text-sm text-slate-500 truncate">{activity.file}</p>
                            </div>
                            <div className="text-xs text-slate-400">{activity.time}</div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center">
                      <span className="mr-3">⚡</span>
                      Quick Actions
                    </CardTitle>
                    <CardDescription>Frequently used features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        title: "Upload Documents",
                        description: "Add new files to your library",
                        icon: "📤",
                        color: "from-blue-500 to-blue-600",
                        href: "/documents"
                      },
                      {
                        title: "View Reports",
                        description: "Analytics and insights",
                        icon: "📈",
                        color: "from-green-500 to-green-600",
                        href: "/reports"
                      },
                      {
                        title: "Settings",
                        description: "Configure your account",
                        icon: "⚙️",
                        color: "from-purple-500 to-purple-600",
                        href: "/settings"
                      }
                    ].map((action, index) => (
                      <motion.button
                        key={action.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push(action.href)}
                        className="w-full p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 transition-all duration-200 text-left group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`text-2xl bg-gradient-to-r ${action.color} bg-clip-text text-transparent`}>
                            {action.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800 group-hover:text-slate-900">
                              {action.title}
                            </h3>
                            <p className="text-sm text-slate-600">{action.description}</p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* System Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="mt-8"
            >
              <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <h3 className="font-semibold text-slate-800">System Status: All Systems Operational</h3>
                        <p className="text-sm text-slate-600">Last updated: {new Date().toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-2xl">✅</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  )
}

export default Dashboard
