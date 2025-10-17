import React from 'react'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  User,
  Search,
  Bell,
  Menu,
  X,
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import useAuthStore from '@/store/auth'
import { cn, getInitials } from '@/lib/utils'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const navigation = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'documents', name: 'Documents', icon: FileText },
  { id: 'ai-chat', name: 'AI Assistant', icon: Bot },
  { id: 'settings', name: 'Settings', icon: Settings },
]

export default function Sidebar({ activeTab, onTabChange, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuthStore()

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-white border-r border-gray-200 flex flex-col h-full shadow-sm"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <motion.div
            initial={false}
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center space-x-3"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <h1 className="text-xl font-bold gradient-text">Aria</h1>
            )}
          </motion.div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            
            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-blue-700" : "text-gray-400")} />
                <motion.span
                  initial={false}
                  animate={{ 
                    opacity: isCollapsed ? 0 : 1,
                    width: isCollapsed ? 0 : "auto"
                  }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {item.name}
                </motion.span>
              </motion.button>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {user ? getInitials(user.name) : 'U'}
            </AvatarFallback>
          </Avatar>
          
          <motion.div
            initial={false}
            animate={{ 
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : "auto"
            }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </motion.div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8 text-gray-400 hover:text-red-600"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}