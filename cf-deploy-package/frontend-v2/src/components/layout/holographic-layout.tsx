'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  DollarSign, 
  ShoppingCart, 
  Truck, 
  Users, 
  Factory,
  BarChart3, 
  Settings, 
  Bot, 
  MessageSquare, 
  FileText, 
  CreditCard, 
  Landmark, 
  Wallet, 
  Package, 
  Warehouse,
  ClipboardList, 
  UserCog, 
  CalendarDays, 
  Shield, 
  Receipt, 
  ArrowLeftRight,
  BookOpen, 
  PieChart, 
  Briefcase, 
  HardHat, 
  Wrench,
  X,
  Search,
  Bell,
  HelpCircle,
  User,
  Menu,
  Grid,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AvatarFloatingButton } from '@/components/erp/avatar-bot'

interface Module {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  description: string
  position: { x: number; y: number; z: number }
  size: number
  connections: string[]
}

interface ViewportState {
  zoom: number
  rotation: { x: number; y: number }
  position: { x: number; y: number }
  activeModule: string | null
}

export function HolographicLayout({ children }: { children: React.ReactNode }) {
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    rotation: { x: 0, y: 0 },
    position: { x: 0, y: 0 },
    activeModule: null
  })
  
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState(3)
  const containerRef = useRef<HTMLDivElement>(null)

  // Revolutionary 3D module structure
  const modules: Module[] = [
    {
      id: 'dashboard',
      name: 'Executive Dashboard',
      icon: <LayoutDashboard className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-500',
      description: 'Central command center with real-time KPIs',
      position: { x: 0, y: 0, z: 0 },
      size: 120,
      connections: ['finance', 'sales', 'operations']
    },
    {
      id: 'finance',
      name: 'Finance Hub',
      icon: <Landmark className="h-6 w-6" />,
      color: 'from-emerald-500 to-teal-500',
      description: 'Complete financial management ecosystem',
      position: { x: -200, y: -100, z: -50 },
      size: 100,
      connections: ['dashboard', 'sales', 'procurement']
    },
    {
      id: 'sales',
      name: 'Sales Operations',
      icon: <ShoppingCart className="h-6 w-6" />,
      color: 'from-purple-500 to-fuchsia-500',
      description: 'Customer relationships and revenue generation',
      position: { x: 200, y: -100, z: -50 },
      size: 100,
      connections: ['dashboard', 'finance', 'operations']
    },
    {
      id: 'procurement',
      name: 'Procurement Network',
      icon: <Briefcase className="h-6 w-6" />,
      color: 'from-amber-500 to-orange-500',
      description: 'Supply chain and vendor management',
      position: { x: -200, y: 100, z: -50 },
      size: 100,
      connections: ['finance', 'operations']
    },
    {
      id: 'operations',
      name: 'Operations Center',
      icon: <Factory className="h-6 w-6" />,
      color: 'from-rose-500 to-pink-500',
      description: 'Manufacturing and inventory operations',
      position: { x: 200, y: 100, z: -50 },
      size: 100,
      connections: ['sales', 'procurement', 'people']
    },
    {
      id: 'people',
      name: 'People Dynamics',
      icon: <Users className="h-6 w-6" />,
      color: 'from-indigo-500 to-blue-500',
      description: 'Human resources and workforce management',
      position: { x: 0, y: 200, z: -100 },
      size: 100,
      connections: ['operations', 'reports']
    },
    {
      id: 'reports',
      name: 'Analytics Studio',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'from-violet-500 to-purple-500',
      description: 'Business intelligence and reporting',
      position: { x: 0, y: -200, z: -100 },
      size: 100,
      connections: ['dashboard', 'people']
    },
    {
      id: 'admin',
      name: 'System Control',
      icon: <Settings className="h-6 w-6" />,
      color: 'from-slate-500 to-gray-500',
      description: 'Configuration and administration',
      position: { x: -300, y: 0, z: -150 },
      size: 80,
      connections: ['dashboard']
    },
    {
      id: 'bots',
      name: 'AI Orchestra',
      icon: <Bot className="h-6 w-6" />,
      color: 'from-cyan-500 to-blue-500',
      description: 'Intelligent automation agents',
      position: { x: 300, y: 0, z: -150 },
      size: 80,
      connections: ['dashboard', 'admin']
    }
  ]

  // Handle mouse movement for 3D effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const mouseX = e.clientX - rect.left - centerX
    const mouseY = e.clientY - rect.top - centerY
    
    // Subtle rotation based on mouse position
    setViewport(prev => ({
      ...prev,
      rotation: {
        x: mouseY * 0.05,
        y: mouseX * 0.05
      }
    }))
  }

  // Handle zoom with scroll
  const handleWheel = (e: React.WheelEvent) => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(2, prev.zoom - e.deltaY * 0.001))
    }))
  }

  // Navigation handler
  const navigateToModule = (moduleId: string) => {
    setViewport(prev => ({
      ...prev,
      activeModule: moduleId
    }))
    
    // In a real implementation, this would navigate to the actual route
    console.log(`Navigating to module: ${moduleId}`)
  }

  // Filter modules based on search
  const filteredModules = searchQuery 
    ? modules.filter(module => 
        module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : modules.slice(0, 5)

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background to-secondary/20">
      {/* Holographic Navigation Space */}
      <div 
        ref={containerRef}
        className="relative w-80 bg-gradient-to-b from-secondary/10 to-background border-r border-border overflow-hidden"
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      >
        {/* Ambient background particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, Math.random() * 100 - 50],
                opacity: [0.2, 0.8, 0.2]
              }}
              transition={{
                duration: 3 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        {/* 3D Module Visualization */}
        <div className="relative h-full flex items-center justify-center perspective-1000">
          <motion.div
            className="relative w-full h-3/4"
            style={{
              transform: `rotateX(${viewport.rotation.x}deg) rotateY(${viewport.rotation.y}deg) scale(${viewport.zoom})`,
              transformStyle: 'preserve-3d'
            }}
          >
            {modules.map((module) => {
              const isActive = viewport.activeModule === module.id
              const isConnected = viewport.activeModule 
                ? module.connections.includes(viewport.activeModule) || viewport.activeModule === module.id
                : false
              
              return (
                <motion.div
                  key={module.id}
                  className={cn(
                    'absolute cursor-pointer flex flex-col items-center justify-center rounded-2xl border backdrop-blur-sm transition-all duration-300',
                    isActive 
                      ? 'border-primary shadow-lg shadow-primary/25 z-10' 
                      : isConnected 
                        ? 'border-primary/50 z-5' 
                        : 'border-border/50 z-0'
                  )}
                  style={{
                    width: `${module.size}px`,
                    height: `${module.size}px`,
                    left: `calc(50% + ${module.position.x}px)`,
                    top: `calc(50% + ${module.position.y}px)`,
                    transform: `translate(-50%, -50%) translateZ(${module.position.z}px)`,
                    background: isActive 
                      ? `linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.1))` 
                      : `linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--background)))`
                  }}
                  whileHover={{ scale: 1.05, zIndex: 20 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateToModule(module.id)}
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${module.color} text-white mb-2`}>
                    {module.icon}
                  </div>
                  <h3 className="font-semibold text-sm text-center px-2 truncate w-full">
                    {module.name}
                  </h3>
                  <p className="text-xs text-muted-foreground text-center px-2 truncate w-full mt-1">
                    {module.description}
                  </p>
                  
                  {/* Connection lines */}
                  {isActive && module.connections.map(connId => {
                    const connectedModule = modules.find(m => m.id === connId)
                    if (!connectedModule) return null
                    
                    return (
                      <motion.div
                        key={connId}
                        className="absolute top-1/2 left-1/2 w-px bg-primary/30"
                        style={{
                          height: '100px',
                          transform: `rotate(${Math.atan2(
                            connectedModule.position.y - module.position.y,
                            connectedModule.position.x - module.position.x
                          )}rad) translateY(-50px)`,
                          transformOrigin: 'top center'
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )
                  })}
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* Quick Search and Controls */}
        <div className="absolute bottom-4 left-4 right-4">
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-2"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search modules, features, help..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {searchQuery && (
                  <div className="mt-2 bg-background/80 backdrop-blur rounded-lg border border-border max-h-40 overflow-y-auto">
                    {filteredModules.map(module => (
                      <Button
                        key={module.id}
                        variant="ghost"
                        className="w-full justify-start h-12"
                        onClick={() => {
                          navigateToModule(module.id)
                          setSearchOpen(false)
                          setSearchQuery('')
                        }}
                      >
                        <div className={`mr-3 p-1.5 rounded-md bg-gradient-to-br ${module.color}`}>
                          {module.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">{module.name}</p>
                          <p className="text-xs text-muted-foreground">{module.description}</p>
                        </div>
                      </Button>
                    ))}
                    {filteredModules.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground">
                        No modules found. Try a different search term.
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar - Minimalist */}
        <header className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ARIA ERP
              </h1>
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>Revolutionary Interface Active</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive text-[8px] text-white flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Revolutionary Avatar Bot */}
      <AvatarFloatingButton />
    </div>
  )
}